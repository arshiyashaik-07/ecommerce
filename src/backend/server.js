const express = require('express');
const mysql = require('mysql2/promise');
const client = require('prom-client');

const app = express();
app.use(express.json());

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000]
});
register.registerMetric(httpRequestDurationMicroseconds);

// DB Config from env
const {
  DB_HOST = 'ecommerce-mysql',
  DB_USER = 'ecommerce',
  DB_PASS = 'ecommercepw',
  DB_NAME = 'ecommerce',
} = process.env;

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST, user: DB_USER, password: DB_PASS, database: DB_NAME,
      waitForConnections: true, connectionLimit: 10, queueLimit: 0
    });
  }
  return pool;
}

// Middleware for timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route ? req.route.path : req.path, res.statusCode)
      .observe(duration);
  });
  next();
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/products', async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    const { product_id = 1, qty = 1 } = req.body || {};
    const pool = await getPool();
    await pool.query('INSERT INTO orders (product_id, qty) VALUES (?, ?)', [product_id, qty]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const port = 5000;
app.listen(port, () => console.log(`Backend running on :${port}`));
