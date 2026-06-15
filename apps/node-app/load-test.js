// ================================================================
// Load test — generates realistic traffic so Grafana dashboards
// show real data. Run this when you want portfolio screenshots.
// Usage: node load-test.js
// ================================================================

const http = require('http');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const DURATION_MS = 5 * 60 * 1000; // Run for 5 minutes
const start = Date.now();

let requestCount = 0;
let errorCount = 0;

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        requestCount++;
        if (res.statusCode >= 500) errorCount++;
        resolve(res.statusCode);
      });
    });

    req.on('error', () => { errorCount++; resolve(0); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runLoadTest() {
  console.log(`🚀 Load test started — running for 5 minutes against ${BASE_URL}`);
  console.log('Watch your Grafana dashboard fill up with data!\n');

  while (Date.now() - start < DURATION_MS) {
    // Mix of different endpoints — realistic traffic pattern
    await Promise.all([
      makeRequest('/'),
      makeRequest('/health'),
      makeRequest('/api/products'),
      makeRequest('/api/orders', 'POST', { product: 'test' }),
      makeRequest('/api/orders', 'POST', { product: 'test' }),
      makeRequest('/api/orders', 'POST', { product: 'test' }),
      // Occasionally hit slow endpoint
      Math.random() > 0.7 ? makeRequest('/api/slow') : Promise.resolve(),
    ]);

    const elapsed = Math.floor((Date.now() - start) / 1000);
    const rps = (requestCount / elapsed).toFixed(1);
    process.stdout.write(`\r⏱  ${elapsed}s | Requests: ${requestCount} | Errors: ${errorCount} | RPS: ${rps}`);

    await new Promise(r => setTimeout(r, 500)); // 500ms between bursts
  }

  console.log(`\n\n✅ Load test complete!`);
  console.log(`Total requests: ${requestCount}`);
  console.log(`Total errors:   ${errorCount}`);
  console.log(`Error rate:     ${((errorCount / requestCount) * 100).toFixed(1)}%`);
  console.log('\nNow take your Grafana screenshots! 📸');
}

runLoadTest();
