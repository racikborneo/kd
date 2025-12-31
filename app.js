const input = document.getElementById('wordInput');
const resultBox = document.getElementById('resultBox');
const suggestionsBox = document.getElementById('suggestionsBox');
const clearBtn = document.getElementById('clearButton');
const retryBtn = document.getElementById('retryButton');
const installBtn = document.getElementById('install-btn');
document.getElementById('year').textContent = new Date().getFullYear();

let kamusID = new Map();
let kamusDY = new Map();
let debounceTimer;
let deferredPrompt;

/* ===============================
   DEFAULT MESSAGE
================================ */
function setDefaultMessage() {
  resultBox.style.whiteSpace = 'pre-line';
  resultBox.textContent =
`Adil Ka' Talino,
Bacuramitn Ka' Saruga,
Basengat Ka' Jubata.`;
}

/* ===============================
   LOAD KAMUS
================================ */
async function loadKamus() {
  retryBtn.style.display = 'none';
  resultBox.textContent = 'Memuat kamus...';

  try {
    const res = await fetch('data-max.json?v=' + Date.now());
    const { kamus } = await res.json();

    kamusID = new Map(Object.entries(kamus['id-dayak']));
    kamusDY = new Map(Object.entries(kamus['dayak-id']));

    setDefaultMessage();
  } catch (e) {
    console.error(e);
    resultBox.textContent = 'Gagal memuat kamus.';
    retryBtn.style.display = 'inline-flex';
  }
}

/* ===============================
   UTIL
================================ */
function getValue(val) {
  return Array.isArray(val) ? val[0] : val;
}

function normalizeKey(text) {
  return text.toLowerCase().trim();
}

// tokenize TANPA menghapus spasi & kapital
function tokenize(text) {
  return text.match(/[\wÀ-ÿ']+|[^\w\s]/g) || [];
}

/* ===============================
   AUTO DETECT
================================ */
function detectDirection(words) {
  let id = 0, dy = 0;

  words.forEach(w => {
    const key = normalizeKey(w);
    if (kamusID.has(key)) id++;
    if (kamusDY.has(key)) dy++;
  });

  return dy > id ? 'dy-id' : 'id-dy';
}

/* ===============================
   TRANSLATE SENTENCE (FIXED)
================================ */
function translateSentence(sentence) {
  const tokens = tokenize(sentence);
  const wordsOnly = tokens.filter(t => /\w/.test(t));
  const direction = detectDirection(wordsOnly);

  const kamus = direction === 'id-dy' ? kamusID : kamusDY;

  const translated = tokens.map(token => {
    if (!/\w/.test(token)) return token;

    const key = normalizeKey(token);

    if (kamus.has(key)) {
      return getValue(kamus.get(key));
    }

    return `<span class="unknown">${token}</span>`;
  });

  return {
    direction,
    text: translated.join(' ')
  };
}

/* ===============================
   DEBOUNCE
================================ */
function debounce(fn, delay = 300) {
  return (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), delay);
  };
}

/* ===============================
   SUGGESTION
================================ */
function renderSuggestions(list) {
  suggestionsBox.innerHTML = '';
  list.slice(0, 5).forEach(({ id, dy }) => {
    const li = document.createElement('li');
    li.textContent = `${id} → ${dy}`;
    li.onclick = () => selectWord(id, dy);
    suggestionsBox.appendChild(li);
  });
}

function selectWord(id, dy) {
  input.value = id;
  resultBox.innerHTML = `<strong>${id}</strong> → ${dy}`;
  suggestionsBox.innerHTML = '';
}

/* ===============================
   SEARCH
================================ */
function searchWord() {
  const query = input.value;

  if (!query.trim()) {
    setDefaultMessage();
    suggestionsBox.innerHTML = '';
    return;
  }

  // MODE KALIMAT (AMAN SPASI & KAPITAL)
  if (query.includes(' ')) {
    const res = translateSentence(query);
    resultBox.innerHTML =
      `<strong>Terjemahan (${res.direction}):</strong><br>${res.text}`;
    suggestionsBox.innerHTML = '';
    return;
  }

  // MODE 1 KATA
  const q = normalizeKey(query);
  const suggestions = [];

  for (const [id, dy] of kamusID) {
    const dyVal = getValue(dy);
    if (id === q || dyVal === q) {
      selectWord(id, dyVal);
      return;
    }
    if (id.startsWith(q) || dyVal.startsWith(q)) {
      suggestions.push({ id, dy: dyVal });
    }
  }

  if (suggestions.length) {
    renderSuggestions(suggestions);
    resultBox.textContent = 'Pilih dari saran:';
  } else {
    resultBox.innerHTML =
      'Kata belum ada, tambahkan kata: ' +
      '<a href="https://wa.me/6285328736706" target="_blank" style="color:#1de9b6;font-weight:bold;">klik di sini</a>';
    suggestionsBox.innerHTML = '';
  }
}

/* ===============================
   EVENTS
================================ */
input.addEventListener('input', debounce(searchWord));
clearBtn.onclick = () => {
  input.value = '';
  searchWord();
  input.focus();
};
retryBtn.onclick = loadKamus;

loadKamus();

/* ===============================
   PWA (AMAN)
================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.style.display = 'block';
    installBtn.onclick = () => {
      deferredPrompt.prompt();
      installBtn.style.display = 'none';
      deferredPrompt = null;
    };
  }
});