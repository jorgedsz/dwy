const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function analyzeSession(sessionId) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { client: true },
  });

  if (!session || !session.transcription) return null;

  const previousSessions = await prisma.session.findMany({
    where: {
      clientId: session.clientId,
      id: { not: session.id },
      aiSummary: { not: null },
    },
    orderBy: { date: 'desc' },
    take: 5,
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

  const prompt = `You are an assistant that analyzes coaching/consulting session transcriptions.
Analyze this ${session.type === 'commercial_call' ? 'commercial call' : 'lesson'} for client "${session.client.name}".

Session title: "${session.title}"
Date: ${session.date.toISOString().split('T')[0]}
${contextBlock}

Current session transcription:
${session.transcription}

Respond in the SAME LANGUAGE as the transcription. Return JSON with:
- "summary": A concise summary of key points discussed, decisions made, and outcomes.
- "pendingItems": A bullet-point list of action items, follow-ups, or pending tasks identified.`;

  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0].message.content);

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      aiSummary: result.summary,
      pendingItems: result.pendingItems,
    },
  });

  return result;
}

module.exports = { analyzeSession };
