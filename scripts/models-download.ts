import { TransformersEmbedder } from '../server/memory/transformersEmbedder';

const sentences = [
  'My lease ends in March.',
  'I am torn about moving to a new city.',
  'Pizza on Friday nights.',
];

try {
  const embedder = new TransformersEmbedder();
  const loadStart = performance.now();
  await embedder.embedPassages(['warm up']);
  console.log(`Loaded ${embedder.id} in ${Math.round(performance.now() - loadStart)}ms`);

  const start = performance.now();
  const vectors = await embedder.embedPassages(sentences);
  console.log(`Embedded ${vectors.length} sentences, dims=${vectors[0].length}, ${Math.round(performance.now() - start)}ms`);
} catch (error) {
  console.error('Model download/smoke test failed:', error);
  process.exit(1);
}
