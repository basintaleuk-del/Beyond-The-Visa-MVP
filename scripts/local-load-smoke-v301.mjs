import { performance } from 'node:perf_hooks';

const origin = new URL(process.argv[2] || 'http://127.0.0.1:4175/');
const paths = ['/', '/privacy-policy.html', '/golden-question.html', '/?screen=jobs&job=example'];
const levels = [10, 50, 100];

const percentile = (values, fraction) => values[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)];

for (const concurrency of levels) {
  const started = performance.now();
  const samples = await Promise.all(Array.from({ length: concurrency }, async (_, index) => {
    const target = new URL(paths[index % paths.length], origin);
    const requestStarted = performance.now();
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(10_000) });
      await response.arrayBuffer();
      return { latency: performance.now() - requestStarted, ok: response.ok, timeout: false, status: response.status };
    } catch (error) {
      return {
        latency: performance.now() - requestStarted,
        ok: false,
        timeout: error?.name === 'TimeoutError',
        status: error?.cause?.code || error?.name || 'request-error'
      };
    }
  }));
  const elapsed = performance.now() - started;
  const latencies = samples.map(({ latency }) => latency).sort((a, b) => a - b);
  const errors = samples.filter(({ ok }) => !ok).length;
  const timeouts = samples.filter(({ timeout }) => timeout).length;
  console.log(JSON.stringify({
    scope: 'local-static-build-only',
    concurrency,
    requests: samples.length,
    requestsPerSecond: Number((samples.length / (elapsed / 1000)).toFixed(2)),
    averageMs: Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2)),
    p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
    p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
    p99Ms: Number(percentile(latencies, 0.99).toFixed(2)),
    errorRate: Number((errors / samples.length).toFixed(4)),
    timeoutRate: Number((timeouts / samples.length).toFixed(4))
    ,failureKinds: Object.fromEntries(Object.entries(samples.filter(({ ok }) => !ok).reduce((counts, { status }) => {
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {})).sort())
  }));
}
