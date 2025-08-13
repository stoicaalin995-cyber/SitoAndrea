// Basic interactivity: nav toggle, load artworks, filters, reveal animations, contact form mock.

const state = {
  artworks: [],
  filtered: [],
  visibleCount: 0,
  pageSize: 9,
  currentFilter: 'all'
};

async function loadArtworks() {
  try {
    if (location.protocol === 'file:') {
      // Fallback diretto: usa le card statiche senza fetch
      ingestStaticCards();
      console.warn('Esecuzione locale file:// – uso solo card statiche. Avvia un server per caricare il JSON.');
      applyFilter('all');
      return;
    }
    const url = 'assets/data/artworks.json?cb=' + Date.now(); // cache busting
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    state.artworks = await res.json();
    ingestStaticCards(); // unisce eventuali statiche
    console.log('Artworks caricati (totale):', state.artworks.length);
    applyFilter('all');
  } catch (e) {
    console.error('Errore caricamento artworks', e);
    // Fallback: prova a usare le card statiche
    ingestStaticCards();
    if (state.artworks.length) {
      console.log('Uso fallback statico, opere:', state.artworks.length);
      applyFilter('all');
    } else {
      const grid = document.getElementById('artGrid');
      if (grid) grid.innerHTML = '<p style="padding:1rem;font-size:.85rem;color:#c54124;">Impossibile caricare le opere e nessun fallback trovato.</p>';
    }
  }
}

function ingestStaticCards() {
  const staticCards = document.querySelectorAll('#artGrid .art-card[data-static]');
  staticCards.forEach(card => {
    const art = {
      id: card.getAttribute('data-id'),
      title: card.querySelector('h4')?.textContent || '',
      collection: card.getAttribute('data-collection') || 'misc',
      year: card.getAttribute('data-year') || '',
      technique: card.getAttribute('data-technique') || '',
      size: '',
      availability: 'available',
      priceEUR: null,
      cover: card.getAttribute('data-cover'),
      tags: [card.getAttribute('data-collection') || 'misc'],
      story: ''
    };
    if (!state.artworks.find(a => a.id === art.id)) state.artworks.push(art);
  });
}

function renderMore() { return; }

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'art-card';
  card.setAttribute('data-reveal','');
  card.innerHTML = `
    <figure>
      <img src="assets/img/${item.cover}" alt="${item.title}" loading="lazy" width="400" height="560" />
      ${item.availability === 'available' ? '<span class="badge">Disponibile</span>' : ''}
      <div class="overlay"><span>${item.year} • ${item.technique}</span></div>
    </figure>
    <div class="meta">
      <h4>${item.title}</h4>
      <div class="tags">${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    </div>`;
  card.addEventListener('click', () => openArtworkModal(item));
  return card;
}

function applyFilter(key) {
  state.currentFilter = key;
  const cinemaSection = document.getElementById('cinema');
  const polaroidSection = document.getElementById('polaroid');
  const gridEl = document.getElementById('artGrid');
  const isDedicated = (k) => k === 'cinema' || k === 'polaroid';
  if (key === 'all') {
    // Mostra entrambe le sezioni speciali e nasconde la griglia
    gridEl.style.display = 'none';
    cinemaSection?.classList.add('active');
    polaroidSection?.classList.add('active');
  } else if (isDedicated(key)) {
    gridEl.style.display = 'none';
    cinemaSection?.classList.toggle('active', key === 'cinema');
    polaroidSection?.classList.toggle('active', key === 'polaroid');
  } else {
    // Ritorna alla griglia dinamica normale
    gridEl.style.display = '';
    cinemaSection?.classList.remove('active');
    polaroidSection?.classList.remove('active');
  }
  state.filtered = key === 'all' ? [...state.artworks] : state.artworks.filter(a => a.collection === key);
  state.visibleCount = state.filtered.length;
  if (gridEl && gridEl.style.display !== 'none') {
    gridEl.innerHTML = '';
    state.filtered.forEach(item => gridEl.appendChild(createCard(item)));
  }
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('is-active', btn.dataset.filter === key));
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });
}

/* Navigation toggle */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const list = document.getElementById('navMenu');
  if (!toggle || !list) return;
  toggle.addEventListener('click', () => {
    const open = list.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  list.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    list.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

/* Scroll reveal */
function observeReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
}

/* Modal for artwork */
function buildModal() {
  const modal = document.createElement('div');
  modal.id = 'artModal';
  modal.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <button class="modal-close" aria-label="Chiudi" data-close>&times;</button>
      <div class="modal-content"></div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openArtworkModal(item) {
  let modal = document.getElementById('artModal');
  if (!modal) buildModal();
  modal = document.getElementById('artModal');
  const box = modal.querySelector('.modal-content');
  box.innerHTML = `
    <div class="modal-media">
      <img src="assets/img/${item.cover}" alt="${item.title}" />
    </div>
    <div class="modal-info">
      <h4 id="modalTitle">${item.title}</h4>
      <p class="modal-meta">${item.year} • ${item.technique} • ${item.size}</p>
      <p class="modal-story">${item.story}</p>
      <button class="btn primary" onclick="requestCommission('${item.id}')">Richiedi info</button>
    </div>`;
  document.body.style.overflow = 'hidden';
  modal.classList.add('open');
  setTimeout(() => modal.querySelector('.modal').classList.add('in'), 10);
}

function closeModal() {
  const modal = document.getElementById('artModal');
  if (!modal) return;
  modal.querySelector('.modal').classList.remove('in');
  setTimeout(() => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }, 250);
}

window.requestCommission = function(id) {
  const form = document.querySelector('.contact-form');
  if (form) {
    const msg = document.getElementById('messaggio');
    msg.value = `Richiesta informazioni per opera: ${id}`;
    msg.focus();
    document.getElementById('contactTitle').scrollIntoView({ behavior: 'smooth' });
    closeModal();
  }
};

/* Contact form mailto submit */
function initForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('nome')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const msg = document.getElementById('messaggio')?.value.trim() || '';

    // Basic front-end check
    if (!name || !email || !msg) {
      const status = form.querySelector('.form-status');
      if (status) status.textContent = 'Compila tutti i campi.';
      return;
    }

    const subject = encodeURIComponent(`Contatto dal sito CRART_AC – ${name}`);
    const body = encodeURIComponent(`Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${msg}`);
    const mailto = `mailto:andrea.cr790@gmail.com?subject=${subject}&body=${body}`;

    // Open default mail client with prefilled content
    window.location.href = mailto;
  });
}

/* Prefers reduced motion */
function respectReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) {
    document.documentElement.classList.add('reduced-motion');
  }
}

function buildCinemaModal() {
  if (document.getElementById('cinemaModal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'cinemaModal';
  wrap.innerHTML = `
    <div class="cm-backdrop" data-cm-close></div>
    <div class="cm-dialog" role="dialog" aria-modal="true" aria-label="Dettaglio opera cinema">
      <button class="cm-close" aria-label="Chiudi" data-cm-close>&times;</button>
      <div class="cm-media"><img src="" alt="Opera cinema" /></div>
      <div class="cm-info">
        <h4 class="cm-title"></h4>
        <p class="cm-tech"></p>
        <p class="cm-size"></p>
        <p class="cm-price"></p>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e => { if (e.target.hasAttribute('data-cm-close')) closeCinemaModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape') closeCinemaModal(); });
}
function openCinemaModal(data) {
  buildCinemaModal();
  const m = document.getElementById('cinemaModal');
  m.querySelector('.cm-media img').src = data.img;
  m.querySelector('.cm-media img').alt = data.title;
  m.querySelector('.cm-title').textContent = data.title;
  m.querySelector('.cm-tech').textContent = data.technique;
  m.querySelector('.cm-size').textContent = data.size;
  const lang = document.documentElement.lang || 'it';
  const soldLabel = lang === 'en' ? 'SOLD' : 'VENDUTO';
  const availLabel = lang === 'en' ? 'AVAILABLE' : 'DISPONIBILE';
  const priceHTML = `${data.price} € <span class="status ${data.status}">= ${data.status === 'sold' ? soldLabel : availLabel}</span>`;
  m.querySelector('.cm-price').innerHTML = priceHTML;
  document.body.style.overflow='hidden';
  m.classList.add('open');
  requestAnimationFrame(()=> m.querySelector('.cm-dialog').classList.add('in'));
}
function closeCinemaModal() {
  const m = document.getElementById('cinemaModal');
  if(!m) return;
  m.querySelector('.cm-dialog').classList.remove('in');
  setTimeout(()=>{ m.classList.remove('open'); document.body.style.overflow=''; },230);
}
function initCinemaDetails() {
  const details = [
    { title:'PERSONA', technique:'Acrylic and Spray Can on Glass', size:'60 x 70 cm', price:600, status:'sold', img:'assets/img/20211222_144641-2.jpg' },
    { title:'VERTIGO', technique:'Acrylic and Spray Can on Glass', size:'85 x 85 cm', price:700, status:'available', img:'assets/img/20220114_110409.jpg' },
    { title:'HIROSHIMA MON AMOUR', technique:'Acrylic and Spray Can on Glass', size:'53 x 63 cm', price:550, status:'sold', img:'assets/img/20220206_165159-1.jpg' },
    { title:'LA DOLCE VITA', technique:'Acrylic and Spray Can on Glass', size:'84 x 74 cm', price:700, status:'sold', img:'assets/img/20220228_170756.jpg' },
    { title:'JULES ET JIM', technique:'Acrylic and Spray Can on Glass', size:'58 x 68 cm', price:600, status:'sold', img:'assets/img/donnauomo.jpg' },
    { title:'A BOUT DE SOUFFLE', technique:'Acrylic and Spray Can on Glass', size:'73 x 63 cm', price:600, status:'sold', img:'assets/img/donnauomo2.jpg' }
  ];
  const figures = document.querySelectorAll('#cinema .cinema-item');
  figures.forEach((fig, i) => {
    const img = fig.querySelector('img');
    if(!img || !details[i]) return;
    img.style.cursor = 'pointer';
    const show = () => openCinemaModal(details[i]);
    img.addEventListener('click', show);
    img.setAttribute('tabindex','0');
    img.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); show(); }});
  });
}

function buildPolaroidModal() {
  if (document.getElementById('polaroidModal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'polaroidModal';
  wrap.innerHTML = `
    <div class="pm-backdrop" data-pl-close></div>
    <div class="pl-dialog" role="dialog" aria-modal="true" aria-label="Dettaglio opera polaroid">
      <button class="pl-close" aria-label="Chiudi" data-pl-close>&times;</button>
      <div class="pl-media"><img src="" alt="Opera polaroid" /></div>
      <div class="pl-info">
        <h4 class="pl-title"></h4>
        <p class="pl-tech"></p>
        <p class="pl-sub"></p>
        <p class="pl-size"></p>
        <p class="pl-price"></p>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e => { if (e.target.hasAttribute('data-pl-close')) closePolaroidModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape') closePolaroidModal(); });
}
function openPolaroidModal(data) {
  buildPolaroidModal();
  const m = document.getElementById('polaroidModal');
  m.querySelector('.pl-media img').src = data.img;
  m.querySelector('.pl-media img').alt = data.title;
  m.querySelector('.pl-title').textContent = data.title;
  m.querySelector('.pl-tech').textContent = data.technique;
  m.querySelector('.pl-sub').textContent = data.subtitle;
  m.querySelector('.pl-size').textContent = data.size;
  const lang = document.documentElement.lang || 'it';
  const soldLabel = lang === 'en' ? 'SOLD' : 'VENDUTO';
  const availLabel = lang === 'en' ? 'AVAILABLE' : 'DISPONIBILE';
  const priceHTML = `${data.price} € <span class="status ${data.status}">= ${data.status === 'sold' ? soldLabel : availLabel}</span>`;
  m.querySelector('.pl-price').innerHTML = priceHTML;
  document.body.style.overflow='hidden';
  m.classList.add('open');
  requestAnimationFrame(()=> m.querySelector('.pl-dialog').classList.add('in'));
}
function closePolaroidModal() {
  const m = document.getElementById('polaroidModal');
  if(!m) return;
  m.querySelector('.pl-dialog').classList.remove('in');
  setTimeout(()=>{ m.classList.remove('open'); document.body.style.overflow=''; },230);
}
function initPolaroidDetails() {
  const details = [
    { title:'CUTRONE', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'Cats Regning', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/IMG_2104-scaled.jpeg' },
    { title:'BASQUIAT', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'Birds on Money', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/IMG_2105-1364x2048.jpeg' },
    { title:'HOCKNEY', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'Peter getting out of Nick’s Pool', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/IMG_2108-1299x2048.jpeg' },
    { title:'HARING', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'Safe Sex', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/IMG_2109-scaled.jpeg' },
    { title:'WARHOL', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'Shot Marilyns', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/andy.jpeg' },
    { title:'DALÌ', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'The Disintegration of the Persistence of Memory', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/dali.jpeg' },
    { title:'BACON', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'Self Portrait 1971', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/bacon.jpeg' },
    { title:'LICHTENSTEIN', technique:'Acrilyc on Canvas and Photographic Print on Board', subtitle:'M-Maybe 1965', size:'50 x 70 cm', price:700, status:'sold', img:'assets/img/linch.jpeg' }
  ];
  const figures = document.querySelectorAll('#polaroid .polaroid-item');
  figures.forEach((fig, i) => {
    const img = fig.querySelector('img');
    if(!img || !details[i]) return;
    img.style.cursor = 'pointer';
    const show = () => openPolaroidModal(details[i]);
    img.addEventListener('click', show);
    img.setAttribute('tabindex','0');
    img.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); show(); }});
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFilters();
  loadArtworks();
  observeReveal();
  initForm();
  respectReducedMotion();
  initCinemaDetails();
  initPolaroidDetails();
});
