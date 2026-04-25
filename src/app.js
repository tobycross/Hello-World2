/* ============================================================
   Devon Webcam Intelligence Platform — Main Application
   ============================================================ */

/* ── State ─────────────────────────────────────────────────── */
let map, leafletMarkers = {}, selId = null;
let activeFilter = 'all', searchQ = '';
let refreshTimers = {};
let currentTab = 'props';

/* ── Marker SVG factory ─────────────────────────────────────── */
function markerSVG(wc, active) {
  const c = active ? '#e87722' : (CAT_META[wc.cat]?.color || '#1a6fe8');
  const glowId = `g-${wc.id}`;
  return `
  <svg width="38" height="44" viewBox="0 0 38 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="${glowId}" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="${active ? 2.5 : 1.5}" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <ellipse cx="19" cy="42" rx="5" ry="1.8" fill="rgba(0,0,0,.35)"/>
    <path d="M19 2.5C12.1 2.5 6.5 8.1 6.5 15c0 9.5 12.5 26.5 12.5 26.5S31.5 24.5 31.5 15C31.5 8.1 25.9 2.5 19 2.5z"
          fill="${c}" filter="url(#${glowId})" opacity="${active ? 1 : 0.85}"/>
    <circle cx="19" cy="15" r="8" fill="rgba(0,0,0,.38)"/>
    <circle cx="19" cy="15" r="5" fill="none" stroke="${c}" stroke-width="1.5" opacity=".7"/>
    <circle cx="19" cy="15" r="2" fill="white" opacity=".9"/>
    ${active ? `<circle cx="19" cy="15" r="11" fill="none" stroke="${c}" stroke-width="1"
      stroke-dasharray="3 2" opacity=".5"/>` : ''}
  </svg>`;
}

function makeIcon(wc, active = false) {
  return L.divIcon({
    html: markerSVG(wc, active),
    iconSize: [38, 44],
    iconAnchor: [19, 44],
    popupAnchor: [0, -46],
    className: ''
  });
}

/* ── Map init ───────────────────────────────────────────────── */
function initMap() {
  map = L.map('map', {
    center: [50.85, -3.85],
    zoom: 9,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  map.on('mousemove', e => {
    qs('#coord-lat').textContent = e.latlng.lat.toFixed(4) + '° N';
    qs('#coord-lng').textContent = Math.abs(e.latlng.lng).toFixed(4) + '° W';
  });

  WEBCAMS.forEach(addMarker);
  updateStatusBar();
}

/* ── Add single marker ──────────────────────────────────────── */
function addMarker(wc) {
  const m = L.marker([wc.lat, wc.lng], { icon: makeIcon(wc), title: wc.name });

  const catColor = CAT_META[wc.cat]?.color || '#1a6fe8';
  m.bindPopup(L.popup({ closeButton: false, maxWidth: 220 }).setContent(`
    <div>
      <div style="font:400 9px/1 var(--mono,'JetBrains Mono',monospace);color:${catColor};text-transform:uppercase;letter-spacing:.09em;margin-bottom:5px">${wc.id} · ${wc.cat}</div>
      <div style="font:600 13px/1.3 var(--font,'Inter',sans-serif);color:#eef2fc;margin-bottom:4px">${wc.name}</div>
      <div style="font:400 10px/1 var(--mono,'JetBrains Mono',monospace);color:#3d4f6e">${wc.lat.toFixed(4)}°N  ${Math.abs(wc.lng).toFixed(4)}°W</div>
    </div>
  `));

  m.on('click',     () => selectWebcam(wc.id));
  m.on('mouseover', () => { if (selId !== wc.id) m.openPopup(); });
  m.on('mouseout',  () => { if (selId !== wc.id) m.closePopup(); });

  m.addTo(map);
  leafletMarkers[wc.id] = m;
}

/* ── Select webcam ──────────────────────────────────────────── */
function selectWebcam(id) {
  const wc = WEBCAMS.find(w => w.id === id);
  if (!wc) return;

  if (selId && leafletMarkers[selId]) {
    const prev = WEBCAMS.find(w => w.id === selId);
    if (prev) leafletMarkers[selId].setIcon(makeIcon(prev, false));
  }
  selId = id;
  leafletMarkers[id]?.setIcon(makeIcon(wc, true));
  leafletMarkers[id]?.closePopup();

  qsa('.obj-item').forEach(el => el.classList.toggle('sel', el.dataset.id === id));

  map.panTo([wc.lat, wc.lng], { animate: true, duration: 0.6 });
  renderDetail(wc);
}

/* ── Render detail panel ────────────────────────────────────── */
function renderDetail(wc) {
  qs('#panel-right').classList.add('has-sel');

  qs('#det-type').textContent  = `WEBCAM_ASSET · ${wc.cat}`;
  qs('#det-name').textContent  = wc.name;
  qs('#det-coords').textContent = `${wc.lat.toFixed(5)}°N  ${Math.abs(wc.lng).toFixed(5)}°W`;

  /* Properties */
  qs('#p-status').innerHTML   = `<span class="sbadge live">${wc.status}</span>`;
  qs('#p-cat').textContent    = `${wc.cat} / ${wc.sub}`;
  qs('#p-res').textContent    = wc.resolution;
  qs('#p-bearing').textContent= wc.bearing;
  qs('#p-feed').textContent   = wc.feedType.toUpperCase();
  qs('#p-lat').textContent    = wc.lat.toFixed(6) + '° N';
  qs('#p-lng').textContent    = Math.abs(wc.lng).toFixed(6) + '° W';
  qs('#p-conf').style.width   = wc.confidence + '%';
  qs('#p-conf-val').textContent = wc.confidence + '%';

  const srcLink = qs('#p-srclink');
  srcLink.href = wc.pageUrl;
  srcLink.textContent = '↗ Open webcam source page';

  /* Feed */
  loadFeed(wc);

  /* Async tabs */
  loadWiki(wc);
  loadOSM(wc);

  switchTab('props');
}

/* ── Feed loader ────────────────────────────────────────────── */
function loadFeed(wc) {
  Object.values(refreshTimers).forEach(t => clearInterval(t));
  refreshTimers = {};

  const box = qs('#feed-content');
  qs('#feed-lbl').textContent = wc.feedType === 'iframe' ? 'EMBEDDED SOURCE' : `LIVE IMAGE · ${wc.resolution}`;

  if (wc.feedType === 'image') {
    const imgId = `fi-${Date.now()}`;
    const fbId  = `fb-${Date.now()}`;
    box.innerHTML = `
      <img id="${imgId}" src="${wc.imageUrl}?_t=${Date.now()}" class="feed-img" alt="${wc.name} live feed"
           onerror="document.getElementById('${imgId}').style.display='none';document.getElementById('${fbId}').style.display='flex'">
      <div id="${fbId}" class="feed-fallback" style="display:none">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
        </svg>
        <span>Live image unavailable</span>
        <a href="${wc.pageUrl}" target="_blank" rel="noopener">↗ View on source website</a>
      </div>`;

    if (wc.refreshMs) {
      refreshTimers[wc.id] = setInterval(() => {
        const img = qs(`#${imgId}`);
        if (img) img.src = wc.imageUrl + '?_t=' + Date.now();
      }, wc.refreshMs);
    }
  } else {
    box.innerHTML = `
      <div class="feed-iframe-box">
        <iframe src="${wc.embedUrl || wc.pageUrl}"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerpolicy="no-referrer"
          allow="autoplay"
          title="${wc.name} webcam"
          loading="lazy">
        </iframe>
      </div>`;
  }
}

/* ── Wikipedia intelligence ─────────────────────────────────── */
async function loadWiki(wc) {
  const container = qs('#wiki-content');
  container.innerHTML = `<div class="async-loading"><div class="spinner"></div>Loading intelligence data…</div>`;

  try {
    const res  = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wc.wikiTitle)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`,
      { signal: AbortSignal.timeout(9000) }
    );
    const data = await res.json();
    const page = Object.values(data.query?.pages || {})[0];

    if (!page || page.missing) throw new Error('missing');

    const paras = (page.extract || '')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 30)
      .slice(0, 4);

    container.innerHTML = `
      <div class="intel-body">
        ${paras.map(p => `<p>${escHtml(p)}</p>`).join('')}
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-0)">
        <a class="ext-link" href="https://en.wikipedia.org/wiki/${encodeURIComponent(wc.wikiTitle)}" target="_blank" rel="noopener">
          ↗ Full article: ${escHtml(wc.wikiTitle)}
        </a>
      </div>`;
  } catch {
    container.innerHTML = `<div class="async-err">
      Intel data unavailable.
      <a class="ext-link" href="https://en.wikipedia.org/wiki/${encodeURIComponent(wc.wikiTitle)}" target="_blank" rel="noopener">Open Wikipedia ↗</a>
    </div>`;
  }
}

/* ── Overpass / OSM data ────────────────────────────────────── */
async function loadOSM(wc) {
  qs('#osm-loader').style.display = 'flex';
  qs('#osm-content').innerHTML = '';

  try {
    const r    = 1200;
    const body = `[out:json][timeout:12];
(
  node["amenity"](around:${r},${wc.osmLat},${wc.osmLng});
  node["tourism"](around:${r},${wc.osmLat},${wc.osmLng});
  node["historic"](around:${r},${wc.osmLat},${wc.osmLng});
  node["natural"](around:${r},${wc.osmLat},${wc.osmLng});
  node["leisure"](around:${r},${wc.osmLat},${wc.osmLng});
  way["name"]["highway"](around:${r},${wc.osmLat},${wc.osmLng});
);
out body qt 30;`;

    const res  = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(body),
      signal: AbortSignal.timeout(14000)
    });
    const data = await res.json();
    qs('#osm-loader').style.display = 'none';

    const els = (data.elements || []).filter(e => e.tags?.name || e.tags?.amenity || e.tags?.tourism);
    if (!els.length) {
      qs('#osm-content').innerHTML = '<div class="async-err">No named features found within 1.2 km.</div>';
      return;
    }

    const groups = {};
    const priority = ['tourism','historic','natural','leisure','amenity','highway'];
    els.forEach(el => {
      const t = el.tags || {};
      const key = priority.find(k => t[k]) || 'other';
      (groups[key] = groups[key] || []).push({ name: t.name, type: t[key], key });
    });

    const keyLabels = { amenity:'Amenities', tourism:'Tourism', historic:'Historic', natural:'Natural', leisure:'Leisure', highway:'Roads', other:'Other' };
    let html = '';
    for (const [key, items] of Object.entries(groups).slice(0, 6)) {
      html += `<div class="sec-div">${keyLabels[key] || key}</div>`;
      items.slice(0, 5).forEach(i => {
        html += `<div class="osm-card">
          <div class="osm-card-name">${escHtml(i.name || '—')}</div>
          <div class="osm-card-type">${escHtml(i.type || '')}</div>
        </div>`;
      });
    }

    html += `<div style="margin-top:14px">
      <div class="sec-div">Data Sources</div>
      <div style="margin-bottom:8px">
        <span class="osm-tag">OpenStreetMap</span>
        <span class="osm-tag">Overpass API</span>
        <span class="osm-tag">r=1.2km</span>
        <span class="osm-tag">${els.length} features</span>
      </div>
      <a class="ext-link" href="https://www.openstreetmap.org/#map=15/${wc.osmLat}/${wc.osmLng}" target="_blank" rel="noopener">
        ↗ Open in OpenStreetMap
      </a>
    </div>`;

    qs('#osm-content').innerHTML = html;
  } catch {
    qs('#osm-loader').style.display = 'none';
    qs('#osm-content').innerHTML = `<div class="async-err">
      OSM query failed.
      <a class="ext-link" href="https://www.openstreetmap.org/#map=15/${wc.osmLat}/${wc.osmLng}" target="_blank" rel="noopener">View on OSM ↗</a>
    </div>`;
  }
}

/* ── Object list ────────────────────────────────────────────── */
function renderList() {
  let items = WEBCAMS;

  if (activeFilter !== 'all') items = items.filter(w => w.cat === activeFilter);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    items = items.filter(w =>
      w.name.toLowerCase().includes(q) ||
      w.sub.toLowerCase().includes(q) ||
      w.desc.toLowerCase().includes(q)
    );
  }

  qs('#obj-count').textContent = items.length + ' object' + (items.length !== 1 ? 's' : '');

  qs('#obj-list').innerHTML = items.map(wc => {
    const cat = wc.cat.toLowerCase();
    return `<div class="obj-item ${selId === wc.id ? 'sel' : ''}" data-id="${wc.id}" onclick="selectWebcam('${wc.id}')">
      <div class="obj-item-row1">
        <div class="obj-icon ${cat}">${CAT_META[wc.cat]?.icon || '📷'}</div>
        <div class="obj-name">${escHtml(wc.name)}</div>
      </div>
      <div class="obj-item-row2">
        <div class="status-dot live"></div>
        <div class="obj-sub">${wc.lat.toFixed(3)}°N  ${Math.abs(wc.lng).toFixed(3)}°W · ${wc.sub}</div>
      </div>
    </div>`;
  }).join('');

  /* sync map marker visibility */
  const visIds = new Set(items.map(w => w.id));
  WEBCAMS.forEach(wc => {
    const m = leafletMarkers[wc.id];
    if (!m) return;
    if (visIds.has(wc.id)) { if (!map.hasLayer(m)) m.addTo(map); }
    else                   { if (map.hasLayer(m))  map.removeLayer(m); }
  });
}

/* ── Tab switch ─────────────────────────────────────────────── */
function switchTab(name) {
  currentTab = name;
  qsa('.det-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  qsa('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
}

/* ── Status bar clock ───────────────────────────────────────── */
function updateStatusBar() {
  const live = WEBCAMS.filter(w => w.status === 'LIVE').length;
  qs('#sb-live').textContent   = `● ${live} live feeds`;
  qs('#tb-feeds').textContent  = live + ' feeds active';
}

function tickClock() {
  const now = new Date();
  const utc = now.toISOString().replace('T', '  ').slice(0, 19) + ' UTC';
  const el = qs('#sb-time');
  if (el) el.textContent = utc;
}

/* ── Utilities ──────────────────────────────────────────────── */
function qs(sel)       { return document.querySelector(sel); }
function qsa(sel)      { return document.querySelectorAll(sel); }
function escHtml(s)    {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Boot ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  renderList();
  tickClock();
  setInterval(tickClock, 1000);

  /* Search */
  qs('#search').addEventListener('input', e => {
    searchQ = e.target.value.trim();
    renderList();
  });

  /* Filter buttons */
  qsa('.tb-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.tb-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderList();
    });
  });

  /* Tabs */
  qsa('.det-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
});
