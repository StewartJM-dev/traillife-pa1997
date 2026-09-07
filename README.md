# Trail Life Troop PA-1997 — website

Static site on GitHub Pages. No build step: edit the HTML/CSS, commit, done.

## How it stays current
- **Events, meetings, lesson topics** come live from the Google Calendar
  "Trail Life Troop PA-1997 Events". Update the calendar and the site updates itself.
  - Titles starting with `PA-1997 Meeting |` show as the next meeting.
  - Titles starting with `Church Use`, `Leadership`, `Internal`, `Committee` are hidden from the public site.
  - Put `TENTATIVE |` at the front of a title to show a "Tentative" tag.
  - Settings live at the top of `script.js` (`SITE_CONFIG`).
- **Event posters** load straight from the Drive files in `04 Events/*`. Share each poster
  (or the whole `04 Events` folder) as "Anyone with the link – Viewer" and they appear.
  As a backup, drop a copy in `images/posters/` using the slug names in `build.py`/`index.html`.

## Files kept from the old site (leave them in place)
`image_0.png` (app icon), `image_7.png` (logo), `image_1.jpeg`–`image_5.jpeg` (leader photos),
`gallery-01.jpeg`–`gallery-20.jpeg`, `resources/*.pdf`, `newsletters/*.pdf`.

## Files replaced
All `.html`, `styles.css`, `script.js`, `sw.js`, `manifest.json`. `story.html` and
`newsletter.html` are folded into About and Resources — delete the old ones.
