import { transform } from './sync-events.mjs';
import assert from 'node:assert';

const manhuntRaw = {
  id: 'tvh5s8jm570s2fhradi0lev3ng',
  status: 'confirmed',
  summary: 'PA-1997 | Ultimate Manhunt',
  description: "<p>ULTIMATE MANHUNT — Find the Lost Patrol</p>\n<p>No tricks. Just adventure.\nA Better Halloween Alternative.</p>\n<p>Friday, October 30, 2026 • 6:00–9:30 p.m.\nLiving Word Baptist Church, Sweet Valley, PA</p>\n<p>Trail Life Troop PA-1997’s October outdoor-skills capstone. Finder patrols use maps, tracking signs, observation, teamwork, and limited guesses to locate hidden Navigator/Adventurer Lost Patrol sites and recover patrol markers. Lost Patrols remain concealed in assigned quadrants and compete to protect as many markers as possible.</p>\n<p>Planned features: maps, tracking, radios, camouflage, glow-stick quadrant boundaries, campfire base camp, prizes, hot dogs, trail mix, hot apple cider, and Dutch-oven apple crisp.</p>\n<p>Awards include Ultimate Search Patrol, Ultimate Lost Patrol, Ghost of the Woods, and Night Hunter.</p>\n<p>APPROVED POSTER:\nUltimate Manhunt - Find the Lost Patrol - APPROVED.png\nhttps://drive.google.com/file/d/1plY-j__tQ8Hb4KAgzksSdLvqUdhnzDjd/view?usp=drivesdk</p>\n<p>Contact: tltrooppa1997@gmail.com</p>",
  location: 'Living Word Baptist Church, Sweet Valley, PA',
  start: { dateTime: '2026-10-30T18:00:00-04:00', timeZone: 'America/New_York' },
  end: { dateTime: '2026-10-30T21:30:00-04:00', timeZone: 'America/New_York' },
  updated: '2026-09-07T03:00:30Z',
};

const meetingRaw = {
  id: 'lt7n2kh8qaoa5196heo8mg9mfo',
  status: 'confirmed',
  summary: 'PA-1997 Meeting | Science & Technology — Core #2: Science in Weather',
  description: '<p>Approved 2026–27 program calendar.</p>\n<p>Woodlands Trail: Science &amp; Technology — Core #2: Science in Weather\nNavigators &amp; Adventurers: Model Rocketry Badge</p>',
  location: 'Living Word Baptist Church, Sweet Valley, PA',
  start: { dateTime: '2026-09-15T18:00:00-04:00', timeZone: 'America/New_York' },
  end: { dateTime: '2026-09-15T19:30:00-04:00', timeZone: 'America/New_York' },
  updated: '2026-09-02T01:24:23.991Z',
};

const hiddenRaw = {
  id: 'r4hidden',
  status: 'confirmed',
  summary: 'PA-1997 | Trail Life Flyer for Church',
  description: '<p>Pastor requested a flyer.</p>',
  location: 'Living Word Baptist Church, Sweet Valley, PA',
  start: { date: '2026-09-13' },
  end: { date: '2026-09-14' },
};

const cancelledRaw = {
  id: 'r4cancelled',
  status: 'confirmed',
  summary: 'CANCELLED | PA-1997 Meeting | Test Cancelled Event',
  description: '<p>Some description.</p>',
  location: 'Living Word Baptist Church, Sweet Valley, PA',
  start: { dateTime: '2026-09-16T18:00:00-04:00' },
  end: { dateTime: '2026-09-16T19:30:00-04:00' },
};

const manhunt = transform(manhuntRaw);
console.log(JSON.stringify(manhunt, null, 2));

assert.strictEqual(manhunt.poster.fileId, '1plY-j__tQ8Hb4KAgzksSdLvqUdhnzDjd', 'poster fileId');
assert.strictEqual(manhunt.poster.filename, 'Ultimate Manhunt - Find the Lost Patrol - APPROVED.png', 'poster filename');
assert.ok(!manhunt.description.includes('APPROVED POSTER'), 'poster block stripped from description');
assert.ok(manhunt.description.includes('Contact: tltrooppa1997@gmail.com'), 'paragraph AFTER poster block preserved');
assert.ok(manhunt.description.includes('ULTIMATE MANHUNT'), 'first paragraph preserved');
assert.ok(manhunt.description.includes('Dutch-oven apple crisp'), 'middle paragraph preserved');
assert.strictEqual(manhunt.date, '2026-10-30', 'date');
assert.strictEqual(manhunt.startTime, '18:00', 'startTime');
assert.strictEqual(manhunt.endTime, '21:30', 'endTime');
assert.strictEqual(manhunt.displayTitle, 'Ultimate Manhunt', 'displayTitle strips PA-1997 | prefix');
assert.strictEqual(manhunt.isMeeting, false, 'not a meeting');
console.log('✅ Ultimate Manhunt test passed\n');

const meeting = transform(meetingRaw);
assert.strictEqual(meeting.poster, null, 'meeting has no poster');
assert.ok(!meeting.description.includes('Approved 2026'), 'boilerplate line stripped');
assert.strictEqual(meeting.isMeeting, true, 'detected as meeting');
assert.strictEqual(meeting.displayTitle, 'Science & Technology — Core #2: Science in Weather', 'meeting prefix stripped');
console.log('✅ Meeting test passed\n');

const hidden = transform(hiddenRaw);
assert.strictEqual(hidden, null, 'hidden event filtered out');
console.log('✅ Hidden-event filter test passed\n');

const cancelled = transform(cancelledRaw);
assert.strictEqual(cancelled.cancelled, true, 'CANCELLED prefix detected');
assert.strictEqual(cancelled.displayTitle, 'Test Cancelled Event', 'cancelled + meeting prefixes both stripped');
console.log('✅ Cancelled-event test passed\n');

console.log('All tests passed.');
