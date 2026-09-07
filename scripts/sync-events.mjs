// Syncs the "Trail Life Troop PA-1997 Events" Google Calendar into events.json.
// Run by .github/workflows/sync-events.yml on a schedule and on manual dispatch.
//
// Google Calendar is the source of truth for event facts (title, time, location,
// description). Google Drive is the source of truth for approved posters — this
// script only reads the "APPROVED POSTER:" paragraph out of the calendar
// description; it never guesses or searches Drive for a matching file.

import { writeFile, readFile } from 'node:fs/promises';

const API_KEY = process.env.GCAL_API_KEY;
const CALENDAR_ID = process.env.GCAL_CALENDAR_ID ||
  '8187256076839d823a752f8c6d11bb571899eabed453ddd7244cd412fe39406b@group.calendar.google.com';
const TIME_ZONE = 'America/New_York';
const OUT_PATH = new URL('../events.json', import.meta.url);

const HIDDEN_PREFIXES = ['Church Use', 'Leadership', 'Internal', 'Committee'];
const HIDDEN_WORDS = ['Flyer for Church'];
const STRIP_PREFIXES = ['PA-1997 Meeting |', 'PA-1997 |', 'PA-1997 —', 'PA-1997 -'];
const BOILERPLATE_PARAGRAPHS = [/^Approved 2026.?27 program calendar\.?$/i];

if (!API_KEY && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  console.error('GCAL_API_KEY is not set. Add it as a GitHub Actions secret.');
  process.exit(1);
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
}
function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).trim();
}

export function splitParagraphs(html) {
  if (!html) return [];
  const matches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  const blocks = matches.length ? matches.map(m => ({ raw: m[0], inner: m[1] })) : [{ raw: html, inner: html }];
  return blocks.map(b => ({
    raw: b.raw,
    text: stripTags(b.inner.replace(/<br\s*\/?>/gi, '\n')),
  }));
}

function extractDriveFileId(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/) || url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
}

export function isPosterParagraph(text) {
  return /^APPROVED POSTER\s*:?/i.test(text.trim());
}

export function parsePosterParagraph(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
  const inline = lines[0].replace(/^APPROVED POSTER\s*:?\s*/i, '').trim();
  const rest = inline ? [inline, ...lines.slice(1)] : lines.slice(1);
  const filename = rest[0] || '';
  const urlLine = rest.find(l => /drive\.google\.com/i.test(l)) || rest[1] || '';
  const fileId = extractDriveFileId(urlLine);
  if (!fileId || !filename) return null;
  return { fileId, filename };
}

export function isBoilerplateParagraph(text) {
  return BOILERPLATE_PARAGRAPHS.some(re => re.test(text.trim()));
}

export function fmtDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function fmtTime(d) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const h = parts.find(p => p.type === 'hour').value.padStart(2, '0');
  const m = parts.find(p => p.type === 'minute').value.padStart(2, '0');
  return `${h === '24' ? '00' : h}:${m}`;
}

function isHiddenTitle(summary) {
  return HIDDEN_PREFIXES.some(p => summary.startsWith(p)) || HIDDEN_WORDS.some(w => summary.includes(w));
}

async function fetchAllEvents() {
  const now = new Date();
  const timeMax = new Date(now.getTime() + 270 * 24 * 60 * 60 * 1000);
  const events = [];
  let pageToken = '';
  do {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`);
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('timeMin', now.toISOString());
    url.searchParams.set('timeMax', timeMax.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '250');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Calendar API request failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    events.push(...(data.items || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return events;
}

export function transform(raw) {
  if (raw.status === 'cancelled') return null;
  let summary = (raw.summary || '').trim();
  if (isHiddenTitle(summary)) return null;

  let cancelled = false;
  let tentative = false;
  if (/^CANCELLED\s*\|/i.test(summary)) { cancelled = true; summary = summary.replace(/^CANCELLED\s*\|\s*/i, ''); }
  if (/^TENTATIVE\s*\|/i.test(summary)) { tentative = true; summary = summary.replace(/^TENTATIVE\s*\|\s*/i, ''); }

  let displayTitle = summary;
  for (const p of STRIP_PREFIXES) {
    if (displayTitle.startsWith(p)) { displayTitle = displayTitle.slice(p.length).trim(); break; }
  }
  const isMeeting = /^PA-1997 Meeting/i.test(summary);

  const paragraphs = splitParagraphs(raw.description || '');
  let poster = null;
  const keptParagraphs = [];
  for (const p of paragraphs) {
    if (isPosterParagraph(p.text)) {
      poster = parsePosterParagraph(p.text);
      continue;
    }
    if (isBoilerplateParagraph(p.text)) continue;
    keptParagraphs.push(p);
  }
  const description = keptParagraphs.map(p => p.raw).join('\n');
  const firstParagraph = keptParagraphs.length ? keptParagraphs[0].text.slice(0, 220) : '';

  const allDay = !!raw.start.date;
  const startD = new Date(raw.start.dateTime || `${raw.start.date}T12:00:00`);
  const endD = new Date(raw.end.dateTime || `${raw.end.date}T12:00:00`);
  let endDate = fmtDate(endD);
  if (allDay) {
    const inclusiveEnd = new Date(endD.getTime() - 24 * 60 * 60 * 1000);
    endDate = fmtDate(inclusiveEnd);
  }

  return {
    id: raw.id,
    title: summary,
    displayTitle,
    isMeeting,
    tentative,
    cancelled,
    allDay,
    date: fmtDate(startD),
    endDate,
    startTime: allDay ? null : fmtTime(startD),
    endTime: allDay ? null : fmtTime(endD),
    location: raw.location || '',
    description,
    firstParagraph,
    poster,
    updated: raw.updated || null,
  };
}

async function main() {
  const raw = await fetchAllEvents();
  const events = raw.map(transform).filter(Boolean);
  events.sort((a, b) => (a.date + (a.startTime || '00:00')).localeCompare(b.date + (b.startTime || '00:00')));

  const output = {
    generatedAt: new Date().toISOString(),
    calendar: 'Trail Life Troop PA-1997 Events',
    events,
  };

  const next = JSON.stringify(output, null, 2) + '\n';
  let prev = '';
  try { prev = await readFile(OUT_PATH, 'utf8'); } catch { /* first run */ }

  const stripTimestamp = s => s.replace(/"generatedAt":\s*"[^"]*",?\n?/, '');
  if (stripTimestamp(prev) === stripTimestamp(next)) {
    console.log('No event changes since last sync.');
    return;
  }

  await writeFile(OUT_PATH, next, 'utf8');
  console.log(`Wrote ${events.length} events to events.json`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch(err => { console.error(err); process.exit(1); });
}
