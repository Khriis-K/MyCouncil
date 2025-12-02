const API_URL = 'http://localhost:3000/api/summon';

// Test Configurations
const DILEMMA_LENGTHS = [50, 100, 250, 500];
const COUNCIL_SIZES = [3, 5, 7];
const ITERATIONS = 3;
const DELAY_BETWEEN_REQUESTS_MS = 2000;

// Helper to generate specific length strings
const generateDilemma = (length: number): string => {
  const base = "This is a test dilemma to benchmark the response time of the council. ";
  let result = base;
  while (result.length < length) {
    result += base;
  }
  return result.substring(0, length);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface BenchmarkResult {
  length: number;
  councilSize: number;
  times: number[];
  avg: number;
}

async function runBenchmark() {
  console.log('🚀 Starting Council Summoning Benchmark...\n');
  console.log(`Configurations:`);
  console.log(`- Dilemma Lengths: ${DILEMMA_LENGTHS.join(', ')} chars`);
  console.log(`- Council Sizes: ${COUNCIL_SIZES.join(', ')}`);
  console.log(`- Iterations per config: ${ITERATIONS}`);
  console.log('--------------------------------------------------\n');

  const results: BenchmarkResult[] = [];

  for (const size of COUNCIL_SIZES) {
    for (const length of DILEMMA_LENGTHS) {
      const times: number[] = [];
      const dilemma = generateDilemma(length);

      process.stdout.write(`Testing Size: ${size} | Length: ${length} chars... `);

      for (let i = 0; i < ITERATIONS; i++) {
        const start = performance.now();
        
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dilemma,
              councilSize: size,
              mbti: 'BALANCED', // Default
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
          }
          
          // Consume body to ensure request is fully complete
          await response.json();

          const duration = performance.now() - start;
          times.push(duration);
          process.stdout.write('.'); // Progress indicator
        } catch (error) {
          console.error(`\nError in Size ${size} / Length ${length}:`, error);
          times.push(0); // Penalty for error, or handle differently
        }

        // Rate limit safety buffer
        await sleep(DELAY_BETWEEN_REQUESTS_MS);
      }

      // Calculate Stats
      const validTimes = times.filter(t => t > 0);
      const avg = validTimes.length > 0 
        ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length 
        : 0;

      results.push({ length, councilSize: size, times: validTimes, avg });
      process.stdout.write(` Done! (Avg: ${(avg / 1000).toFixed(2)}s)\n`);
    }
  }

  // Final Report
  console.log('\n\n==================================================');
  console.log('📊 BENCHMARK RESULTS');
  console.log('==================================================');
  console.log('| Length (chars) | Council Size | Avg Time (s) | Min (s) | Max (s) |');
  console.log('| :--- | :--- | :--- | :--- | :--- |');

  results.forEach(r => {
    const min = Math.min(...r.times) / 1000;
    const max = Math.max(...r.times) / 1000;
    const avg = r.avg / 1000;
    
    console.log(
      `| ${r.length.toString().padEnd(14)} | ${r.councilSize.toString().padEnd(12)} | ${avg.toFixed(2).padEnd(12)} | ${min.toFixed(2).padEnd(7)} | ${max.toFixed(2).padEnd(7)} |`
    );
  });
}

runBenchmark().catch(console.error);
