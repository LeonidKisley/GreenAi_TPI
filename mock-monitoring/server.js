const http = require('http');
const { randomUUID } = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const NODE_COUNT = 50;

function makeNodes() {
  const nodes = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const id = `NODE-${String(i + 1).padStart(2, '0')}`;
    nodes.push({
      nodeId: id,
      hostname: id,
      ipAddress: `10.11.${Math.floor(i / 16)}.${(i % 16) + 10}`,
      cpuCores: 16 + (i % 4) * 4,
      ramGb: 32 + (i % 3) * 16,
      maxWatts: 320 + (i % 5) * 20,
      estado: i % 7 === 0 ? 'INACTIVO' : 'ACTIVO',
      usuario: i % 3 === 0 ? { nombreCompleto: `Operador ${(i % 9) + 1}` } : null
    });
  }
  return nodes;
}

function seedState(nodes) {
  return nodes.map((n) => ({
    nodeId: n.nodeId,
    cpu: 25 + Math.random() * 60,
    ram: 30 + Math.random() * 50,
    temp: 38 + Math.random() * 14,
    watts: n.maxWatts * (0.55 + Math.random() * 0.35)
  }));
}

function drift(state, nodes) {
  for (let i = 0; i < state.length; i++) {
    const s = state[i];
    s.cpu = clamp(s.cpu + walk(), 2, 99);
    s.ram = clamp(s.ram + walk() * 0.8, 5, 98);
    s.temp = clamp(s.temp + walk() * 0.35, 30, 70);
    s.watts = clamp(s.watts + walk() * 6, 40, nodes[i].maxWatts);
  }
  return state;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function walk() {
  return (Math.random() - 0.48) * 6;
}

const nodes = makeNodes();
const nodeState = seedState(nodes);

function snapshotAt(time) {
  const entries = [];
  for (let i = 0; i < nodeState.length; i++) {
    const s = nodeState[i];
    const n = nodes[i];
    entries.push({
      nodeId: n.nodeId,
      hostname: n.hostname,
      timestamp: time.toISOString(),
      cpuUtilizationPct: round1(s.cpu),
      ramUtilizationPct: round1(s.ram),
      temperaturaCelsius: round1(s.temp),
      energiaWatts: round1(s.watts),
      estado: n.estado
    });
  }
  return entries;
}

function buildHistory() {
  const now = Date.now();
  const history = [];
  const maxSamples = 24;

  for (let sample = 0; sample < maxSamples; sample++) {
    const t = new Date(now - (maxSamples - 1 - sample) * 60 * 1000);
    snapshotAt(t).forEach((entry, index) => {
      if ((index + sample) % 2 === 0) return;
      history.push(entry);
    });
  }
  history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return history;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': randomUUID()
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  drift(nodeState, nodes);

  if (pathname === '/health') {
    return send(res, 200, { status: 'ok', service: 'green-ai-monitoring-mock', port: PORT });
  }

  if (pathname === '/api/v1/metrics/catalog' && req.method === 'GET') {
    return send(res, 200, nodes);
  }

  if (pathname === '/api/v1/metrics/current' && req.method === 'GET') {
    return send(res, 200, snapshotAt(new Date()));
  }

  if (pathname === '/api/v1/metrics/history' && req.method === 'GET') {
    return send(res, 200, buildHistory());
  }

  send(res, 404, { detail: `No existe el recurso: ${req.method} ${pathname}` });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 green-ai-monitoring-mock escuchando en http://0.0.0.0:${PORT}`);
  console.log(`   Contrato generado para el gateway: /api/v1/metrics/{catalog,current,history}`);
});