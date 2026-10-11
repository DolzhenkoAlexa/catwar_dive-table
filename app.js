// ===== Настройки =====
const ACCOUNTS = [
  { id: 'phil', name: 'Фил' },
  { id: 'shao', name: 'шао' }
];

const CATEGORIES = {
  text:     { name: 'Текстовый',    color: '#90a3b0' },
  neutral:  { name: 'Нейтральный',  color: '#58b8a0' },
  positive: { name: 'Положительный', color: '#6ec25a' },
  negative: { name: 'Негативный',   color: '#e57b7b' }
};

const CATALOG_URL = 'catalog.json';
const DATA_URL = 'data/loot.json';
const IMAGES_DIR = 'images/';   // если картинки в корне — оставь ''

// ===== Состояние =====
let catalog = { text: [], neutral: [], positive: [], negative: [] };
let data = {};
let currentAccount = ACCOUNTS[0].id;
let pieChart = null;

// ===== Старт =====
async function init() {
  await Promise.all([loadCatalog(), loadData()]);
  ACCOUNTS.forEach(a => { if (!Array.isArray(data[a.id])) data[a.id] = []; });
  renderAccounts();
  renderCatalogSelect();
  render();
}

async function loadCatalog() {
  try {
    const r = await fetch(CATALOG_URL + '?t=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    catalog = await r.json();
  } catch (e) {
    console.warn('Не удалось загрузить catalog.json:', e.message);
  }
}

async function loadData() {
  try {
    const r = await fetch(DATA_URL + '?t=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    data = await r.json();
  } catch (e) {
    console.warn('Не удалось загрузить data/loot.json:', e.message);
    data = {};
  }
}

// ===== Аккаунты =====
function renderAccounts() {
  const nav = document.getElementById('accounts');
  nav.innerHTML = ACCOUNTS.map(a => `
    <button class="${a.id === currentAccount ? 'active' : ''}"
            onclick="switchAccount('${a.id}')">${a.name}</button>
  `).join('');
}

function switchAccount(id) {
  currentAccount = id;
  renderAccounts();
  render();
}

// ===== Каталог =====
function renderCatalogSelect() {
  const sel = document.getElementById('catalogSelect');
  const groups = [];
  for (const cat of Object.keys(CATEGORIES)) {
    const items = catalog[cat] || [];
    if (!items.length) continue;
    const opts = items.map(it =>
      `<option value="${cat}::${it.id}">${escapeHtml(it.name)}</option>`
    ).join('');
    groups.push(`<optgroup label="${CATEGORIES[cat].name}">${opts}</optgroup>`);
  }
  sel.innerHTML = groups.join('') || '<option disabled>Каталог пуст</option>';
}

// ===== Добавить / удалить =====
function addDrop() {
  const raw = document.getElementById('catalogSelect').value;
  if (!raw) return;
  const [cat, id] = raw.split('::');
  data[currentAccount].unshift({
    catalogId: id,
    category: cat,
    at: new Date().toISOString()
  });
  render();
}

function removeDrop(index) {
  data[currentAccount].splice(index, 1);
  render();
}

// ===== Поиск =====
function findInCatalog(catalogId) {
  for (const cat of Object.keys(catalog)) {
    const found = (catalog[cat] || []).find(x => x.id === catalogId);
    if (found) return { ...found, category: cat };
  }
  return null;
}

// ===== Рендер =====
function render() {
  renderStats();
  renderDrops();
  renderChart();
}

function renderStats() {
  const drops = data[currentAccount] || [];
  const counts = { text: 0, neutral: 0, positive: 0, negative: 0 };
  const damage = { раны: 0, переломы: 0, отравление: 0 };
  let totalDamage = 0;

  drops.forEach(d => {
    const item = findInCatalog(d.catalogId);
    if (!item) return;
    counts[item.category] = (counts[item.category] || 0) + 1;
    if (item.category === 'negative') {
      totalDamage += item.damage || 0;
      if (item.effect) damage[item.effect] = (damage[item.effect] || 0) + (item.damage || 0);
    }
  });

  document.getElementById('currentName').textContent =
    ACCOUNTS.find(a => a.id === currentAccount).name;

  const damageLine = Object.entries(damage)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: <b>${v}%</b>`)
    .join(' · ');

  document.getElementById('stats').innerHTML = `
    <div class="stat-grid">
      <div class="stat-tile"><div class="label">Всего</div><div class="value">${drops.length}</div></div>
      <div class="stat-tile text"><div class="label">Текст</div><div class="value">${counts.text}</div></div>
      <div class="stat-tile neutral"><div class="label">Нейтрал</div><div class="value">${counts.neutral}</div></div>
      <div class="stat-tile positive"><div class="label">Плюс</div><div class="value">${counts.positive}</div></div>
      <div class="stat-tile negative"><div class="label">Минус</div><div class="value">${counts.negative}</div></div>
    </div>
    ${totalDamage ? `<div class="damage-line">Суммарный урон: <b>${totalDamage}%</b>${damageLine ? ' · ' + damageLine : ''}</div>` : ''}
  `;
}

function renderDrops() {
  const drops = data[currentAccount] || [];
  document.getElementById('dropCount').textContent = drops.length ? `(${drops.length})` : '';

  const list = document.getElementById('dropsList');
  if (!drops.length) {
    list.innerHTML = '<div class="empty">Пока пусто. Добавь первый лут выше.</div>';
    return;
  }

  list.innerHTML = drops.map((d, i) => {
    const item = findInCatalog(d.catalogId);
    if (!item) return '';

    const time = new Date(d.at).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const thumb = item.image
      ? `<img src="${IMAGES_DIR}${item.image}" alt="" loading="lazy">`
      : '';

    return `
      <div class="drop-item">
        <div class="thumb">${thumb}</div>
        <span class="tag ${item.category}">${CATEGORIES[item.category].name}</span>
        <span class="name">${escapeHtml(item.name)}</span>
        <span class="time">${time}</span>
        <button class="remove" onclick="removeDrop(${i})" title="Удалить">✕</button>
      </div>
    `;
  }).join('');
}

// ===== График =====
function renderChart() {
  const drops = data[currentAccount] || [];
  const counts = { text: 0, neutral: 0, positive: 0, negative: 0 };
  drops.forEach(d => {
    const item = findInCatalog(d.catalogId);
    if (item) counts[item.category]++;
  });

  const labels = [];
  const values = [];
  const colors = [];

  for (const cat of Object.keys(CATEGORIES)) {
    if (counts[cat] > 0) {
      labels.push(`${CATEGORIES[cat].name} (${counts[cat]})`);
      values.push(counts[cat]);
      colors.push(CATEGORIES[cat].color);
    }
  }

  const canvas = document.getElementById('pieChart');
  if (!canvas) return;

  // если всё пусто — покажем заглушку
  if (!values.length) {
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    canvas.style.display = 'none';
    let empty = canvas.parentElement.querySelector('.empty-chart');
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'empty-chart';
      empty.textContent = 'Нет данных для графика';
      canvas.parentElement.appendChild(empty);
    }
    return;
  } else {
    canvas.style.display = '';
    const empty = canvas.parentElement.querySelector('.empty-chart');
    if (empty) empty.remove();
  }

  if (pieChart) {
    // обновляем существующий
    pieChart.data.labels = labels;
    pieChart.data.datasets[0].data = values;
    pieChart.data.datasets[0].backgroundColor = colors;
    pieChart.update();
    return;
  }

  pieChart = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 13 },
            padding: 12,
            usePointStyle: true,
            pointStyle: 'circle',
            color: '#1f3a4d'
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ===== Экспорт / импорт =====
function exportFile() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'loot.json';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('fileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('ожидался объект с аккаунтами');
      if (!confirm('Заменить текущие данные содержимым файла?')) {
        e.target.value = ''; return;
      }
      data = parsed;
      ACCOUNTS.forEach(a => { if (!Array.isArray(data[a.id])) data[a.id] = []; });
      render();
    } catch (err) {
      alert('Ошибка файла: ' + err.message);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// ===== Утилиты =====
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

init();
