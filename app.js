// ===== Настройки =====
const ACCOUNTS = [
  { id: 'phil', name: 'Фил' },
  { id: 'shao', name: 'Шао' }
];

const CATEGORIES = {
  text:     { name: 'Текстовый',      color: '#b8ddf0' },
  neutral:  { name: 'Нейтральный',    color: '#c0ded6' },
  positive: { name: 'Положительный',  color: '#6ec25a' },
  super:    { name: 'Супер удачный',  color: '#ffc107' },
  negative: { name: 'Негативный',     color: '#e57b7b' }
};

// Группы положительного лута
const POS_GROUPS = [
  { key: 'moss',    label: 'Мхи',                color: '#7cb342',
    match: n => n === 'Обычный мох' || n === 'Наполненный водой мох' },
  { key: 'stone_c', label: 'Крошечный камень',   color: '#cfd8dc',
    match: n => n === 'Крошечный камень' },
  { key: 'stone_s', label: 'Небольшой камень',   color: '#b0bec5',
    match: n => n === 'Небольшой камень' },
  { key: 'stone_l', label: 'Камень',             color: '#90a4ae',
    match: n => n === 'Камень' },
  { key: 'kom',     label: 'Ком из веток и водорослей', color: '#00e676',
    match: n => n === 'Ком из веток и водорослей' }
];

// Группы супер-удачного лута
const SUPER_GROUPS = [
  { key: 'dense',   label: 'Плотная водоросль',   color: '#4caf50',
    match: n => n === 'Плотная водоросль' },
  { key: 'healing', label: 'Целебная водоросль',  color: '#2e7d32',
    match: n => n === 'Целебная водоросль' },
  { key: 'branch',  label: 'Крепкая ветка',       color: '#8d6e63',
    match: n => n === 'Крепкая ветка' },
  { key: 'coral',   label: 'Алые кораллы',        color: '#ff6f00',
    match: n => n.startsWith('Алый коралл') },
  { key: 'seaweed', label: 'Листы водорослей',    color: '#ffb300',
    match: n => n.startsWith('Лист морской водоросли') },
  { key: 'iskra',   label: 'Искра',               color: '#ffee00',
    match: n => n === 'Искра' }
];

// Группы негативного лута
const NEG_GROUPS = [
  { key: 'crab',  label: 'Крабы',  color: '#b71c1c',
    match: n => n.startsWith('Живой краб') },
  { key: 'ray',   label: 'Скаты',  color: '#e53935',
    match: n => n.startsWith('Живой электрический скат') },
  { key: 'snake', label: 'Змеи',   color: '#d4534f',
    match: n => n === 'Морская змея' },
  { key: 'jelly', label: 'Медузы', color: '#ef9a9a',
    match: n => n === 'Медуза' }
];

const CATALOG_URL = 'catalog.json';
const DATA_URL    = 'data/loot.json';
const IMAGES_DIR  = 'images/';

// ===== Состояние =====
let catalog = { text: [], neutral: [], positive: [], super: [], negative: [] };
let data = {};
let currentAccount = ACCOUNTS[0].id;
let pieChart = null;
let negGrouped = true;
let posGrouped = true;
let superGrouped = true;

// ===== Старт =====
async function init() {
  await Promise.all([loadCatalog(), loadData()]);
  ACCOUNTS.forEach(a => { if (!Array.isArray(data[a.id])) data[a.id] = []; });
  renderAccounts();
  renderCatalogSelect();
  updateToggles();
  render();
}

async function loadCatalog() {
  try {
    const r = await fetch(CATALOG_URL + '?t=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    catalog = await r.json();
    Object.keys(CATEGORIES).forEach(k => { if (!Array.isArray(catalog[k])) catalog[k] = []; });
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

// ===== Переключатели =====
function toggleNeg() {
  negGrouped = !negGrouped;
  updateToggles();
  renderChart();
}

function togglePos() {
  posGrouped = !posGrouped;
  updateToggles();
  renderChart();
}

function toggleSuper() {
  superGrouped = !superGrouped;
  updateToggles();
  renderChart();
}

function updateToggles() {
  const btnN = document.getElementById('toggleNeg');
  if (btnN) {
    btnN.textContent = negGrouped ? '🔴 Негатив: по видам' : '🔴 Негатив: общий';
    btnN.classList.toggle('active', negGrouped);
  }
  const btnP = document.getElementById('togglePos');
  if (btnP) {
    btnP.textContent = posGrouped ? '🟢 Позитив: по видам' : '🟢 Позитив: общий';
    btnP.classList.toggle('active', posGrouped);
  }
  const btnS = document.getElementById('toggleSuper');
  if (btnS) {
    btnS.textContent = superGrouped ? '🟡 Супер: по видам' : '🟡 Супер: общий';
    btnS.classList.toggle('active', superGrouped);
  }
}

// ===== Рендер =====
function render() {
  renderStats();
  renderDrops();
  renderChart();
}

function renderStats() {
  const drops = data[currentAccount] || [];
  const counts = { text: 0, neutral: 0, positive: 0, super: 0, negative: 0 };
  const damage = { раны: 0, переломы: 0, отравление: 0 };
  let totalDamage = 0;

  // Для тултипа на плитке «Супер» — разбивка по названиям
  const superItems = {};

  drops.forEach(d => {
    const item = findInCatalog(d.catalogId);
    if (!item) return;
    counts[item.category] = (counts[item.category] || 0) + 1;
    if (item.category === 'negative') {
      totalDamage += item.damage || 0;
      if (item.effect) damage[item.effect] = (damage[item.effect] || 0) + (item.damage || 0);
    }
    if (item.category === 'super') {
      superItems[item.name] = (superItems[item.name] || 0) + 1;
    }
  });

  document.getElementById('currentName').textContent =
    ACCOUNTS.find(a => a.id === currentAccount).name;

  const damageLine = Object.entries(damage)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: <b>${v}</b>`)
    .join(' · ');

  // Собираем содержимое тултипа для «Супер»
  const superList = Object.entries(superItems).sort((a, b) => b[1] - a[1]);
  const superPopup = superList.length ? `
    <div class="tile-popup">
      ${superList.map(([name, cnt]) =>
        `<div><b>${cnt}</b> ${escapeHtml(name)}</div>`
      ).join('')}
    </div>
  ` : '';

  document.getElementById('stats').innerHTML = `
    <div class="stat-grid">
      <div class="stat-tile"><div class="label">Всего</div><div class="value">${drops.length}</div></div>
      <div class="stat-tile text"><div class="label">Текст</div><div class="value">${counts.text}</div></div>
      <div class="stat-tile neutral"><div class="label">Нейтрал</div><div class="value">${counts.neutral}</div></div>
      <div class="stat-tile positive"><div class="label">Плюс</div><div class="value">${counts.positive}</div></div>
      <div class="stat-tile super${superList.length ? ' has-popup' : ''}">
        <div class="label">Супер</div>
        <div class="value">${counts.super}</div>
        ${superPopup}
      </div>
      <div class="stat-tile negative"><div class="label">Минус</div><div class="value">${counts.negative}</div></div>
    </div>
    ${totalDamage ? `<div class="damage-line">Суммарный урон: <b>${totalDamage}</b>${damageLine ? ' · ' + damageLine : ''}</div>` : ''}
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

    const noteHtml = item.note
      ? `<span class="note">${escapeHtml(item.note)}</span>`
      : '';

    return `
      <div class="drop-item">
        <div class="thumb">${thumb}</div>
        <span class="tag ${item.category}">${CATEGORIES[item.category].name}</span>
        <span class="name">${escapeHtml(item.name)}${noteHtml}</span>
        <span class="time">${time}</span>
        <button class="remove" onclick="removeDrop(${i})" title="Удалить">✕</button>
      </div>
    `;
  }).join('');
}

// ===== График =====
function renderChart() {
  const drops = data[currentAccount] || [];

  let textCount = 0;
  let neutralCount = 0;
  let posTotal = 0;
  let superTotal = 0;
  let negTotal = 0;
  const posCounts = {};
  const superCounts = {};
  const negCounts = {};
  POS_GROUPS.forEach(g => posCounts[g.key] = 0);
  SUPER_GROUPS.forEach(g => superCounts[g.key] = 0);
  NEG_GROUPS.forEach(g => negCounts[g.key] = 0);
  let posOther = 0;
  let superOther = 0;
  let negOther = 0;

  drops.forEach(d => {
    const item = findInCatalog(d.catalogId);
    if (!item) return;

    if (item.category === 'text') textCount++;
    else if (item.category === 'neutral') neutralCount++;
    else if (item.category === 'positive') {
      posTotal++;
      const g = POS_GROUPS.find(x => x.match(item.name));
      if (g) posCounts[g.key]++;
      else posOther++;
    }
    else if (item.category === 'super') {
      superTotal++;
      const g = SUPER_GROUPS.find(x => x.match(item.name));
      if (g) superCounts[g.key]++;
      else superOther++;
    }
    else if (item.category === 'negative') {
      negTotal++;
      const g = NEG_GROUPS.find(x => x.match(item.name));
      if (g) negCounts[g.key]++;
      else negOther++;
    }
  });

  const slices = [];
  if (textCount)    slices.push({ label: `Текст (${textCount})`,       value: textCount,    color: CATEGORIES.text.color });
  if (neutralCount) slices.push({ label: `Нейтрал (${neutralCount})`,  value: neutralCount, color: CATEGORIES.neutral.color });

  if (posGrouped) {
    POS_GROUPS.forEach(g => {
      if (posCounts[g.key]) slices.push({
        label: `${g.label} (${posCounts[g.key]})`,
        value: posCounts[g.key],
        color: g.color
      });
    });
    if (posOther) slices.push({ label: `Позитив, прочее (${posOther})`, value: posOther, color: '#c5e1a5' });
  } else {
    if (posTotal) slices.push({ label: `Позитив (${posTotal})`, value: posTotal, color: CATEGORIES.positive.color });
  }

  if (superGrouped) {
    SUPER_GROUPS.forEach(g => {
      if (superCounts[g.key]) slices.push({
        label: `${g.label} (${superCounts[g.key]})`,
        value: superCounts[g.key],
        color: g.color
      });
    });
    if (superOther) slices.push({ label: `Супер, прочее (${superOther})`, value: superOther, color: '#ffe082' });
  } else {
    if (superTotal) slices.push({ label: `Супер (${superTotal})`, value: superTotal, color: CATEGORIES.super.color });
  }

  if (negGrouped) {
    NEG_GROUPS.forEach(g => {
      if (negCounts[g.key]) slices.push({
        label: `${g.label} (${negCounts[g.key]})`,
        value: negCounts[g.key],
        color: g.color
      });
    });
    if (negOther) slices.push({ label: `Негатив, прочее (${negOther})`, value: negOther, color: '#7a4a4a' });
  } else {
    if (negTotal) slices.push({ label: `Негатив (${negTotal})`, value: negTotal, color: CATEGORIES.negative.color });
  }

  const canvas = document.getElementById('pieChart');
  if (!canvas) return;

  if (!slices.length) {
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

  const labels = slices.map(s => s.label);
  const values = slices.map(s => s.value);
  const colors = slices.map(s => s.color);

  if (pieChart) {
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
      maintainAspectRatio: false,
      animation: {
        animateRotate: false,
        animateScale: false,
        duration: 250,
        easing: 'easeOutQuad'
      },
      plugins: {
        legend: { display: false },
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
