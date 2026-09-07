/* Trail Life Troop PA-1997 — site script
   ------------------------------------------------------------
   Google Calendar is the source of truth for event facts. Google Drive is
   the source of truth for approved posters. The GitHub Action in
   .github/workflows/sync-events.yml reads the calendar every ~15 minutes
   and writes events.json — this file only ever RENDERS that data. To
   change how events look on the site, edit the calendar or this file;
   to change which events exist, edit the calendar. */

const SITE_CONFIG = {
  timeZone: 'America/New_York',
  // Troop YouTube channel — the site shows the latest uploads automatically.
  youtubeChannelId: 'UCR1MRDtKONNbhKUNqIq99CA',
  youtubeChannelUrl: 'https://www.youtube.com/@traillifetrooppa1997',
};

/* ---------- Mobile nav ---------- */
(function () {
  const btn = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Close' : 'Menu';
  });
})();

/* ---------- events.json ---------- */
let EVENTS_CACHE = null;
async function loadEvents() {
  if (EVENTS_CACHE) return EVENTS_CACHE;
  try {
    const res = await fetch('events.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('events.json request failed: ' + res.status);
    const data = await res.json();
    EVENTS_CACHE = data.events || [];
    return EVENTS_CACHE;
  } catch (err) {
    console.error(err);
    EVENTS_CACHE = [];
    return EVENTS_CACHE;
  }
}

function fmtDateLong(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { timeZone: SITE_CONFIG.timeZone, weekday: 'long', month: 'long', day: 'numeric' });
}
function fmtDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { timeZone: SITE_CONFIG.timeZone, month: 'short', day: 'numeric' });
}
function fmtTime12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function whenText(ev) {
  const startDay = fmtDateLong(ev.date);
  if (ev.allDay) {
    if (ev.endDate && ev.endDate !== ev.date) return startDay + ' – ' + fmtDateLong(ev.endDate);
    return startDay;
  }
  return startDay + ', ' + fmtTime12(ev.startTime) + ' – ' + fmtTime12(ev.endTime);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Defense-in-depth sanitizer for description HTML, even though the Action
// already only writes plain <p>/<br> markup into events.json.
function safeDescription(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  div.querySelectorAll('script, style, iframe, img').forEach(n => n.remove());
  div.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (a.name !== 'href') n.removeAttribute(a.name); });
  return div.innerHTML;
}
function titleTag(ev) {
  if (ev.cancelled) return '<span class="tag tag-cancelled">Cancelled</span>';
  if (ev.tentative) return '<span class="tag">Tentative</span>';
  return '';
}
function posterImg(ev, extraClass) {
  if (!ev.poster) {
    return '<div class="poster-fallback' + (extraClass ? ' ' + extraClass : '') + '">' + escapeHtml(ev.displayTitle) + '</div>';
  }
  const id = ev.poster.fileId;
  // Try a chain of Drive image URLs — some render more reliably than others
  // depending on the file's sharing state and Drive's caching. If every
  // source fails, wireImageFallbacks() below swaps in a text placeholder.
  const sources = [
    'https://lh3.googleusercontent.com/d/' + id + '=w1200',
    'https://drive.google.com/thumbnail?id=' + id + '&sz=w1200',
    'https://drive.google.com/uc?export=view&id=' + id,
  ];
  return '<img class="poster-img" data-fallback-class="' + escapeHtml(extraClass || '') + '" ' +
    'data-sources="' + escapeHtml(sources.join('|')) + '" data-source-index="0" ' +
    'src="' + sources[0] + '" alt="' + escapeHtml(ev.displayTitle) + '" loading="lazy">';
}
function fallbackBlock(text, cls) {
  const d = document.createElement('div');
  d.className = 'poster-fallback' + (cls ? ' ' + cls : '');
  d.textContent = text;
  return d;
}
// Generic multi-source fallback wiring: any <img> with data-sources="a|b|c"
// tries each URL in turn on error, and only once every source has failed
// does it get replaced (via makeFallback) with a visible placeholder —
// never left as a blank/broken image.
function wireFallbackChain(root, selector, makeFallback) {
  root.querySelectorAll(selector).forEach(img => {
    img.addEventListener('error', function onError() {
      const sources = (img.dataset.sources || '').split('|').filter(Boolean);
      const next = (parseInt(img.dataset.sourceIndex, 10) || 0) + 1;
      if (next < sources.length) {
        img.dataset.sourceIndex = String(next);
        img.src = sources[next];
      } else {
        img.removeEventListener('error', onError);
        img.replaceWith(makeFallback(img));
      }
    });
  });
}
function wireImageFallbacks(root) {
  wireFallbackChain(root, 'img.poster-img', img => fallbackBlock(img.alt, img.dataset.fallbackClass));
}

/* ---------- Home page: next up on the trail ---------- */
function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}
function countdownHtml(ev) {
  if (ev.cancelled) return '';
  const days = daysUntil(ev.date);
  if (days > 1) return '<div class="countdown"><span class="countdown-num">' + days + '</span><span class="countdown-label">days to go</span></div>';
  if (days === 1) return '<div class="countdown"><span class="countdown-num">1</span><span class="countdown-label">day to go</span></div>';
  if (days === 0) return '<div class="countdown countdown-today"><span class="countdown-num">Today!</span></div>';
  return '';
}

async function loadThisWeek() {
  const meetEl = document.getElementById('next-meeting');
  const eventEl = document.getElementById('next-event');
  if (!meetEl && !eventEl) return;
  const events = await loadEvents();
  const upcoming = events.filter(e => !e.cancelled);
  const meeting = upcoming.find(e => e.isMeeting);
  const big = upcoming.find(e => !e.isMeeting);

  if (meetEl) {
    if (meeting) {
      meetEl.innerHTML =
        '<div class="kicker">Next troop meeting</div>' +
        '<h3>' + escapeHtml(meeting.displayTitle) + titleTag(meeting) + '</h3>' +
        '<div class="when">' + escapeHtml(whenText(meeting)) + '</div>' +
        '<div class="detail">' + safeDescription(meeting.description) + '</div>';
    } else {
      meetEl.innerHTML = '<div class="kicker">Next troop meeting</div><h3>Every Tuesday, 6:00 PM</h3><p class="detail">Living Word Baptist Church, 40 Hess Lane, Sweet Valley. Check the calendar for this week\'s lesson.</p>';
    }
  }
  if (eventEl) {
    if (big) {
      eventEl.innerHTML =
        '<div class="kicker">Next special event</div>' +
        countdownHtml(big) +
        '<h3>' + escapeHtml(big.displayTitle) + titleTag(big) + '</h3>' +
        '<div class="when">' + escapeHtml(whenText(big)) + '</div>' +
        '<div class="detail">' + safeDescription(big.description) +
        (big.location ? '<p class="muted">' + escapeHtml(big.location) + '</p>' : '') + '</div>' +
        '<p style="margin:.75rem 0 0"><a href="events.html">See everything coming up</a></p>';
    } else {
      eventEl.innerHTML = '<div class="kicker">Next special event</div><p class="detail">Nothing scheduled yet. <a href="events.html">Check the calendar.</a></p>';
    }
  }
}

/* ---------- Poster rail (home) + feature list (events page) ---------- */
async function loadPosterRail() {
  const el = document.getElementById('poster-rail');
  if (!el) return;
  const events = await loadEvents();
  const withPosters = events.filter(e => e.poster && !e.cancelled).slice(0, 6);
  const cards = withPosters.map(ev => `
      <a class="poster" href="events.html#ev-${ev.id}">
        <figure>${posterImg(ev)}</figure>
        <div class="poster-meta"><div class="date">${escapeHtml(fmtDateShort(ev.date))}</div><h3>${escapeHtml(ev.displayTitle)}${titleTag(ev)}</h3><p>${escapeHtml(ev.firstParagraph || '')}</p></div>
      </a>`).join('');
  const moreCard = `
      <a class="poster poster-more" href="events.html">
        <div class="poster-more-arrow">&rarr;</div>
        <h3>See all events</h3>
        <p>The full calendar — meetings, campouts, and everything else coming up.</p>
      </a>`;
  el.innerHTML = cards + moreCard;
  wireImageFallbacks(el);
}

async function loadFeatureList() {
  const el = document.getElementById('feature-list');
  if (!el) return;
  const events = await loadEvents();
  const withPosters = events.filter(e => e.poster && !e.cancelled);
  if (!withPosters.length) { el.closest('section').style.display = 'none'; return; }
  el.innerHTML = withPosters.map(ev => `
      <div class="feature" id="ev-${ev.id}">
        <figure>${posterImg(ev, 'compact')}</figure>
        <div class="feature-body"><div class="date">${escapeHtml(fmtDateShort(ev.date))}</div><h3>${escapeHtml(ev.displayTitle)}${titleTag(ev)}</h3><p>${escapeHtml(ev.firstParagraph || '')}</p></div>
      </div>`).join('');
  wireImageFallbacks(el);
}

/* ---------- Events page: full upcoming list ---------- */
async function loadUpcomingList() {
  const list = document.getElementById('upcoming-list');
  if (!list) return;
  const events = await loadEvents();
  if (!events.length) {
    list.innerHTML = '<li class="month-head"><h3>Nothing on the calendar yet</h3></li>';
    return;
  }
  let lastMonth = '';
  let html = '';
  for (const ev of events) {
    const d = new Date(ev.date + 'T12:00:00');
    const month = d.toLocaleDateString('en-US', { timeZone: SITE_CONFIG.timeZone, month: 'long', year: 'numeric' });
    if (month !== lastMonth) { html += '<li class="month-head"><h3>' + month + '</h3></li>'; lastMonth = month; }
    const idAttr = ev.poster ? '' : ' id="ev-' + ev.id + '"'; // poster events already anchor via their feature card
    html +=
      '<li' + idAttr + (ev.cancelled ? ' class="is-cancelled"' : '') + '>' +
        '<div class="event-date"><div class="m">' + d.toLocaleDateString('en-US', { timeZone: SITE_CONFIG.timeZone, month: 'short' }) + '</div><div class="d">' + d.toLocaleDateString('en-US', { timeZone: SITE_CONFIG.timeZone, day: 'numeric' }) + '</div><div class="w">' + d.toLocaleDateString('en-US', { timeZone: SITE_CONFIG.timeZone, weekday: 'short' }) + '</div></div>' +
        '<div class="event-body">' +
          '<h3>' + escapeHtml(ev.displayTitle) + titleTag(ev) + '</h3>' +
          '<div class="when">' + escapeHtml(whenText(ev)) + (ev.location ? ' · ' + escapeHtml(ev.location) : '') + '</div>' +
          '<div class="detail">' + safeDescription(ev.description) + '</div>' +
        '</div>' +
      '</li>';
  }
  list.innerHTML = html;
}

/* ---------- Gallery page: photos from the approved Drive folder ---------- */
async function loadGalleryPhotos() {
  const el = document.getElementById('gallery-grid');
  if (!el) return;
  try {
    const res = await fetch('gallery.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('gallery.json request failed: ' + res.status);
    const data = await res.json();
    const photos = data.photos || [];
    if (!photos.length) {
      el.innerHTML = '<p class="detail">No photos yet — check back soon.</p>';
      return;
    }
    el.innerHTML = photos.map(p => {
      const sources = [p.thumbUrl, ...(p.fallbackUrls || [])].filter(Boolean).join('|');
      const caption = p.caption || '';
      return '<figure>' +
        '<img class="gallery-img" data-sources="' + escapeHtml(sources) + '" data-source-index="0" ' +
        'src="' + escapeHtml(p.thumbUrl) + '" alt="' + escapeHtml(caption || 'Troop photo') + '" loading="lazy">' +
        (caption ? '<figcaption>' + escapeHtml(caption) + '</figcaption>' : '') +
        '</figure>';
    }).join('');
    wireFallbackChain(el, 'img.gallery-img', img => {
      const d = document.createElement('div');
      d.className = 'gallery-fallback';
      d.textContent = 'Photo unavailable';
      return d;
    });
  } catch (err) {
    console.error(err);
    el.innerHTML = '<p class="detail">Couldn\'t load photos right now.</p>';
  }
}

/* ---------- YouTube: latest uploads ---------- */
async function loadYouTubeVideos() {
  const wrap = document.getElementById('youtube-videos');
  if (!wrap) return;
  try {
    const uploadsPlaylist = SITE_CONFIG.youtubeChannelId.replace(/^UC/, 'UU');
    const url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=8&playlistId=' +
      uploadsPlaylist + '&key=AIzaSyAO1G7TptJAuy9UhBl7J5IzZHlr-XNgRn8';
    const res = await fetch(url);
    if (!res.ok) throw new Error('YouTube request failed: ' + res.status);
    const data = await res.json();
    const items = (data.items || [])
      .filter(it => it.snippet && it.snippet.resourceId && it.snippet.resourceId.videoId)
      .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));

    if (!items.length) { wrap.innerHTML = ''; return; }

    const [featured, ...rest] = items;
    const fid = featured.snippet.resourceId.videoId;
    let html = '<div class="video"><iframe title="' + escapeHtml(featured.snippet.title) +
      '" src="https://www.youtube-nocookie.com/embed/' + fid +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';

    if (rest.length) {
      html += '<div class="yt-grid">' + rest.map(it => {
        const v = it.snippet.resourceId.videoId;
        const t = escapeHtml(it.snippet.title);
        const th = it.snippet.thumbnails || {};
        const thumb = (th.medium || th.default || {}).url || '';
        return '<button type="button" class="yt-card" data-video-id="' + v + '" aria-label="Play: ' + t + '">' +
          '<span class="yt-thumb-wrap"><img src="' + thumb + '" alt="" loading="lazy"><span class="yt-play" aria-hidden="true">&#9658;</span></span>' +
          '<span class="yt-title">' + t + '</span></button>';
      }).join('') + '</div>';
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('.yt-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const vid = btn.dataset.videoId;
        const holder = document.createElement('div');
        holder.className = 'video';
        holder.innerHTML = '<iframe title="' + btn.getAttribute('aria-label') +
          '" src="https://www.youtube-nocookie.com/embed/' + vid + '?autoplay=1" ' +
          'allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
        btn.replaceWith(holder);
      }, { once: true });
    });
  } catch (err) {
    console.error(err);
    wrap.innerHTML = '<p class="detail">Couldn\'t load the latest videos right now. <a href="' +
      SITE_CONFIG.youtubeChannelUrl + '" target="_blank" rel="noopener">Visit the channel</a>.</p>';
  }
}

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
let deferredInstall = null;
/* ---------- Home page: rotating hero photos ---------- */
async function loadHeroSlideshow() {
  const layer = document.getElementById('hero-photo-layer');
  const fallback = document.getElementById('hero-fallback-img');
  if (!layer) return;
  try {
    const res = await fetch('gallery.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('gallery.json request failed: ' + res.status);
    const data = await res.json();
    // Hero photos are the ones John has starred in Drive. Until any are
    // starred, fall back to the newest approved photos so the hero still
    // rotates instead of sitting empty.
    const starred = data.heroPhotos || [];
    const photos = (starred.length ? starred : (data.photos || [])).slice(0, 8);
    if (!photos.length) return; // keep the static branded banner showing

    // Preload everything first so the crossfade never shows a blank frame,
    // and so one broken Drive image can't break the whole slideshow.
    const loaded = await Promise.all(photos.map(p => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(p);
      img.onerror = () => resolve(null);
      img.src = p.fullUrl;
    })));
    const usable = loaded.filter(Boolean);
    if (!usable.length) return; // every photo failed to load — keep the fallback banner

    usable.forEach((p, i) => {
      const slide = document.createElement('div');
      slide.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
      slide.style.backgroundImage = 'url(' + p.fullUrl + ')';
      layer.appendChild(slide);
    });
    if (fallback) fallback.classList.add('is-hidden');
    document.getElementById('hero').classList.add('hero-live');

    if (usable.length > 1) {
      const slides = layer.querySelectorAll('.hero-slide');
      let idx = 0;
      setInterval(() => {
        slides[idx].classList.remove('is-active');
        idx = (idx + 1) % slides.length;
        slides[idx].classList.add('is-active');
      }, 6000);
    }
  } catch (err) {
    console.error(err);
    // leave the static fallback banner in place
  }
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
  const b = document.getElementById('installAppBtn');
  if (b) {
    b.style.display = 'inline-block';
    b.addEventListener('click', async () => { deferredInstall.prompt(); await deferredInstall.userChoice; b.style.display = 'none'; });
  }
});

window.addEventListener('load', () => {
  loadThisWeek();
  loadUpcomingList();
  loadPosterRail();
  loadFeatureList();
  loadGalleryPhotos();
  loadHeroSlideshow();
  loadYouTubeVideos();
});
