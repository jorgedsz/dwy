/**
 * One-time backfill script: parse existing session.pendingItems text into PendingTask rows.
 * Run after migration: node scripts/backfill-pending-tasks.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  const sessions = await prisma.session.findMany({
    where: { pendingItems: { not: null } },
    select: { id: true, pendingItems: true },
  });

  console.log(`Found ${sessions.length} sessions with pendingItems`);
  let totalTasks = 0;

  for (const session of sessions) {
    const lines = session.pendingItems
      .split('\n')
      .map(line => line.replace(/^[\s]*[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) continue;

    // Skip if tasks already exist for this session
    const existing = await prisma.pendingTask.count({ where: { sessionId: session.id } });
    if (existing > 0) {
      console.log(`  Session ${session.id}: skipped (${existing} tasks already exist)`);
      continue;
    }

    await prisma.pendingTask.createMany({
      data: lines.map(text => ({ sessionId: session.id, text })),
    });

    totalTasks += lines.length;
    console.log(`  Session ${session.id}: created ${lines.length} tasks`);
  }

  console.log(`\nDone! Created ${totalTasks} tasks total.`);
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
