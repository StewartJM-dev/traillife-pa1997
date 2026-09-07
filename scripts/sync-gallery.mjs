// Syncs the "Website Gallery - Approved Photos" Google Drive folder into
// gallery.json. Run by .github/workflows/sync-events.yml alongside the
// calendar sync, on the same schedule.
//
// This folder IS the publishing approval queue: only photos an admin has
// deliberately placed here are public. Nothing outside this one folder is
// ever scanned. Add a photo -> it appears after the next sync. Remove a
// photo -> it disappears after the next sync, because gallery.json is
// rebuilt from scratch every run, not appended to.
//
// The browser never calls the Drive API directly — it only ever reads the
// plain URLs this script bakes into gallery.json.

import { writeFile, readFile } from 'node:fs/promises';

const API_KEY = process.env.GCAL_API_KEY; // same key already used for Calendar/YouTube
const GALLERY_FOLDER_ID = process.env.GALLERY_FOLDER_ID || '1hC0WYPxXNkGOAQFlJoRmhhYcL71Lhywl';
const OUT_PATH = new URL('../gallery.json', import.meta.url);
const MAX_PHOTOS = 60; // keep the page and the JSON file reasonably sized

const SUPPORTED_MIME_PREFIXES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

if (!API_KEY && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  console.error('GCAL_API_KEY is not set. Add it as a GitHub Actions secret.');
  process.exit(1);
}

async function listFolderImages(folderId) {
  const files = [];
  let pageToken = '';
  const mimeClause = SUPPORTED_MIME_PREFIXES.map(m => `mimeType = '${m}'`).join(' or ');
  const q = `'${folderId}' in parents and (${mimeClause}) and trashed = false`;
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('q', q);
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,modifiedTime)');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive API request failed: ${res.status} ${body}`);
    }
    const data = await res.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken && files.length < MAX_PHOTOS);
  return files.slice(0, MAX_PHOTOS);
}

function transform(file) {
  const id = file.id;
  return {
    id,
    filename: file.name,
    modifiedTime: file.modifiedTime,
    // Same 3-source fallback order used for event posters — the client
    // tries each in turn and only shows a placeholder if all three fail.
    thumbUrl: `https://lh3.googleusercontent.com/d/${id}=w800`,
    fullUrl: `https://lh3.googleusercontent.com/d/${id}=w1920`,
    fallbackUrls: [
      `https://drive.google.com/thumbnail?id=${id}&sz=w1600`,
      `https://drive.google.com/uc?export=view&id=${id}`,
    ],
  };
}

async function main() {
  // TEMPORARY diagnostics: run both a files.get (known ID) and a files.list
  // (folder query) independently, and always write what happened into
  // gallery.json under _debug — even on success — so the result can be
  // inspected without needing raw Action logs. Remove once the gallery
  // pipeline is confirmed working end to end.
  const debug = { getTest: null, listTest: null };

  try {
    const getUrl = new URL('https://www.googleapis.com/drive/v3/files/1rtaD0rBX4JjP8AXsgeITFTAL1FJJW1Cx');
    getUrl.searchParams.set('key', API_KEY);
    getUrl.searchParams.set('fields', 'id,name,mimeType');
    const getRes = await fetch(getUrl);
    debug.getTest = { status: getRes.status, ok: getRes.ok, body: await getRes.text() };
  } catch (e) {
    debug.getTest = { error: String(e) };
  }

  let files = [];
  try {
    const mimeClause = SUPPORTED_MIME_PREFIXES.map(m => `mimeType = '${m}'`).join(' or ');
    const q = `'${GALLERY_FOLDER_ID}' in parents and (${mimeClause}) and trashed = false`;
    const listUrl = new URL('https://www.googleapis.com/drive/v3/files');
    listUrl.searchParams.set('key', API_KEY);
    listUrl.searchParams.set('q', q);
    listUrl.searchParams.set('orderBy', 'modifiedTime desc');
    listUrl.searchParams.set('pageSize', '100');
    listUrl.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,modifiedTime)');
    const listRes = await fetch(listUrl);
    const bodyText = await listRes.text();
    debug.listTest = { status: listRes.status, ok: listRes.ok, query: q, body: bodyText.slice(0, 2000) };
    if (listRes.ok) {
      const data = JSON.parse(bodyText);
      files = (data.files || []).slice(0, MAX_PHOTOS);
    }
  } catch (e) {
    debug.listTest = { error: String(e) };
  }

  const photos = files.map(transform);

  const output = {
    generatedAt: new Date().toISOString(),
    folder: 'Website Gallery - Approved Photos',
    folderId: GALLERY_FOLDER_ID,
    photos,
    _debug: debug,
  };

  // Always write during diagnostics, regardless of whether content changed,
  // so every run leaves a fresh trail.
  await writeFile(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${photos.length} photos to gallery.json (diagnostic mode)`);
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch(err => { console.error(err); process.exit(1); });
}

export { transform, listFolderImages };
