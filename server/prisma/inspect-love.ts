import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.response.findUnique({
    where: { id: 21 },
    select: { id: true, answers: true, score: true, resultType: true, report: true },
  });
  console.log('score:', JSON.stringify((r as any).score, null, 2));
  const rep: any = (r as any).report;
  console.log('resultTitle:', rep?.resultTitle, '| triangle:', JSON.stringify(rep?.triangle));
  const answers: any = (r as any).answers;
  const tri = ['intimacy', 'passion', 'commitment'];
  const sums: Record<string, number> = {}; const counts: Record<string, number> = {};
  Object.keys(answers).forEach(id => {
    const dim = id.startsWith('love_i') ? 'intimacy' : id.startsWith('love_p') ? 'passion' : id.startsWith('love_c') ? 'commitment' : null;
    if (dim) { sums[dim] = (sums[dim] || 0) + Number(answers[id]); counts[dim] = (counts[dim] || 0) + 1; }
  });
  tri.forEach(d => console.log(d, 'sum=', sums[d], 'cnt=', counts[d], 'avg=', sums[d] / counts[d]));
}

main().finally(() => prisma.$disconnect());
