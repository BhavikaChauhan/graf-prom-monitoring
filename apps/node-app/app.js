const express = require('express');
const client = require('prom-client');

const app = express();
const port = process.env.PORT || 3000;

// ── Prometheus metrics setup ───────────────────────────────────
const register = new client.Registry();

// Default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register, prefix: 'nodeapp_' });

// ── Custom business metrics ────────────────────────────────────

// HTTP request counter
const httpRequestCounter = new client.Counter({
  name: 'nodeapp_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration histogram (for p95/p99 latency)
const httpRequestDuration = new client.Histogram({
  name: 'nodeapp_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Active requests gauge
const activeRequests = new client.Gauge({
  name: 'nodeapp_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
});

// Business metric — orders processed (mimics real app)
const ordersProcessed = new client.Counter({
  name: 'nodeapp_orders_processed_total',
  help: 'Total orders processed',
  labelNames: ['status'],
  registers: [register],
});

// Error rate counter
const errorCounter = new client.Counter({
  name: 'nodeapp_errors_total',
  help: 'Total application errors',
  labelNames: ['type'],
  registers: [register],
});

// ── Middleware — auto-track every request ──────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  activeRequests.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestCounter.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    activeRequests.dec();
  });

  next();
});

app.use(express.json());

// ── App endpoints ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    app: 'TaskFlow API',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    status: 'running',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Simulate orders endpoint (shows business metrics in Grafana)
app.post('/api/orders', (req, res) => {
  // Simulate 90% success, 10% failure
  const success = Math.random() > 0.1;

  if (success) {
    ordersProcessed.labels('success').inc();
    res.status(201).json({ success: true, orderId: `ORD-${Date.now()}` });
  } else {
    ordersProcessed.labels('failed').inc();
    errorCounter.labels('order_processing').inc();
    res.status(500).json({ success: false, error: 'Processing failed' });
  }
});

// Simulate slow endpoint (shows latency in Grafana)
app.get('/api/slow', async (req, res) => {
  const delay = Math.floor(Math.random() * 2000) + 500; // 500ms–2.5s
  await new Promise(r => setTimeout(r, delay));
  res.json({ message: 'slow response', delay_ms: delay });
});

app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    count: 3,
    data: [
      { id: 1, name: 'DevOps Starter Pack', price: 25000 },
      { id: 2, name: 'Cloud Infra Setup', price: 50000 },
      { id: 3, name: 'Monitoring Stack', price: 30000 },
    ],
  });
});

// ── Prometheus scrape endpoint ─────────────────────────────────
// Prometheus hits this every 15s to collect metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`App running on port ${port}`);
  console.log(`Metrics available at http://localhost:${port}/metrics`);
});

module.exports = app;
