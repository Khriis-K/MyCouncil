import { createReranker } from '../server/memory/reranker';
import { TransformersEmbedder } from '../server/memory/transformersEmbedder';

// Usage: npm run models:download [-- --bge]   (--bge also fetches bge-reranker-base, 283 MB, for the ablation)
const sentences = [
  'My lease ends in March.',
  'I am torn about moving to a new city.',
  'Pizza on Friday nights.',
];

async function smokeTestReranker(name: 'minilm' | 'bge-base') {
  const reranker = createReranker(name)!;
  const loadStart = performance.now();
  await reranker.score('warm up', ['warm up']);
  console.log(`Loaded ${reranker.id} in ${Math.round(performance.now() - loadStart)}ms`);

  const start = performance.now();
  const scores = await reranker.score('When does my lease end?', sentences);
  console.log(`Reranked ${scores.length} passages in ${Math.round(performance.now() - start)}ms: ${scores.map(s => s.toFixed(2)).join(', ')}`);
  if (scores.some(s => !Number.isFinite(s))) throw new Error(`${name} produced non-finite scores`);
  if (scores.indexOf(Math.max(...scores)) !== 0) throw new Error(`${name} did not rank the lease sentence first`);
}

try {
  const embedder = new TransformersEmbedder();
  const loadStart = performance.now();
  await embedder.embedPassages(['warm up']);
  console.log(`Loaded ${embedder.id} in ${Math.round(performance.now() - loadStart)}ms`);

  const start = performance.now();
  const vectors = await embedder.embedPassages(sentences);
  console.log(`Embedded ${vectors.length} sentences, dims=${vectors[0].length}, ${Math.round(performance.now() - start)}ms`);

  await smokeTestReranker('minilm');
  if (process.argv.includes('--bge')) await smokeTestReranker('bge-base');
} catch (error) {
  console.error('Model download/smoke test failed:', error);
  process.exit(1);
}
