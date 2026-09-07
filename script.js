/* Trail Life Troop PA-1997 — site script
   ------------------------------------------------------------
   Everything you might need to change lives in SITE_CONFIG.
   The site reads the troop's Google Calendar live, so keeping
   the calendar current keeps the website current. */

const SITE_CONFIG = {
  // "Trail Life Troop PA-1997 Events" calendar (must be set to public in Google Calendar).
  calendarId: '8187256076839d823a752f8c6d11bb571899eabed453ddd7244cd412fe39406b@group.calendar.google.com',
  apiKey: 'AIzaSyAO1G7TptJAuy9UhBl7J5IzZHlr-XNgRn8',
  timeZone: 'America/New_York',
  // Events whose title starts with any of these are leadership-only and never shown on the site.
  hiddenPrefixes: ['Church Use', 'Leadership', 'Internal', 'Committee'],
  // Titles that contain these words are treated as internal to-dos, not family events.
  hiddenWords: ['Flyer for Church'],
  // Prefixes stripped from titles for display.
  stripPrefixes: ['PA-1997 Meeting |', 'PA-1997 |', 'PA-1997 —', 'PA-1997 -'],
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

/* ---------- Calendar helpers ---------- */
function cleanTitle(raw) {
  let t = raw.trim();
  let tentative = false;
  if (/^TENTATIVE\s*\|/i.test(t)) { tentative = true; t = t.replace(/^TENTATIVE\s*\|\s*/i, ''); }
  for (const p of SITE_CONFIG.stripPrefixes) {
    if (t.startsWith(p)) { t = t.slice(p.length).trim(); break; }
  }
  return { title: t, tentative };
}

function isHidden(ev) {
  const s = ev.summary || '';
  if (SITE_CONFIG.hiddenPrefixes.some(p => s.startsWith(p))) return true;
  if (SITE_CONFIG.hiddenWords.some(w => s.includes(w))) return true;
  return false;
}

function isMeeting(ev) {
  return /^PA-1997 Meeting/i.test(ev.summary || '');
}

function eventStart(ev) {
  return new Date(ev.start.dateTime || (ev.start.date + 'T12:00:00'));
}

function isAllDayish(ev) {
  if (ev.start.date) return true;
  // Events entered as 00:00–23:59 are really all-day events.
  const s = new Date(ev.start.dateTime), e = new Date(ev.end.dateTime);
  return s.getHours() === 0 && s.getMinutes() === 0 && (e - s) >= 23 * 3600 * 1000;
}

function fmtDate(d, opts) {
  return d.toLocaleDateString('en-US', Object.assign({ timeZone: SITE_CONFIG.timeZone }, opts));
}
function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { timeZone: SITE_CONFIG.timeZone, hour: 'numeric', minute: '2-digit' });
}

function whenText(ev) {
  const s = eventStart(ev);
  const e = new Date(ev.end.dateTime || (ev.end.date + 'T12:00:00'));
  const day = fmtDate(s, { weekday: 'long', month: 'long', day: 'numeric' });
  if (isAllDayish(ev)) {
    const lastDay = ev.start.date ? new Date(e.getTime() - 86400000) : e;
    if (lastDay.toDateString() !== s.toDateString()) {
      return day + ' – ' + fmtDate(lastDay, { weekday: 'long', month: 'long', day: 'numeric' });
    }
    return day;
  }
  return day + ', ' + fmtTime(s) + ' – ' + fmtTime(e);
}

function safeDescription(html) {
  // Calendar descriptions are entered by troop leadership; allow basic tags only.
  const div = document.createElement('div');
  div.innerHTML = html || '';
  div.querySelectorAll('script, style, iframe, img').forEach(n => n.remove());
  div.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (a.name !== 'href') n.removeAttribute(a.name); });
  return div.innerHTML;
}

async function fetchEvents(days) {
  const now = new Date();
  const max = new Date(now.getTime() + days * 86400000);
  const url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(SITE_CONFIG.calendarId) +
    '/events?key=' + SITE_CONFIG.apiKey + '&timeMin=' + now.toISOString() + '&timeMax=' + max.toISOString() +
    '&orderBy=startTime&singleEvents=true&maxResults=120';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Calendar request failed: ' + res.status);
  const data = await res.json();
  return (data.items || []).filter(ev => ev.status !== 'cancelled' && !isHidden(ev));
}

/* ---------- Home page: this week ---------- */
async function loadThisWeek() {
  const meetEl = document.getElementById('next-meeting');
  const eventEl = document.getElementById('next-event');
  if (!meetEl && !eventEl) return;
  try {
    const events = await fetchEvents(120);
    const meeting = events.find(isMeeting);
    const big = events.find(ev => !isMeeting(ev));

    if (meetEl) {
      if (meeting) {
        const { title } = cleanTitle(meeting.summary);
        meetEl.innerHTML =
          '<div class="kicker">Next troop meeting</div>' +
          '<h3>' + escapeHtml(title) + '</h3>' +
          '<div class="when">' + escapeHtml(whenText(meeting)) + '</div>' +
          '<div class="detail">' + safeDescription(meeting.description).replace(/Approved 2026.?27 program calendar\.?/i, '') + '</div>';
      } else {
        meetEl.innerHTML = '<div class="kicker">Next troop meeting</div><h3>Every Tuesday, 6:00 PM</h3><p class="detail">Living Word Baptist Church, 40 Hess Lane, Sweet Valley. Check the calendar for this week\'s lesson.</p>';
      }
    }
    if (eventEl) {
      if (big) {
        const { title, tentative } = cleanTitle(big.summary);
        eventEl.innerHTML =
          '<div class="kicker">Next special event</div>' +
          '<h3>' + escapeHtml(title) + (tentative ? '<span class="tag">Tentative</span>' : '') + '</h3>' +
          '<div class="when">' + escapeHtml(whenText(big)) + '</div>' +
          '<div class="detail">' + safeDescription(big.description) +
          (big.location ? '<p class="muted">' + escapeHtml(big.location) + '</p>' : '') + '</div>' +
          '<p style="margin:.75rem 0 0"><a href="events.html">See everything coming up</a></p>';
      } else {
        eventEl.innerHTML = '<div class="kicker">Next special event</div><p class="detail">Nothing scheduled yet. <a href="events.html">Check the calendar.</a></p>';
      }
    }
  } catch (err) {
    console.error(err);
    const fallback = '<div class="kicker">Troop calendar</div><h3>Every Tuesday, 6:00 PM</h3><p class="detail">Living Word Baptist Church, Sweet Valley. The live calendar couldn\'t load — <a href="events.html">open the events page</a>.</p>';
    if (meetEl) meetEl.innerHTML = fallback;
    if (eventEl) eventEl.style.display = 'none';
  }
}

/* ---------- Events page: upcoming list ---------- */
async function loadUpcomingList() {
  const list = document.getElementById('upcoming-list');
  if (!list) return;
  try {
    const events = await fetchEvents(150);
    if (!events.length) {
      list.innerHTML = '<li class="month-head"><h3>Nothing on the calendar yet</h3></li>';
      return;
    }
    let lastMonth = '';
    let html = '';
    for (const ev of events) {
      const s = eventStart(ev);
      const month = fmtDate(s, { month: 'long', year: 'numeric' });
      if (month !== lastMonth) { html += '<li class="month-head"><h3>' + month + '</h3></li>'; lastMonth = month; }
      const { title, tentative } = cleanTitle(ev.summary);
      html +=
        '<li>' +
          '<div class="event-date"><div class="m">' + fmtDate(s, { month: 'short' }) + '</div><div class="d">' + fmtDate(s, { day: 'numeric' }) + '</div><div class="w">' + fmtDate(s, { weekday: 'short' }) + '</div></div>' +
          '<div class="event-body">' +
            '<h3>' + escapeHtml(title) + (tentative ? '<span class="tag" style="background:#c9932b;color:#14291c;font:700 .75rem Open Sans,sans-serif;padding:.15rem .5rem;border-radius:3px;margin-left:.4rem;vertical-align:middle">Tentative</span>' : '') + '</h3>' +
            '<div class="when">' + escapeHtml(whenText(ev)) + (ev.location ? ' · ' + escapeHtml(ev.location) : '') + '</div>' +
            '<div class="detail">' + safeDescription(ev.description).replace(/Approved 2026.?27 program calendar\.?/i, '') + '</div>' +
          '</div>' +
        '</li>';
    }
    list.innerHTML = html;
  } catch (err) {
    console.error(err);
    list.innerHTML = '<li class="month-head"><h3>The live list couldn\'t load. Use the calendar below.</h3></li>';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Poster images: Drive first, local fallback ---------- */
document.querySelectorAll('img[data-fallback]').forEach(img => {
  img.addEventListener('error', () => {
    if (img.dataset.tried) { img.replaceWith(fallbackBlock(img.alt)); return; }
    img.dataset.tried = '1';
    img.src = img.dataset.fallback;
  });
});
function fallbackBlock(text) {
  const d = document.createElement('div');
  d.className = 'poster-fallback';
  d.textContent = text;
  return d;
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

window.addEventListener('load', () => { loadThisWeek(); loadUpcomingList(); });
