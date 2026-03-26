const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60000 });
}

// Truncate transcription to ~12000 chars (~3000 tokens) to avoid timeouts
function truncate(text, maxChars = 12000) {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '\n\n[... transcription truncated for analysis]';
}

async function analyzeSession(sessionId) {
  console.log(`[AI] Step 1: Fetching session ${sessionId}...`);

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { client: true },
  });

  if (!session || !session.transcription) return null;

  console.log(`[AI] Step 2: Session found. Client: "${session.client.name}", transcription length: ${session.transcription.length}`);

  const previousSessions = await prisma.session.findMany({
    where: {
      clientId: session.clientId,
      id: { not: session.id },
      aiSummary: { not: null },
    },
    orderBy: { date: 'desc' },
    take: 3,
    select: { title: true, date: true, type: true, aiSummary: true, pendingItems: true },
  });

  const contextBlock = previousSessions.length
    ? `\n\nPrevious sessions for context:\n${previousSessions
        .map(
          (s) =>
            `- ${s.title} (${s.type}, ${s.date.toISOString().split('T')[0]}): ${s.aiSummary}\n  Pending: ${s.pendingItems || 'None'}`
        )
        .join('\n')}`
    : '';

  const transcriptionText = truncate(session.transcription);

  const prompt = `You are an assistant that analyzes coaching/consulting session transcriptions.
Analyze this ${session.type === 'commercial_call' ? 'commercial call' : 'lesson'} for client "${session.client.name}".

Session title: "${session.title}"
Date: ${session.date.toISOString().split('T')[0]}
${contextBlock}

Current session transcription:
${transcriptionText}

Respond in the SAME LANGUAGE as the transcription. Return JSON with:
- "summary": A concise summary of key points discussed, decisions made, and outcomes.
- "pendingItems": A bullet-point list of action items, follow-ups, or pending tasks identified.`;

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  console.log(`[AI] Step 3: Calling OpenAI (prompt length: ${prompt.length} chars)...`);

  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  console.log(`[AI] Step 4: OpenAI responded. Parsing...`);

  const raw = response.choices[0].message.content;
  let result;
  try {
    result = JSON.parse(raw);
  } catch (parseErr) {
    console.error('[AI] Failed to parse OpenAI response:', raw);
    throw new Error('AI returned invalid JSON');
  }

  const summary = result.summary || '';
  const pendingItems = Array.isArray(result.pendingItems)
    ? result.pendingItems.join('\n')
    : result.pendingItems || '';

  console.log(`[AI] Step 5: Saving to DB...`);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      aiSummary: summary,
      pendingItems: pendingItems,
    },
  });

  // Parse pendingItems text into individual PendingTask rows
  console.log(`[AI] Step 6: Creating pending tasks...`);
  const taskLines = pendingItems
    .split('\n')
    .map(line => line.replace(/^[\s]*[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);

  if (taskLines.length > 0) {
    // Delete only uncompleted tasks (preserve completed ones)
    await prisma.pendingTask.deleteMany({
      where: { sessionId, completed: false },
    });

    await prisma.pendingTask.createMany({
      data: taskLines.map(text => ({ sessionId, text })),
    });
  }

  console.log(`[AI] Done! Session ${sessionId} analysis complete. ${taskLines.length} tasks created.`);
  return { summary, pendingItems };
}

async function analyzeClient(clientId) {
  console.log(`[AI] Client Analysis: Fetching sessions for client ${clientId}...`);

  const sessions = await prisma.session.findMany({
    where: {
      clientId: parseInt(clientId),
      aiSummary: { not: null },
    },
    orderBy: { date: 'asc' },
    select: { id: true, title: true, date: true, type: true, aiSummary: true, pendingItems: true },
  });

  if (sessions.length === 0) return null;

  const commercialCalls = sessions.filter((s) => s.type === 'commercial_call');
  const lessons = sessions.filter((s) => s.type === 'lesson');

  const formatSession = (s) =>
    `- "${s.title}" (${s.date.toISOString().split('T')[0]})\n  Summary: ${s.aiSummary}\n  Pending: ${s.pendingItems || 'None'}`;

  const prompt = `You are a senior coaching/consulting analyst. Analyze ALL sessions for this client and produce a holistic report.

COMMERCIAL CALLS (${commercialCalls.length}):
${commercialCalls.length > 0 ? commercialCalls.map(formatSession).join('\n') : 'None'}

LESSONS (${lessons.length}):
${lessons.length > 0 ? lessons.map(formatSession).join('\n') : 'None'}

Respond in the SAME LANGUAGE as the session summaries. Return JSON with exactly these 5 keys:
- "globalSummary": A comprehensive overview of the client's journey, key themes, and current state.
- "progressReport": What progress has been made across all lessons — skills developed, milestones reached, areas of growth.
- "deviationAnalysis": Compare what was discussed/promised in commercial calls vs what has actually been covered in lessons. Note any gaps or deviations.
- "allPendingItems": A consolidated bullet-point list of ALL unresolved action items across every session.
- "upsellOpportunities": Based on the client's needs and progress, suggest potential upsell opportunities or additional services that could benefit them.`;

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  console.log(`[AI] Client Analysis: Sending ${sessions.length} sessions to OpenAI...`);

  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content;
  let result;
  try {
    result = JSON.parse(raw);
  } catch (parseErr) {
    console.error('[AI] Client Analysis: Failed to parse response:', raw);
    throw new Error('AI returned invalid JSON');
  }

  console.log(`[AI] Client Analysis: Done for client ${clientId}.`);
  return result;
}

module.exports = { analyzeSession, analyzeClient };
