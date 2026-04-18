/* ════════════════════════════════════════════
   mediQ — index.js
   Theme toggle + QR Scanner logic
   ════════════════════════════════════════════ */

/* ─────────────────────── THEME TOGGLE */
function toggleTheme() {
  var html  = document.documentElement;
  var label = document.getElementById('theme-label');
  var isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) {
    html.setAttribute('data-theme', 'light');
    label.textContent = 'Dark Mode';
    localStorage.setItem('mediq-theme', 'light');
  } else {
    html.setAttribute('data-theme', 'dark');
    label.textContent = 'Light Mode';
    localStorage.setItem('mediq-theme', 'dark');
  }
}

/* Restore saved theme on page load */
(function () {
  var saved = localStorage.getItem('mediq-theme');
  var label = document.getElementById('theme-label');
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (label) label.textContent = 'Dark Mode';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (label) label.textContent = 'Light Mode';
  }
})();

/* ─────────────────────── QR SCANNER STATE */
var inlineScannerActive = false;
var modalScannerActive  = false;
var inlineHtml5QrCode   = null;
var modalHtml5QrCode    = null;

/* ─────────────────────── INLINE SCANNER */
function startScanner() {
  if (inlineScannerActive) return;
  document.getElementById('scanner-placeholder').style.display = 'none';
  document.getElementById('qr-reader').style.display = 'block';
  document.getElementById('scan-line').classList.add('visible');
  document.getElementById('btn-start').classList.add('hidden');
  document.getElementById('btn-stop').classList.remove('hidden');
  setStatus('scanning', 'Scanning...');

  inlineHtml5QrCode = new Html5Qrcode('qr-reader');
  inlineHtml5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    function (decodedText) { showInlineResult(decodedText); },
    function () {}
  ).then(function () {
    inlineScannerActive = true;
  }).catch(function () {
    resetInlineScanner();
    setStatus('off', 'Camera Error');
    showInlineError('Camera access denied or unavailable. Please use the Upload option below.');
  });
}

function stopScanner() {
  if (inlineHtml5QrCode && inlineScannerActive) {
    inlineHtml5QrCode.stop().then(function () {
      inlineScannerActive = false;
      resetInlineScanner();
      setStatus('off', 'Camera Off');
    }).catch(function () {
      inlineScannerActive = false;
      resetInlineScanner();
    });
  }
}

function resetInlineScanner() {
  document.getElementById('scanner-placeholder').style.display = 'flex';
  document.getElementById('qr-reader').style.display = 'none';
  document.getElementById('scan-line').classList.remove('visible');
  document.getElementById('btn-start').classList.remove('hidden');
  document.getElementById('btn-stop').classList.add('hidden');
}

function setStatus(state, text) {
  var dot = document.getElementById('status-dot');
  var txt = document.getElementById('status-text');
  dot.className = 'status-dot';
  if (state === 'scanning') dot.classList.add('scanning');
  if (state === 'active')   dot.classList.add('active');
  txt.textContent = text;
}

function showInlineResult(text) {
  stopScanner();
  setStatus('active', 'Code Detected!');
  var el      = document.getElementById('scan-result');
  var content = document.getElementById('result-content');
  var icon    = document.getElementById('result-icon');
  var title   = document.getElementById('result-title');
  el.className = 'scan-result';
  el.classList.remove('hidden');
  icon.textContent  = '✅';
  title.className   = 'result-title';
  title.textContent = 'QR Code Successfully Scanned!';
  var parsed = tryParse(text);
  var html = '';
  if (parsed && parsed.length) {
    html += '<div class="result-data">';
    parsed.forEach(function (pair) {
      html += '<div class="result-row"><span class="result-key">' + escHtml(pair[0]) + '</span><span class="result-val">' + escHtml(pair[1]) + '</span></div>';
    });
    html += '</div>';
  }
  html += '<div class="result-raw">' + escHtml(text) + '</div>';
  content.innerHTML = html;
}

function showInlineError(msg) {
  var el    = document.getElementById('scan-result');
  var icon  = document.getElementById('result-icon');
  var title = document.getElementById('result-title');
  var cont  = document.getElementById('result-content');
  el.className = 'scan-result error-result';
  el.classList.remove('hidden');
  icon.textContent  = '❌';
  title.className   = 'result-title error';
  title.textContent = 'Scan Failed';
  cont.innerHTML = '<div class="result-raw error">' + escHtml(msg) + '</div>';
}

/* ─────────────────────── FILE UPLOAD */
function scanFromFile(input, mode) {
  var file = input.files[0];
  if (!file) return;
  var tmpId = (mode === 'modal') ? 'modal-file-tmp' : 'inline-file-tmp';
  var tmp = document.getElementById(tmpId);
  if (!tmp) {
    tmp = document.createElement('div');
    tmp.id = tmpId;
    tmp.style.display = 'none';
    document.body.appendChild(tmp);
  }
  var sc = new Html5Qrcode(tmpId);
  sc.scanFile(file, true).then(function (text) {
    sc.clear();
    if (mode === 'modal') showModalResult(text);
    else                  showInlineResult(text);
  }).catch(function () {
    sc.clear();
    if (mode === 'modal') showModalResult(null);
    else showInlineError('Could not decode QR code. Please try a clearer image.');
  });
  input.value = '';
}

/* ─────────────────────── MODAL SCANNER */
function openQRModal() {
  document.getElementById('qr-modal').classList.add('open');
  document.getElementById('modal-result').classList.add('hidden');
  document.getElementById('modal-result-raw').textContent  = '';
  document.getElementById('modal-result-parsed').innerHTML = '';
  setTimeout(startModalScanner, 250);
}

function closeQRModal() {
  stopModalScanner();
  document.getElementById('qr-modal').classList.remove('open');
}

function startModalScanner() {
  if (modalScannerActive) return;
  modalHtml5QrCode = new Html5Qrcode('modal-qr-reader');
  modalHtml5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 200, height: 200 } },
    function (text) { showModalResult(text); },
    function () {}
  ).then(function () {
    modalScannerActive = true;
  }).catch(function () {
    modalScannerActive = false;
  });
}

function stopModalScanner() {
  if (modalHtml5QrCode && modalScannerActive) {
    modalHtml5QrCode.stop().catch(function () {});
    modalScannerActive = false;
  }
}

function showModalResult(text) {
  stopModalScanner();
  var el     = document.getElementById('modal-result');
  var lbl    = document.getElementById('modal-result-label');
  var raw    = document.getElementById('modal-result-raw');
  var parsed = document.getElementById('modal-result-parsed');
  el.classList.remove('hidden');
  if (!text) {
    lbl.textContent = '❌ Could Not Read QR Code';
    lbl.style.color = 'var(--red)';
    raw.textContent = 'Please try a clearer or better-lit image.';
    parsed.innerHTML = '';
    return;
  }
  lbl.textContent = '✅ QR Code Detected';
  lbl.style.color = 'var(--green)';
  raw.textContent = text;
  var pairs = tryParse(text);
  if (pairs && pairs.length) {
    parsed.innerHTML = pairs.map(function (p) {
      return '<div class="modal-result-row"><span class="modal-result-key">' + escHtml(p[0]) + '</span><span class="modal-result-val">' + escHtml(p[1]) + '</span></div>';
    }).join('');
  } else {
    parsed.innerHTML = '';
  }
}

/* Close on backdrop click */
document.getElementById('qr-modal').addEventListener('click', function (e) {
  if (e.target === this) closeQRModal();
});

/* ─────────────────────── PARSE QR DATA */
function tryParse(text) {
  try {
    var obj = JSON.parse(text);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.keys(obj).map(function (k) {
        var lbl = k.replace(/([A-Z])/g, ' $1').replace(/^./, function (s) { return s.toUpperCase(); });
        return [lbl, String(obj[k])];
      });
    }
  } catch (e) {}
  var lines = text.split(/[\n|]+/);
  if (lines.length > 1) {
    var pairs = [];
    lines.forEach(function (line) {
      var idx = line.indexOf(':');
      if (idx > 0) pairs.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    });
    if (pairs.length > 0) return pairs;
  }
  if (/^MQ-\d{4}/.test(text)) {
    return [['Medicine ID', text.split('|')[0].trim()], ['System', 'mediQ Database Entry']];
  }
  return null;
}

/* ─────────────────────── HTML ESCAPE */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─────────────────────── SCROLL REVEAL */
var revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry, i) {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeUp 0.5s ease ' + (i * 80) + 'ms both';
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card, .step, .info-card, .about-card').forEach(function (el) {
  el.style.opacity = '0';
  revealObserver.observe(el);
});

/* ─────────────────────── NAVBAR SHADOW ON SCROLL */
window.addEventListener('scroll', function () {
  var nav = document.getElementById('navbar');
  nav.style.boxShadow = window.scrollY > 20 ? '0 4px 30px rgba(0,0,0,0.15)' : 'none';
});

/* ════════════════════════════════════════════════════════
   MEDICINE SEARCH — Neon DB via api.js
   ════════════════════════════════════════════════════════

   This calls your Express api.js backend at /api/medicines
   which in turn queries the Neon PostgreSQL database.

   Make sure api.js is running: node api.js
   Then open: http://127.0.0.1:3000
   ════════════════════════════════════════════════════════ */

var API_BASE      = '/api';        // relative path — works when served by api.js on any port/host
var searchFilter  = 'all';          // current filter pill
var allMedicines  = [];             // local cache (fetched once on first search)
var cacheLoaded   = false;

/* ─────────────────────── HELPERS */
function medIsExpired(m)  { return m.expiryDate && new Date(m.expiryDate) < new Date(); }
function medIsExpSoon(m)  { var d = (new Date(m.expiryDate) - new Date()) / 86400000; return d >= 0 && d <= 90; }
function medIsLow(m)      { return Number(m.quantity) <= Number(m.reorderLevel || 0); }
function medStatus(m) {
  if (medIsExpired(m))       return 'expired';
  if (medIsExpSoon(m))       return 'expiring';
  return 'ok';
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtINR(n)  { return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }); }

/* ─────────────────────── FETCH ALL FROM DB (cached) */
async function fetchAllMedicines() {
  if (cacheLoaded) return allMedicines;
  var res = await fetch(API_BASE + '/medicines');
  if (!res.ok) throw new Error('API error ' + res.status + '. Is api.js running?');
  allMedicines = await res.json();
  cacheLoaded  = true;
  return allMedicines;
}

/* ─────────────────────── FILTER LOGIC */
function setSearchFilter(btn, filter) {
  document.querySelectorAll('.filter-pill').forEach(function(p) { p.classList.remove('active'); });
  btn.classList.add('active');
  searchFilter = filter;
}

/* ─────────────────────── SEARCH IMPLEMENTATION */
function filterMedicines(query, meds) {
  var q = query.toLowerCase().trim();
  if (!q) return meds;

  return meds.filter(function(m) {
    switch (searchFilter) {
      case 'name':
        return m.name && m.name.toLowerCase().includes(q);
      case 'id':
        return m.id && m.id.toLowerCase().includes(q);
      case 'category':
        return m.category && m.category.toLowerCase().includes(q);
      case 'manufacturer':
        return m.manufacturer && m.manufacturer.toLowerCase().includes(q);
      default: // 'all'
        return (
          (m.name         && m.name.toLowerCase().includes(q))         ||
          (m.id           && m.id.toLowerCase().includes(q))           ||
          (m.category     && m.category.toLowerCase().includes(q))     ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(q)) ||
          (m.batchNumber  && m.batchNumber.toLowerCase().includes(q))
        );
    }
  });
}

/* ─────────────────────── UI HELPERS */
function setSearchLoading(on) {
  document.getElementById('search-state').style.display   = on ? 'none' : '';
  document.getElementById('search-loading').classList.toggle('hidden', !on);
}

function showSearchState(icon, title, sub) {
  var el = document.getElementById('search-state');
  el.style.display = '';
  el.innerHTML = '<div class="search-idle-icon">' + icon + '</div>' +
    '<div class="search-idle-title">' + escHtml(title) + '</div>' +
    '<div class="search-idle-sub">' + sub + '</div>';
}

function showSearchError(msg) {
  document.getElementById('search-loading').classList.add('hidden');
  document.getElementById('search-results-grid').classList.add('hidden');
  document.getElementById('search-detail-card').classList.add('hidden');
  var el = document.getElementById('search-state');
  el.style.display = '';
  el.innerHTML =
    '<div class="search-error-icon">⚠️</div>' +
    '<div class="search-error-title">Connection Error</div>' +
    '<div class="search-error-msg">' + escHtml(msg) +
    '<br><br>Check that <strong>DATABASE_URL</strong> is set in your Vercel Environment Variables.</div>';
}

/* ─────────────────────── RESULT CARD HTML */
function buildResultCard(m, index) {
  var st  = medStatus(m);
  var low = medIsLow(m);
  var stLbl = st === 'expired' ? 'EXPIRED' : st === 'expiring' ? 'EXPIRING SOON' : 'OK';
  return '<div class="result-med-card" onclick="showDetail(\'' + m.id + '\')" ' +
    'style="animation:fadeUp .3s ' + (index * 60) + 'ms ease both">' +
    '<div class="rmc-id">' + escHtml(m.id) + '</div>' +
    '<div class="rmc-name">' + escHtml(m.name) + '</div>' +
    '<div class="rmc-mfr">' + escHtml(m.manufacturer || '—') + '</div>' +
    '<div class="rmc-pills">' +
      '<span class="rmc-pill">' + escHtml(m.category || '—') + '</span>' +
      '<span class="rmc-pill">' + escHtml(m.unit || '') + '</span>' +
    '</div>' +
    '<div class="rmc-bottom">' +
      '<span class="rmc-qty">Qty: ' + (m.quantity || 0) + '</span>' +
      '<span class="rmc-status ' + st + '">' + stLbl + (low && st === 'ok' ? ' · LOW STOCK' : '') + '</span>' +
    '</div>' +
    '</div>';
}

/* ─────────────────────── SHOW DETAIL CARD */
function showDetail(id) {
  var m = allMedicines.find(function(x) { return x.id === id; });
  if (!m) return;

  var st  = medStatus(m);
  var low = medIsLow(m);
  var stLbl = st === 'expired' ? 'EXPIRED' : st === 'expiring' ? 'EXPIRING SOON' : '';

  var badges = '';
  if (st !== 'ok') badges += '<span class="sdc-badge ' + st + '">' + stLbl + '</span>';
  if (low)         badges += '<span class="sdc-badge low">LOW STOCK</span>';

  var dateClass = st === 'expired' ? 'expired' : st === 'expiring' ? 'expiring' : 'ok';

  var html =
    '<div class="sdc-head">' +
      '<div class="sdc-head-left">' +
        '<div class="sdc-id-badge">' + escHtml(m.id) + '</div>' +
        '<div class="sdc-name">' + escHtml(m.name) + '</div>' +
        '<div class="sdc-cat">' + escHtml(m.category || '—') + ' · ' + escHtml(m.unit || '') + '</div>' +
        (badges ? '<div class="sdc-badges">' + badges + '</div>' : '') +
      '</div>' +
      '<button class="sdc-close-btn" onclick="closeDetail()" title="Close">✕</button>' +
    '</div>' +

    '<div class="sdc-body">' +
      '<div class="sdc-grid">' +

        // Col 1 — Basic info
        '<div class="sdc-section">' +
          '<div class="sdc-section-title">Basic Info</div>' +
          sdcRow('Manufacturer',   m.manufacturer) +
          sdcRow('Batch No.',      m.batchNumber) +
          sdcRow('Supplier',       m.supplier) +
          sdcRow('Location',       m.location) +
        '</div>' +

        // Col 2 — Dates
        '<div class="sdc-section">' +
          '<div class="sdc-section-title">Dates</div>' +
          sdcRow('Registered',     fmtDate(m.registeredDate)) +
          sdcRow('Manufactured',   fmtDate(m.manufactureDate)) +
          '<div class="sdc-row"><span class="sdc-key">Expiry Date</span>' +
            '<span class="sdc-val ' + dateClass + '">' + fmtDate(m.expiryDate) + '</span></div>' +
        '</div>' +

        // Col 3 — Stock
        '<div class="sdc-section">' +
          '<div class="sdc-section-title">Stock</div>' +
          '<div class="sdc-row"><span class="sdc-key">Quantity</span>' +
            '<span class="sdc-val ' + (low ? 'low' : '') + '">' + (m.quantity || 0) + ' ' + escHtml(m.unit || '') + '</span></div>' +
          sdcRow('Reorder Level', (m.reorderLevel || 0) + ' ' + (m.unit || '')) +
        '</div>' +

        // Col 4 — Pricing
        '<div class="sdc-section">' +
          '<div class="sdc-section-title">Pricing</div>' +
          sdcRow('Purchase Price', fmtINR(m.purchasePrice)) +
          sdcRow('Selling Price',  fmtINR(m.sellingPrice)) +
        '</div>' +

      '</div>' +

      (m.description ?
        '<div class="sdc-desc">' +
          '<div class="sdc-desc-label">Description / Usage</div>' +
          escHtml(m.description) +
        '</div>' : '') +

    '</div>';

  var card = document.getElementById('search-detail-card');
  card.innerHTML = html;
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function sdcRow(label, val) {
  return '<div class="sdc-row"><span class="sdc-key">' + escHtml(label) +
    '</span><span class="sdc-val">' + escHtml(String(val || '—')) + '</span></div>';
}

function closeDetail() {
  document.getElementById('search-detail-card').classList.add('hidden');
}

/* ─────────────────────── MAIN SEARCH (big section) */
async function mainSearch() {
  var query = document.getElementById('main-search-input').value.trim();
  if (!query) {
    showSearchState('💊', 'Enter a Search Term', 'Type a medicine name or ID to search');
    return;
  }

  // Show clear button
  document.getElementById('search-clear-btn').classList.remove('hidden');

  // Reset UI
  document.getElementById('search-state').style.display        = 'none';
  document.getElementById('search-loading').classList.remove('hidden');
  document.getElementById('search-results-grid').classList.add('hidden');
  document.getElementById('search-detail-card').classList.add('hidden');

  try {
    var meds    = await fetchAllMedicines();
    var results = filterMedicines(query, meds);

    document.getElementById('search-loading').classList.add('hidden');

    if (!results.length) {
      showSearchState('🔍',
        'No results for "' + query + '"',
        'Try a different name, ID, or filter. Check spelling and try again.'
      );
      return;
    }

    // Results meta
    var grid = document.getElementById('search-results-grid');
    var metaHtml = '<div class="search-result-meta" style="margin-bottom:0;padding:14px 8px 4px;">' +
      'Found <strong>' + results.length + '</strong> result' + (results.length > 1 ? 's' : '') +
      ' for "<strong>' + escHtml(query) + '</strong>"' +
      '</div>';

    grid.innerHTML = metaHtml + results.map(buildResultCard).join('');
    grid.classList.remove('hidden');
    grid.style.display = '';

  } catch (err) {
    showSearchError(err.message);
  }
}

function clearMainSearch() {
  document.getElementById('main-search-input').value = '';
  document.getElementById('search-clear-btn').classList.add('hidden');
  document.getElementById('search-results-grid').classList.add('hidden');
  document.getElementById('search-detail-card').classList.add('hidden');
  showSearchState('🔍', 'Search the Medicine Database',
    'Type a medicine name or ID above and press <strong>Search</strong> or hit Enter');
  document.getElementById('main-search-input').focus();
  document.getElementById('search-state').style.display = '';
}

/* ─────────────────────── HERO SEARCH (scrolls to section + fires search) */
function heroSearch() {
  var query = document.getElementById('hero-search-input').value.trim();
  if (!query) return;
  // Copy to main search input and trigger
  document.getElementById('main-search-input').value = query;
  document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
  // Small delay so scroll starts first
  setTimeout(mainSearch, 350);
}

/* ─────────────────────── NAVBAR LIVE SEARCH (dropdown) */
var navSearchTimer = null;

function navSearchLive(val) {
  clearTimeout(navSearchTimer);
  var q = val.trim();
  var resultsEl = document.getElementById('nav-search-results');

  if (!q) { resultsEl.classList.remove('open'); return; }

  navSearchTimer = setTimeout(async function() {
    try {
      var meds    = await fetchAllMedicines();
      var results = filterMedicines(q, meds).slice(0, 6);
      renderNavResults(results, q);
    } catch (e) {
      resultsEl.innerHTML = '<div class="nav-no-result">⚠️ Server offline</div>';
      resultsEl.classList.add('open');
    }
  }, 280);
}

function renderNavResults(results, query) {
  var el = document.getElementById('nav-search-results');
  if (!results.length) {
    el.innerHTML = '<div class="nav-no-result">No results for "' + escHtml(query) + '"</div>';
  } else {
    el.innerHTML = results.map(function(m) {
      var st = medStatus(m);
      var stLbl = st === 'expired' ? 'EXPIRED' : st === 'expiring' ? 'SOON' : 'OK';
      return '<div class="nav-result-item" onclick="navOpenMedicine(\'' + m.id + '\')">' +
        '<span class="nav-result-id">' + escHtml(m.id) + '</span>' +
        '<div style="min-width:0;">' +
          '<div class="nav-result-name">' + escHtml(m.name) + '</div>' +
          '<div class="nav-result-cat">'  + escHtml(m.category || '') + '</div>' +
        '</div>' +
        '<span class="nav-result-badge ' + st + '">' + stLbl + '</span>' +
        '</div>';
    }).join('');
  }
  el.classList.add('open');
}

function navSearch() {
  var q = document.getElementById('nav-search-input').value.trim();
  if (!q) return;
  document.getElementById('nav-search-results').classList.remove('open');
  document.getElementById('main-search-input').value = q;
  document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
  setTimeout(mainSearch, 350);
}

function navOpenMedicine(id) {
  document.getElementById('nav-search-results').classList.remove('open');
  document.getElementById('nav-search-input').value = '';
  document.getElementById('main-search-input').value = id;
  document.getElementById('search-section').scrollIntoView({ behavior: 'smooth' });
  setTimeout(mainSearch, 350);
}

// Close nav dropdown when clicking outside
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('nav-search-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('nav-search-results').classList.remove('open');
  }
});