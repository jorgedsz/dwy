const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
    timeout: 30000,
  });

  console.log(`[AI] Step 4: OpenAI responded. Parsing...`);

  const result = JSON.parse(response.choices[0].message.content);

  console.log(`[AI] Step 5: Saving to DB...`);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      aiSummary: result.summary,
      pendingItems: result.pendingItems,
    },
  });

  console.log(`[AI] Done! Session ${sessionId} analysis complete.`);
  return result;
}

module.exports = { analyzeSession };
