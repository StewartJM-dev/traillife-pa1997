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
  const src = 'https://drive.google.com/thumbnail?id=' + ev.poster.fileId + '&sz=w1000';
  return '<img class="poster-img" data-fallback-class="' + escapeHtml(extraClass || '') + '" ' +
    'src="' + src + '" alt="' + escapeHtml(ev.displayTitle) + '" loading="lazy">';
}
function fallbackBlock(text, cls) {
  const d = document.createElement('div');
  d.className = 'poster-fallback' + (cls ? ' ' + cls : '');
  d.textContent = text;
  return d;
}
function wireImageFallbacks(root) {
  root.querySelectorAll('img.poster-img').forEach(img => {
    img.addEventListener('error', () => img.replaceWith(fallbackBlock(img.alt, img.dataset.fallbackClass)), { once: true });
  });
}

/* ---------- Home page: next up on the trail ---------- */
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
        return '<a class="yt-card" href="https://www.youtube.com/watch?v=' + v + '" target="_blank" rel="noopener">' +
          '<img src="' + thumb + '" alt="" loading="lazy"><span>' + t + '</span></a>';
      }).join('') + '</div>';
    }
    wrap.innerHTML = html;
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
  loadYouTubeVideos();
});
