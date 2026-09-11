/* ---------- Scripture Challenge: data ---------- */
/* All passage references are the official Trail Life USA Scripture Memory
   Challenge passages (KJV). Full verse text is intentionally left out until
   PA-1997 adds KJV wording — references + Branch are enough to start.
   rememberMeUrl values are placeholders: paste each level's public
   Remember Me collection share link in when it's created. */
const scriptureLevels = {
  fox: {
    label: "Fox",
    img: "images/patrols/fox.png",
    ages: "Ages 5–6",
    pacing: "PA-1997's pacing goal: 4 of these 7 passages during one year as a Fox, the remaining 3 during the other. Boys may go faster if they want to.",
    passages: [
      { ref: "Deuteronomy 6:4–5", branch: "Heritage Branch" },
      { ref: "John 1:1–2", branch: "Values Branch" },
      { ref: "Matthew 6:5", branch: "Outdoor Skills Branch" },
      { ref: "Psalm 8:1–2", branch: "Science & Technology Branch" },
      { ref: "Psalm 23:1–3", branch: "Life Skills Branch" },
      { ref: "Psalm 100:1–2", branch: "Hobbies Branch" },
      { ref: "Titus 3:3", branch: "Sports & Fitness Branch" }
    ],
    rememberMeUrl: ""
  },
  hawk: {
    label: "Hawk",
    img: "images/patrols/hawk.png",
    ages: "Ages 7–8",
    pacing: "PA-1997's pacing goal: 4 of these 7 passages during one year as a Hawk, the remaining 3 during the other. Boys may go faster if they want to.",
    passages: [
      { ref: "Deuteronomy 6:4–7", branch: "Heritage Branch" },
      { ref: "John 1:1–5", branch: "Values Branch" },
      { ref: "Matthew 6:5–8", branch: "Outdoor Skills Branch" },
      { ref: "Psalm 8:1–5", branch: "Science & Technology Branch" },
      { ref: "Psalm 23:1–4", branch: "Life Skills Branch" },
      { ref: "Psalm 100:1–3", branch: "Hobbies Branch" },
      { ref: "Titus 3:3–6", branch: "Sports & Fitness Branch" }
    ],
    rememberMeUrl: ""
  },
  mountainLion: {
    label: "Mountain Lion",
    img: "images/patrols/mountain-lion.png",
    ages: "Ages 9–10",
    pacing: "PA-1997's pacing goal: 4 of these 7 passages during one year as a Mountain Lion, the remaining 3 during the other. Boys may go faster if they want to.",
    passages: [
      { ref: "Deuteronomy 6:4–9", branch: "Heritage Branch" },
      { ref: "John 1:1–5, 14", branch: "Values Branch" },
      { ref: "Matthew 6:5–13", branch: "Outdoor Skills Branch" },
      { ref: "Psalm 8:1–9", branch: "Science & Technology Branch" },
      { ref: "Psalm 23:1–6", branch: "Life Skills Branch" },
      { ref: "Psalm 100:1–5", branch: "Hobbies Branch" },
      { ref: "Titus 3:3–8", branch: "Sports & Fitness Branch" }
    ],
    rememberMeUrl: ""
  },
  navigator: {
    label: "Navigator",
    img: "images/patrols/navigator.png",
    ages: "Ages 11–13",
    pacing: "",
    passages: [
      { ref: "1 Kings 18:30–40", branch: "Fire Ranger" },
      { ref: "Deuteronomy 8:1–10", branch: "Camping" },
      { ref: "Ecclesiastes 4:9–12", branch: "Ropework" },
      { ref: "Ephesians 2:1–10", branch: "Trail Skills" },
      { ref: "John 21:9–17", branch: "Outdoor Cooking" },
      { ref: "Luke 10:25–37", branch: "First Aid" },
      { ref: "Matthew 14:22–33", branch: "Aquatics" },
      { ref: "Psalm 1:1–6", branch: "Woods Tools" },
      { ref: "Revelation 5:9–14", branch: "Our Flag" }
    ],
    rememberMeUrl: ""
  },
  adventurer: {
    label: "Adventurer",
    img: "images/patrols/adventurer.png",
    ages: "Ages 14–17",
    pacing: "",
    passages: [
      { ref: "1 Timothy 2:1–6", branch: "Citizenship" },
      { ref: "2 Timothy 2:1–7", branch: "Fitness" },
      { ref: "Ecclesiastes 3:9–15", branch: "Outdoor Life" },
      { ref: "Ephesians 6:1–9", branch: "Family Man" },
      { ref: "Luke 12:35–40", branch: "Emergency Preparedness" },
      { ref: "Matthew 25:14–30", branch: "Personal Resources" }
    ],
    rememberMeUrl: ""
  }
};

/* ---------- Scripture Challenge: page interaction ---------- */
(function () {
  const picker = document.getElementById("levelPicker");
  const detail = document.getElementById("scriptureDetail");
  if (!picker || !detail) return; // not on this page

  const passageGrid = document.getElementById("passageGrid");
  const pacingNote = document.getElementById("pacingNote");
  const detailLevelName = document.getElementById("detailLevelName");
  const detailAges = document.getElementById("detailAges");
  const embedWrap = document.getElementById("practiceEmbed");
  const fallbackLink = document.getElementById("practiceFallback");

  function renderLevel(key) {
    const level = scriptureLevels[key];
    if (!level) return;

    // Button pressed state
    picker.querySelectorAll(".level-btn").forEach(btn => {
      btn.setAttribute("aria-pressed", btn.dataset.level === key ? "true" : "false");
    });

    detailLevelName.textContent = level.label;
    detailAges.textContent = level.ages;

    if (level.pacing) {
      pacingNote.textContent = level.pacing;
      pacingNote.style.display = "";
    } else {
      pacingNote.style.display = "none";
    }

    passageGrid.innerHTML = level.passages.map(p =>
      `<div class="passage-card"><div class="ref">${p.ref}</div><div class="branch">${p.branch}</div></div>`
    ).join("");

    // Only one Remember Me collection embedded at a time, for mobile
    // performance — this replaces whatever was there before.
    if (level.rememberMeUrl) {
      embedWrap.innerHTML = `<iframe src="${level.rememberMeUrl}" title="${level.label} Scripture Challenge practice — Remember Me" loading="lazy"></iframe>`;
      fallbackLink.href = level.rememberMeUrl;
      fallbackLink.classList.remove("is-disabled");
      fallbackLink.removeAttribute("aria-disabled");
    } else {
      embedWrap.innerHTML = `<div class="practice-placeholder">Practice collection for ${level.label} is coming soon.</div>`;
      fallbackLink.href = "#";
      fallbackLink.classList.add("is-disabled");
      fallbackLink.setAttribute("aria-disabled", "true");
    }

    detail.classList.add("is-active");
    detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  picker.querySelectorAll(".level-btn").forEach(btn => {
    btn.addEventListener("click", () => renderLevel(btn.dataset.level));
  });
})();
