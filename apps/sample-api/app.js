const express = require('express');
const client = require('prom-client');

const app = express();
const port = process.env.PORT || 3000;

// ── Prometheus metrics setup ───────────────────────────────────
const register = new client.Registry();

// Default metrics: CPU, memory, event loop lag etc.
client.collectDefaultMetrics({ register, prefix: 'api_' });

// Custom metric 1: HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Custom metric 2: Request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Custom metric 3: Active requests gauge
const activeRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
});

// Custom metric 4: Business metric — tasks created
const tasksCreated = new client.Counter({
  name: 'tasks_created_total',
  help: 'Total number of tasks created',
  labelNames: ['priority'],
  registers: [register],
});

// Custom metric 5: Error rate
const errorsTotal = new client.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type'],
  registers: [register],
});

// ── Middleware — tracks every request ─────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  activeRequests.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';

    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    activeRequests.dec();

    if (res.statusCode >= 500) {
      errorsTotal.labels('server_error').inc();
    } else if (res.statusCode >= 400) {
      errorsTotal.labels('client_error').inc();
    }
  });

  next();
});

app.use(express.json());

// ── Metrics endpoint — Prometheus scrapes this ─────────────────
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ── Health check ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── Sample API endpoints ───────────────────────────────────────
const tasks = [
  { id: 1, title: 'Set up monitoring', status: 'done', priority: 'high' },
  { id: 2, title: 'Configure Grafana dashboards', status: 'in_progress', priority: 'high' },
  { id: 3, title: 'Set up Slack alerts', status: 'todo', priority: 'medium' },
];

app.get('/api/tasks', (req, res) => {
  res.json({ success: true, count: tasks.length, data: tasks });
});

app.post('/api/tasks', (req, res) => {
  const { title, priority = 'medium' } = req.body;
  if (!title) {
    errorsTotal.labels('validation_error').inc();
    return res.status(400).json({ success: false, error: 'title required' });
  }
  const task = { id: tasks.length + 1, title, priority, status: 'todo' };
  tasks.push(task);
  tasksCreated.labels(priority).inc();
  res.status(201).json({ success: true, data: task });
});

// Simulate occasional errors for demo purposes
app.get('/api/simulate-error', (req, res) => {
  errorsTotal.labels('simulated').inc();
  res.status(500).json({ error: 'Simulated server error for monitoring demo' });
});

// Simulate slow endpoint
app.get('/api/simulate-slow', async (req, res) => {
  await new Promise(r => setTimeout(r, Math.random() * 3000));
  res.json({ message: 'slow response', delay: 'random 0-3s' });
});

app.listen(port, () => {
  console.log(`Sample API with Prometheus metrics running on :${port}`);
  console.log(`Metrics available at: http://localhost:${port}/metrics`);
});

module.exports = app;
