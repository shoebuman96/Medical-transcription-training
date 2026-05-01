const SCORE_ENDPOINT = "https://script.google.com/macros/s/.../exec";
const COURSE_FILE = "medical_transcription_v4_2.html";
const learnerKey = "medicalCourse.learner";
const resultsKey = "medicalCourse.results";

const loginView = document.querySelector("#loginView");
const courseView = document.querySelector("#courseView");
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const localeInput = document.querySelector("#localeInput");
const learnerTitle = document.querySelector("#learnerTitle");
const sheetStatus = document.querySelector("#sheetStatus");
const logoutButton = document.querySelector("#logoutButton");
const courseFrame = document.querySelector("#courseFrame");
const latestScore = document.querySelector("#latestScore");
const latestStatus = document.querySelector("#latestStatus");
const savedRows = document.querySelector("#savedRows");

let lastSubmittedKey = "";

function getLearner() {
  return JSON.parse(localStorage.getItem(learnerKey) || "null");
}

function getResults() {
  return JSON.parse(localStorage.getItem(resultsKey) || "[]");
}

function saveResults(results) {
  localStorage.setItem(resultsKey, JSON.stringify(results));
}

function showCourse(learner) {
  loginView.classList.add("hidden");
  courseView.classList.remove("hidden");
  learnerTitle.textContent = `${learner.username} · ${learner.locale}`;
  courseFrame.src = COURSE_FILE;
  renderStats();
}

function showLogin() {
  courseView.classList.add("hidden");
  loginView.classList.remove("hidden");
}

function renderStats() {
  const results = getResults();
  savedRows.textContent = results.length;

  if (results.length === 0) {
    latestScore.textContent = "--";
    latestStatus.textContent = "Not submitted";
    return;
  }

  latestScore.textContent = `${results[0].score}/${results[0].total}`;
  latestStatus.textContent = results[0].status;
}

function startWatchingCourseFrame() {
  courseFrame.addEventListener("load", () => {
    let frameDocument;

    try {
      frameDocument = courseFrame.contentDocument;
    } catch (error) {
      sheetStatus.textContent = "Cannot read course score unless course file is hosted in the same repository.";
      return;
    }

    if (!frameDocument) {
      return;
    }

    upgradeCourseDesign(frameDocument);

    const observer = new MutationObserver(() => {
      captureScoreFromFrame(frameDocument);
    });

    observer.observe(frameDocument.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
}

function upgradeCourseDesign(frameDocument) {
  if (frameDocument.querySelector("#portalCourseStyles")) {
    return;
  }

  const style = frameDocument.createElement("style");
  style.id = "portalCourseStyles";
  style.textContent = `
    :root {
      --color-text-primary: #172033;
      --color-text-secondary: #667085;
      --color-background-primary: #ffffff;
      --color-background-secondary: #f4f7fb;
      --color-border-primary: #8aa0bd;
      --color-border-secondary: #d5deea;
      --color-border-tertiary: #e6ecf3;
      --border-radius-md: 8px;
      --border-radius-lg: 12px;
    }

    body {
      min-height: 100vh;
      margin: 0;
      background:
        radial-gradient(circle at top left, rgba(29, 158, 117, 0.12), transparent 28rem),
        linear-gradient(180deg, #ffffff 0%, #f7fafc 100%) !important;
      color: #172033;
    }

    #app {
      max-width: 980px;
      margin: 0 auto;
      padding: 24px 20px 40px;
    }

    .screen {
      padding: 24px 0;
    }

    h1 {
      font-size: clamp(1.8rem, 4vw, 3.2rem) !important;
      line-height: 1.05;
      letter-spacing: 0;
      color: #111827;
    }

    h2 {
      margin-top: 32px;
      border-bottom: 1px solid #dde6f2;
      color: #1f2937;
      font-size: 1.25rem;
    }

    h3 {
      color: #475467;
    }

    .subtitle {
      max-width: 680px;
      color: #667085;
      font-size: 1rem;
      line-height: 1.6;
    }

    .lang-grid,
    .module-grid {
      gap: 14px;
    }

    .lang-btn,
    .mod-card,
    .info-card,
    .quiz-q,
    .imaging-card,
    .gloss-entry {
      border: 1px solid #dce5f2 !important;
      border-radius: 12px !important;
      background: rgba(255, 255, 255, 0.96) !important;
      box-shadow: 0 12px 34px rgba(16, 24, 40, 0.08);
    }

    .lang-btn:hover,
    .mod-card:hover {
      border-color: #1D9E75 !important;
      transform: translateY(-1px);
    }

    .mod-card {
      min-height: 112px;
      transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
    }

    .mod-card.completed {
      background: linear-gradient(135deg, rgba(29, 158, 117, 0.1), #ffffff) !important;
      border-color: #1D9E75 !important;
    }

    .mod-icon {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: #eef8f5;
    }

    .progress-bar-wrap {
      height: 10px;
      background: #e8eef7;
    }

    .progress-bar {
      height: 10px;
      background: linear-gradient(135deg, #1D9E75, #4f86f7);
    }

    table {
      overflow: hidden;
      border: 1px solid #dce5f2;
      border-radius: 10px;
      background: #ffffff;
    }

    th {
      background: #eef3f9;
      color: #475467;
      font-weight: 700;
    }

    td {
      border-bottom: 1px solid #edf2f7;
    }

    .btn,
    .quiz-opt,
    .gloss-tag {
      border: 1px solid #d5deea !important;
      border-radius: 10px !important;
      background: #ffffff !important;
      color: #172033 !important;
      box-shadow: 0 4px 14px rgba(16, 24, 40, 0.05);
    }

    .btn:hover,
    .quiz-opt:hover,
    .gloss-tag:hover {
      border-color: #1D9E75 !important;
      background: #f5fbf9 !important;
    }

    .btn-primary {
      border-color: #1D9E75 !important;
      background: linear-gradient(135deg, #1D9E75, #0F6E56) !important;
      color: #ffffff !important;
    }

    .quiz-q p {
      color: #111827;
      font-size: 1rem;
      line-height: 1.5;
    }

    .quiz-opt {
      margin: 8px 0;
      padding: 12px 14px;
      text-align: left;
    }

    .quiz-opt.correct {
      background: #eaf8f2 !important;
      border-color: #1D9E75 !important;
      color: #0f5138 !important;
    }

    .quiz-opt.wrong {
      background: #fff1f1 !important;
      border-color: #d92d20 !important;
      color: #7a271a !important;
    }

    .score-circle {
      box-shadow: 0 16px 40px rgba(16, 24, 40, 0.12);
      background: #ffffff;
    }

    @media (max-width: 640px) {
      #app {
        padding: 16px 12px 28px;
      }

      .lang-grid,
      .module-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  frameDocument.head.appendChild(style);
}

function captureScoreFromFrame(frameDocument) {
  const scoreNumber = frameDocument.querySelector(".score-circle .score-num");
  const scoreLabel = frameDocument.querySelector(".score-circle .score-label");

  if (!scoreNumber || !scoreLabel) {
    return;
  }

  const score = Number(scoreNumber.textContent.trim());
  const total = Number(scoreLabel.textContent.replace("/", "").trim());

  if (!Number.isFinite(score) || !Number.isFinite(total)) {
    return;
  }

  const learner = getLearner();
  const percentage = Math.round((score / total) * 100);
  const passed = score >= 23;
  const submissionKey = `${learner?.username}-${score}-${total}-${percentage}`;

  if (submissionKey === lastSubmittedKey) {
    return;
  }

  lastSubmittedKey = submissionKey;

  submitScore({
    timestamp: new Date().toISOString(),
    username: learner?.username || "Unknown",
    selectedLocale: learner?.locale || "",
    course: "Medical Transcription Training",
    score,
    total,
    percentage,
    passingScore: 23,
    status: passed ? "Passed" : "Needs Review"
  });
}

async function submitScore(result) {
  const results = getResults();
  results.unshift(result);
  saveResults(results);
  renderStats();

  if (!SCORE_ENDPOINT) {
    sheetStatus.textContent = "Score saved locally. Paste your Apps Script URL into app.js to save to Google Sheets.";
    return;
  }

  try {
    await fetch(SCORE_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(result)
    });

    sheetStatus.textContent = "Score sent to Google Sheets.";
  } catch (error) {
    sheetStatus.textContent = "Could not send score. It is saved locally in this browser.";
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const learner = {
    username: usernameInput.value.trim(),
    locale: localeInput.value
  };

  localStorage.setItem(learnerKey, JSON.stringify(learner));
  showCourse(learner);
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(learnerKey);
  showLogin();
});

startWatchingCourseFrame();

const savedLearner = getLearner();

if (savedLearner) {
  showCourse(savedLearner);
} else {
  showLogin();
}
