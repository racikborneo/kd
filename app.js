const input = document.getElementById('wordInput');
const resultBox = document.getElementById('resultBox');
const suggestionsBox = document.getElementById('suggestionsBox');
const clearBtn = document.getElementById('clearButton');
const retryBtn = document.getElementById('retryButton');
const installBtn = document.getElementById('install-btn');
document.getElementById('year').textContent = new Date().getFullYear();

let kamusID = new Map();     // Indonesia -> Dayak
let kamusDY = new Map();     // Dayak -> Indonesia
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

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// pisahkan kata & tanda baca
function tokenize(text) {
  return text.match(/[\w']+|[.,!?]/g) || [];
}

/* ===============================
   AUTO DETECT DIRECTION
================================ */
function detectDirection(words) {
  let idScore = 0;
  let dyScore = 0;

  words.forEach(w => {
    if (kamusID.has(w)) idScore++;
    if (kamusDY.has(w)) dyScore++;
  });

  return dyScore > idScore ? 'dy-id' : 'id-dy';
}

/* ===============================
   TRANSLATE SENTENCE (ADVANCED)
================================ */
function translateSentence(sentence) {
  const tokens = tokenize(sentence);
  const wordsOnly = tokens.filter(t => /[\w']/.test(t));
  const direction = detectDirection(wordsOnly);

  const kamus = direction === 'id-dy' ? kamusID : kamusDY;

  let text = normalize(sentence);

  // 1️⃣ terjemah frasa (prioritas)
  const phrases = [...kamus.keys()]
    .filter(k => k.includes(' '))
    .sort((a, b) => b.length - a.length);

  phrases.forEach(p => {
    const regex = new RegExp(`\\b${p}\\b`, 'gi');
    text = text.replace(regex, getValue(kamus.get(p)));
  });

  // 2️⃣ per kata + highlight unknown
  const finalTokens = tokenize(text).map(tok => {
    const key = tok.toLowerCase();
    if (kamus.has(key)) {
      return getValue(kamus.get(key));
    }
    if (/[\w']/.test(tok)) {
      return `<span class="unknown">${tok}</span>`;
    }
    return tok;
  });

  return {
    direction,
    text: finalTokens.join(' ')
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
   SUGGESTION (1 KATA)
================================ */
function renderSuggestions(list) {
  suggestionsBox.innerHTML = '';
  const fragment = document.createDocumentFragment();

  list.slice(0, 5).forEach(({ id, dy }) => {
    const li = document.createElement('li');
    li.textContent = `${id} → ${dy}`;
    li.tabIndex = 0;
    li.onclick = () => selectWord(id, dy);
    fragment.appendChild(li);
  });

  suggestionsBox.appendChild(fragment);
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
  const query = input.value.trim();

  if (!query) {
    setDefaultMessage();
    suggestionsBox.innerHTML = '';
    return;
  }

  // 🔥 MODE KALIMAT
  if (query.includes(' ')) {
    const res = translateSentence(query);
    resultBox.innerHTML =
      `<strong>Terjemahan (${res.direction}):</strong><br>${res.text}`;
    suggestionsBox.innerHTML = '';
    return;
  }

  // MODE 1 KATA (LAMA)
  const q = query.toLowerCase();
  let found = false;
  const suggestions = [];

  for (const [id, dy] of kamusID) {
    const dyVal = getValue(dy);
    if (id === q) {
      selectWord(id, dyVal);
      found = true;
      break;
    }
    if (dyVal === q) {
      selectWord(dyVal, id);
      found = true;
      break;
    }
    if (id.startsWith(q) || dyVal.startsWith(q)) {
      suggestions.push({ id, dy: dyVal });
    }
  }

  if (!found) {
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
   PWA
================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (!standalone && installBtn) {
    installBtn.style.display = 'block';
    installBtn.onclick = () => {
      installBtn.style.display = 'none';
      deferredPrompt.prompt();
      deferredPrompt = null;
    };
  }
});

window.addEventListener('load', () => {
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  ) {
    if (installBtn) installBtn.style.display = 'none';
  }
});
