// ==================================================================
// CONFIGURACIÓN DEL ENDPOINT BACKEND
// ==================================================================
const API_URL = (() => {
  const origin = window.location.origin;
  if (!origin || origin === 'null' || origin === 'file://') {
    return 'http://localhost:3001/api';
  }
  return `${origin}/api`;
})();

function updateClock() {
  const clock = document.getElementById('live-clock');
  if (!clock) return;
  clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function bindThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isLight = !document.body.classList.contains('light-mode');
    document.body.classList.toggle('light-mode', isLight);
    localStorage.setItem('greenai-theme', isLight ? 'light' : 'dark');
    updateChartColors(isLight ? '#475569' : '#94A3B8', isLight ? '#CBD5E1' : '#334155');
  });

  if (localStorage.getItem('greenai-theme') === 'light') {
    document.body.classList.add('light-mode');
    updateChartColors('#475569', '#CBD5E1');
  }
}

function renderUserProfile() {
  const userRaw = localStorage.getItem('usuarioLogueado');
  if (!userRaw) return;

  try {
    const user = JSON.parse(userRaw);
    const display = document.getElementById('user-name-display');
    if (display && user) {
      display.textContent = user.nombre_completo || user.nombre || 'Operador';
    }
  } catch (error) {
    console.error('Error leyendo sesión:', error);
  }
}

function setupPasswordStrength() {
  const passwordInput = document.getElementById('password');
  const strengthFill = document.getElementById('strength-fill');
  const strengthText = document.getElementById('strength-text');
  if (!passwordInput || !strengthFill || !strengthText) return;

  const evaluateStrength = (value) => {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (score <= 1) {
      strengthFill.style.width = '25%';
      strengthFill.style.background = '#EF4444';
      strengthText.textContent = 'Fuerza: baja';
      return;
    }

    if (score === 2) {
      strengthFill.style.width = '50%';
      strengthFill.style.background = '#F59E0B';
      strengthText.textContent = 'Fuerza: media';
      return;
    }

    if (score === 3) {
      strengthFill.style.width = '75%';
      strengthFill.style.background = '#06B6D4';
      strengthText.textContent = 'Fuerza: alta';
      return;
    }

    strengthFill.style.width = '100%';
    strengthFill.style.background = '#10B981';
    strengthText.textContent = 'Fuerza: robusta';
  };

  passwordInput.addEventListener('input', (event) => evaluateStrength(event.target.value));
}

function isProtectedPage() {
  const path = window.location.pathname.toLowerCase();
  return path.endsWith('/dashboard.html') || path.endsWith('/network.html');
}

function checkAuthSession() {
  const userRaw = localStorage.getItem('usuarioLogueado');
  if (!userRaw) {
    if (isProtectedPage()) {
      window.location.href = 'login.html';
    }
    return null;
  }

  try {
    const parsed = JSON.parse(userRaw);
    if (!parsed || !parsed.email) {
      throw new Error('Usuario inválido');
    }
    return parsed;
  } catch (error) {
    console.error('Error leyendo sesión:', error);
    localStorage.removeItem('usuarioLogueado');
    if (isProtectedPage()) {
      window.location.href = 'login.html';
    }
    return null;
  }
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('usuarioLogueado');
    window.location.href = 'login.html';
  });
}

function bindPublicNavState() {
  const isLogged = Boolean(localStorage.getItem('usuarioLogueado'));
  const dashboardLink = document.querySelector('a[href="dashboard.html"]');
  const loginLink = document.querySelector('a[href="login.html"]');
  const registerLink = document.querySelector('a[href="register.html"]');

  if (dashboardLink && isLogged) {
    dashboardLink.style.display = 'inline-flex';
  }

  if (loginLink && isLogged) {
    loginLink.style.display = 'none';
  }

  if (registerLink && isLogged) {
    registerLink.style.display = 'none';
  }
}

let wattsChart = null;
let resourcesChart = null;
let monthlyEnergyChart = null;

function initializeCharts() {
  const canvasWatts = document.getElementById('wattsChart');
  const canvasResources = document.getElementById('resourcesChart');
  const canvasMonthly = document.getElementById('monthlyEnergyChart');

  if (canvasWatts && typeof Chart !== 'undefined') {
    const ctxWatts = canvasWatts.getContext('2d');
    wattsChart = new Chart(ctxWatts, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Energía real (Watts)',
          data: [],
          fill: true,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart' },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { labels: { color: '#94A3B8', usePointStyle: true, boxWidth: 8 } },
          tooltip: { mode: 'index', intersect: false, titleColor: '#F8FAFC', bodyColor: '#E2E8F0', backgroundColor: '#0F172A' }
        },
        scales: {
          x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } },
          y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } }
        }
      }
    });
  }

  if (canvasResources && typeof Chart !== 'undefined') {
    const ctxResources = canvasResources.getContext('2d');
    resourcesChart = new Chart(ctxResources, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'CPU (%)', data: [], borderColor: '#06B6D4', backgroundColor: 'rgba(6, 182, 212, 0.08)', fill: false, borderWidth: 2, pointRadius: 0, tension: 0.36 },
          { label: 'RAM (%)', data: [], borderColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.08)', fill: false, borderWidth: 2, pointRadius: 0, tension: 0.36 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart' },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { labels: { color: '#94A3B8', usePointStyle: true, boxWidth: 8 } },
          tooltip: { mode: 'index', intersect: false, titleColor: '#F8FAFC', bodyColor: '#E2E8F0', backgroundColor: '#0F172A' }
        },
        scales: {
          x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } },
          y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } }
        }
      }
    });
  }

  if (canvasMonthly && typeof Chart !== 'undefined') {
    const ctxMonthly = canvasMonthly.getContext('2d');
    monthlyEnergyChart = new Chart(ctxMonthly, {
      type: 'bar',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [{
          label: 'kWh',
          data: [330, 420, 390, 480, 460, 510],
          borderRadius: 10,
          backgroundColor: ['#06B6D4', '#22D3EE', '#A855F7', '#10B981', '#67E8F9', '#34D399']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#0F172A', titleColor: '#F8FAFC', bodyColor: '#E2E8F0' }
        },
        scales: {
          x: { ticks: { color: '#94A3B8' }, grid: { display: false } },
          y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } }
        }
      }
    });
  }
}

function updateChartColors(textColor, gridColor) {
  [wattsChart, resourcesChart, monthlyEnergyChart].forEach((chart) => {
    if (!chart) return;

    if (chart.options.plugins.legend) {
      chart.options.plugins.legend.labels.color = textColor;
    }

    if (chart.options.scales.x) {
      chart.options.scales.x.ticks.color = textColor;
      chart.options.scales.x.grid.color = gridColor;
    }

    if (chart.options.scales.y) {
      chart.options.scales.y.ticks.color = textColor;
      chart.options.scales.y.grid.color = gridColor;
    }

    chart.update();
  });
}

async function loadKPIs() {
  try {
    const res = await fetch(`${API_URL}/kpis`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const nodesEl = document.getElementById('kpi-nodes');
    const wattsEl = document.getElementById('kpi-watts');
    const cpuEl = document.getElementById('kpi-cpu');
    const ramEl = document.getElementById('kpi-ram');

    if (nodesEl) nodesEl.textContent = String(data.nodosActivos ?? '--');
    if (wattsEl) wattsEl.textContent = `${data.totalWatts ?? 0} W`;
    if (cpuEl) cpuEl.textContent = `${data.cpuAvg ?? 0} %`;
    if (ramEl) ramEl.textContent = `${data.ramAvg ?? 0} %`;

    const nodesCard = document.querySelector('.kpi-card .kpi-value strong#kpi-nodes')?.closest('.kpi-card');
    if (nodesCard && !nodesCard.dataset.bound) {
      nodesCard.dataset.bound = 'true';
      nodesCard.style.cursor = 'pointer';
      nodesCard.addEventListener('click', () => {
        window.location.href = 'network.html';
      });
    }
  } catch (error) {
    console.error('Error al cargar KPIs:', error);
  }
}

async function loadUsuariosTable() {
  try {
    const tbody = document.getElementById('usuarios-table-body');
    if (!tbody) return;

    const res = await fetch(`${API_URL}/usuarios`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    tbody.innerHTML = (data || []).map((u) => `
      <tr>
        <td class="mono">${u.usuario_id || '--'}</td>
        <td>${u.nombre_completo || 'Sin nombre'}</td>
        <td>${u.email || 'N/A'}</td>
        <td><span class="tag cyan">${(u.rol || 'OPERATOR').toUpperCase()}</span></td>
        <td>${u.fecha_creacion ? new Date(u.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
  }
}

async function loadHardwareTable() {
  try {
    const tbody = document.getElementById('hardware-table-body');
    if (!tbody) return;

    const res = await fetch(`${API_URL}/hardware`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    tbody.innerHTML = (data || []).map((h) => `
      <tr>
        <td>${h.hostname || 'N/A'}</td>
        <td class="mono">${h.ip_address || '0.0.0.0'}</td>
        <td>${h.cpu_cores || 0} cores</td>
        <td>${h.ram_gb || 0} GB</td>
        <td class="mono">${h.max_watts || 0} W</td>
        <td>${h.usuario?.nombre_completo || h.usuario_nombre || 'Sin asignar'}</td>
        <td><span class="tag ${h.estado === 'INACTIVO' ? 'purple' : 'success'}">${(h.estado || 'ACTIVO').toUpperCase()}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error al cargar hardware:', error);
  }
}

async function loadMonthlyEnergy() {
  if (!monthlyEnergyChart) return;

  try {
    const res = await fetch(`${API_URL}/logs`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const points = Array.from({ length: 6 }, (_, idx) => {
      const item = (data || [])[idx] || {};
      return Number(item.energia_watts || [330, 420, 390, 480, 460, 510][idx] || 0);
    });

    monthlyEnergyChart.data.datasets[0].data = points;
    monthlyEnergyChart.update();
  } catch (error) {
    console.error('Error al cargar consumo mensual:', error);
  }
}

async function loadLogsAndCharts() {
  try {
    const res = await fetch(`${API_URL}/logs`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tbody = document.getElementById('logs-table-body');
    if (tbody) {
      tbody.innerHTML = (data || []).slice(0, 10).map((log) => {
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '--:--:--';
        return `
          <tr>
            <td>${timestamp}</td>
            <td>${log.hostname || 'Servidor'}</td>
            <td>${log.cpu_utilization_pct ?? 0}%</td>
            <td>${log.ram_utilization_pct ?? 0}%</td>
            <td>${log.temperatura_celsius ?? 0} °C</td>
            <td class="mono">${log.energia_watts ?? 0} W</td>
          </tr>
        `;
      }).join('');
    }

    if (wattsChart && resourcesChart && Array.isArray(data)) {
      const ordered = [...data].reverse();
      const labels = ordered.map((log) => log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
      const wattsData = ordered.map((log) => Number(log.energia_watts ?? 0));
      const cpuData = ordered.map((log) => Number(log.cpu_utilization_pct ?? 0));
      const ramData = ordered.map((log) => Number(log.ram_utilization_pct ?? 0));

      wattsChart.data.labels = labels;
      wattsChart.data.datasets[0].data = wattsData;
      wattsChart.update();

      resourcesChart.data.labels = labels;
      resourcesChart.data.datasets[0].data = cpuData;
      resourcesChart.data.datasets[1].data = ramData;
      resourcesChart.update();
    }
  } catch (error) {
    console.error('Error al cargar logs y gráficos:', error);
  }
}

function setMessage(elementId, message, isError = false) {
  const messageBox = document.getElementById(elementId);
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.style.color = isError ? '#EF4444' : '#10B981';
}

async function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;

    if (!email || !password) {
      setMessage('message', 'Completa correo y contraseña.', true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al iniciar sesión.');

      const usuario = data.usuario || { nombre_completo: 'Usuario' };
      localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
      setMessage('message', '¡Bienvenido! Redirigiendo...');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
    } catch (error) {
      setMessage('message', error.message || 'Error de conexión.', true);
    }
  });
}

async function setupRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre = document.getElementById('nombre_completo')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirm_password')?.value;
    const rol = document.getElementById('rol')?.value || 'OPERADOR';

    if (!nombre || !email || !password || !confirmPassword) {
      setMessage('message', 'Completa todos los campos.', true);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('message', 'Las contraseñas no coinciden.', true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_completo: nombre, email, password, rol })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al registrar usuario.');

      const usuario = (data && data.data && data.data[0]) || { nombre_completo: nombre, email, rol };
      localStorage.setItem('usuarioLogueado', JSON.stringify(usuario));
      setMessage('message', '¡Registro exitoso! Redirigiendo...');
      form.reset();
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
    } catch (error) {
      setMessage('message', error.message || 'Error de conexión.', true);
    }
  });
}

function renderHardwareCards(data) {
  const container = document.getElementById('hardware-cards');
  if (!container) return;

  const items = Array.isArray(data) ? data : [];
  const cards = items.slice(0, 4).map((host) => {
    const estado = (host.estado || 'ACTIVO').toUpperCase();
    const online = estado !== 'INACTIVO';

    return `
      <article class="server-card ${online ? 'online' : 'offline'}">
        <div class="server-header">
          <div class="server-name">${host.hostname || 'NODE-01'}</div>
          <span class="server-status ${online ? 'online' : 'offline'}">${estado}</span>
        </div>

        <div class="server-meta">
          <div class="server-meta-item">
            <span class="meta-label">IP</span>
            <span class="meta-value mono">${host.ip_address || '10.0.0.1'}</span>
          </div>
          <div class="server-meta-item">
            <span class="meta-label">Cores</span>
            <span class="meta-value mono">${host.cpu_cores || 0}</span>
          </div>
          <div class="server-meta-item">
            <span class="meta-label">RAM</span>
            <span class="meta-value mono">${host.ram_gb || 0} GB</span>
          </div>
          <div class="server-meta-item">
            <span class="meta-label">Power</span>
            <span class="meta-value mono">${host.max_watts || 0} W</span>
          </div>
        </div>

        <div class="server-metrics">
          <div class="metric-box"><span>CPU</span><strong>${host.cpu_cores || 0}%</strong></div>
          <div class="metric-box"><span>RAM</span><strong>${host.ram_gb || 0}%</strong></div>
        </div>
      </article>
    `;
  }).join('');

  container.innerHTML = cards || '<div class="server-card online"><div class="server-name">Sin datos</div></div>';
}

function renderPhysicalRack(data) {
  const container = document.getElementById('physical-rack');
  if (!container) return;

  const servers = Array.isArray(data) && data.length ? data : Array.from({ length: 50 }, (_, index) => ({
    hostname: `NODE-${String(index + 1).padStart(2, '0')}`,
    estado: index % 6 === 0 ? 'INACTIVO' : 'ACTIVO',
    ip_address: `10.11.${Math.floor(index / 16)}.${(index % 16) + 10}`,
    cpu_cores: 16,
    ram_gb: 32,
    max_watts: 320 + (index % 5) * 20
  }));

  const safeServers = Array.from({ length: 50 }, (_, index) => {
    const server = servers[index] || {};
    return {
      hostname: server.hostname || `NODE-${String(index + 1).padStart(2, '0')}`,
      estado: server.estado || 'ACTIVO',
      ip_address: server.ip_address || `10.11.${Math.floor(index / 16)}.${(index % 16) + 10}`,
      cpu_cores: server.cpu_cores || 16,
      ram_gb: server.ram_gb || 32,
      max_watts: server.max_watts || 320,
      usuario: server.usuario || null
    };
  });

  const cabinets = Array.from({ length: 5 }, (_, cabinetIndex) => {
    const start = cabinetIndex * 10;
    const slice = safeServers.slice(start, start + 10);
    const slots = slice.map((server) => {
      const online = (server.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO';
      const tooltip = `${server.hostname}\nIP: ${server.ip_address}\nCPU: ${server.cpu_cores} cores\nRAM: ${server.ram_gb} GB\nPower: ${server.max_watts} W`;
      return `
        <div class="rack-slot ${online ? 'online' : 'offline'}" title="${tooltip}">
          <span class="rack-led"></span>
          <small>${server.hostname}</small>
        </div>
      `;
    }).join('');

    return `
      <div class="rack-cabinet">
        <div class="cabinet-header">CAB-${cabinetIndex + 1}</div>
        <div class="cabinet-slots">${slots}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = cabinets;
}

function toggleNetworkView(mode) {
  const logicalPanel = document.getElementById('network-logic-panel');
  const physicalPanel = document.getElementById('network-physical-panel');
  const buttons = document.querySelectorAll('[data-view-toggle]');

  if (!logicalPanel || !physicalPanel) return;

  const showLogical = mode === 'logical';
  logicalPanel.classList.toggle('active', showLogical);
  physicalPanel.classList.toggle('active', !showLogical);

  buttons.forEach((button) => {
    const isActive = button.dataset.viewToggle === mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

async function loadNetworkData() {
  try {
    const [hardwareRes, logsRes, kpisRes] = await Promise.all([
      fetch(`${API_URL}/hardware`),
      fetch(`${API_URL}/logs`),
      fetch(`${API_URL}/kpis`)
    ]);

    const hardware = hardwareRes.ok ? await hardwareRes.json() : [];
    const logs = logsRes.ok ? await logsRes.json() : [];
    const kpis = kpisRes.ok ? await kpisRes.json() : {};

    renderHardwareCards(hardware);
    renderPhysicalRack(hardware);

    const nodeCountEl = document.getElementById('network-nodes');
    const trafficEl = document.getElementById('network-traffic');
    const latencyEl = document.getElementById('network-latency');

    if (nodeCountEl) nodeCountEl.textContent = `${kpis.nodosActivos ?? hardware.length ?? 0}`;
    if (trafficEl) trafficEl.textContent = `${kpis.totalWatts ?? 0} W`;
    if (latencyEl) latencyEl.textContent = `${Math.max(6, Math.min(120, Number(kpis.cpuAvg ?? 34) * 2))} ms`;

    const feed = document.getElementById('network-log-feed');
    if (feed) {
      feed.innerHTML = (logs || []).slice(0, 6).map((log) => `
        <li>
          <strong>${log.hostname || 'NODE'}</strong>
          <span>${log.temperatura_celsius ?? 0}°C</span>
        </li>
      `).join('');
    }
  } catch (error) {
    console.error('Error cargando red:', error);
  }
}

function initializeDashboard() {
  checkAuthSession();
  renderUserProfile();
  initializeCharts();
  loadKPIs();
  loadUsuariosTable();
  loadHardwareTable();
  loadLogsAndCharts();
  loadMonthlyEnergy();
  setInterval(() => {
    loadKPIs();
    loadLogsAndCharts();
    loadMonthlyEnergy();
  }, 10000);
}

function initializeNetworkPage() {
  checkAuthSession();
  renderUserProfile();
  loadNetworkData();
  const viewButtons = document.querySelectorAll('[data-view-toggle]');
  viewButtons.forEach((button) => {
    button.addEventListener('click', () => toggleNetworkView(button.dataset.viewToggle));
  });
  toggleNetworkView('logical');
  setInterval(loadNetworkData, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  bindThemeToggle();
  renderUserProfile();
  setupPasswordStrength();
  setupLogoutButton();
  setupLoginForm();
  setupRegisterForm();
  bindPublicNavState();

  if (document.getElementById('wattsChart') || document.getElementById('resourcesChart') || document.getElementById('monthlyEnergyChart')) {
    initializeDashboard();
  }

  if (document.getElementById('hardware-cards') || document.getElementById('physical-rack')) {
    initializeNetworkPage();
  }
});