const SCORE_ENDPOINT = "https://script.google.com/macros/s/YOUR_URL_HERE/exec";
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

function renderSheetStatus() {
  sheetStatus.textContent = SCORE_ENDPOINT
    ? "Google Sheet connected"
    : "Google Sheet not connected yet";
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
    wireCourseSelectionState(frameDocument);
    wireMissingAnswerHighlighter(frameDocument);
    restoreCourseProgress(frameDocument);
    addTesterShortcuts(frameDocument);

    const observer = new MutationObserver(() => {
      persistCourseProgress(frameDocument);
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

    .quiz-q {
      padding: 18px !important;
    }

    .quiz-q.portal-missing {
      border-color: #f79009 !important;
      background: #fff8eb !important;
      box-shadow: 0 0 0 4px rgba(247, 144, 9, 0.14), 0 12px 34px rgba(16, 24, 40, 0.08);
    }

    .quiz-q.portal-missing::before {
      content: "Answer required";
      display: inline-flex;
      width: fit-content;
      margin-bottom: 10px;
      border-radius: 999px;
      background: #f79009;
      color: #ffffff;
      padding: 4px 10px;
      font-size: 0.76rem;
      font-weight: 850;
    }

    .quiz-q p {
      color: #111827;
      font-size: 1.05rem;
      line-height: 1.5;
      margin-bottom: 14px;
      font-weight: 700;
    }

    .quiz-opt {
      position: relative;
      display: flex !important;
      align-items: center;
      gap: 12px;
      margin: 8px 0;
      padding: 14px 16px 14px 48px;
      text-align: left;
      font-size: 0.95rem;
      line-height: 1.45;
      transition: transform 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s;
    }

    .quiz-opt::before {
      content: "";
      position: absolute;
      left: 16px;
      top: 50%;
      width: 16px;
      height: 16px;
      border: 2px solid #98a7bc;
      border-radius: 50%;
      transform: translateY(-50%);
      background: #ffffff;
    }

    .quiz-opt:hover:not(.disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 28px rgba(16, 24, 40, 0.1);
    }

    .quiz-opt.portal-selected {
      border-color: #4f86f7 !important;
      background: #eef5ff !important;
      color: #12366f !important;
      font-weight: 800 !important;
      box-shadow: 0 10px 28px rgba(79, 134, 247, 0.16);
    }

    .quiz-opt.portal-selected::before {
      border-color: #4f86f7;
      background: #4f86f7;
      box-shadow: inset 0 0 0 4px #ffffff;
    }

    .quiz-opt.disabled {
      cursor: default;
      opacity: 1;
    }

    .quiz-opt.correct {
      background: #eaf8f2 !important;
      border-color: #1D9E75 !important;
      color: #0f5138 !important;
      font-weight: 750;
    }

    .quiz-opt.correct::before {
      content: "✓";
      display: grid;
      place-items: center;
      border-color: #1D9E75;
      background: #1D9E75;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 900;
    }

    .quiz-opt.wrong {
      background: #fff1f1 !important;
      border-color: #d92d20 !important;
      color: #7a271a !important;
      font-weight: 750;
    }

    .quiz-opt.wrong::before {
      content: "×";
      display: grid;
      place-items: center;
      border-color: #d92d20;
      background: #d92d20;
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 900;
    }

    .feedback {
      margin-top: 12px;
      border-radius: 10px;
      padding: 10px 12px;
      line-height: 1.45;
    }

    .score-circle {
      box-shadow: 0 16px 40px rgba(16, 24, 40, 0.12);
      background: #ffffff;
    }

    .portal-test-shortcut {
      margin-top: 12px !important;
      border-style: dashed !important;
      border-color: #4f86f7 !important;
      color: #12366f !important;
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

function wireCourseSelectionState(frameDocument) {
  if (frameDocument.body.dataset.portalSelectionWired === "true") {
    return;
  }

  frameDocument.body.dataset.portalSelectionWired = "true";

  frameDocument.addEventListener("click", (event) => {
    const selectedOption = event.target;

    if (!selectedOption.classList?.contains("quiz-opt")) {
      return;
    }

    if (selectedOption.classList.contains("disabled")) {
      return;
    }

    const question = selectedOption.closest(".quiz-q");

    if (!question) {
      return;
    }

    question.querySelectorAll(".quiz-opt").forEach((option) => {
      option.classList.remove("portal-selected");
    });

    question.classList.remove("portal-missing");
    selectedOption.classList.add("portal-selected");
  }, true);
}

function wireMissingAnswerHighlighter(frameDocument) {
  const frameWindow = frameDocument.defaultView;

  if (!frameWindow || frameWindow.portalAlertWired) {
    return;
  }

  frameWindow.portalAlertWired = true;
  const originalAlert = frameWindow.alert.bind(frameWindow);

  frameWindow.alert = (message) => {
    if (typeof message === "string" && message.includes("remaining question")) {
      highlightMissingQuestions(frameDocument);
      originalAlert(`${message}\n\nMissing question(s) are highlighted in orange.`);
      return;
    }

    originalAlert(message);
  };
}

function courseProgressKey() {
  const learner = getLearner();
  return `medicalCourse.progress.${learner?.username || "guest"}.${learner?.locale || "unknown"}`;
}

function restoreCourseProgress(frameDocument) {
  const frameWindow = frameDocument.defaultView;

  if (!frameWindow || !frameWindow.completed || !frameWindow.T || frameWindow.portalProgressRestored) {
    return;
  }

  frameWindow.portalProgressRestored = true;
  const savedProgress = JSON.parse(localStorage.getItem(courseProgressKey()) || "[]");

  savedProgress.forEach((moduleId) => {
    frameWindow.completed.add(moduleId);
  });

  if (typeof frameWindow.updateProgress === "function") {
    frameWindow.updateProgress();
  }

  if (typeof frameWindow.renderModuleGrid === "function") {
    frameWindow.renderModuleGrid();
  }
}

function persistCourseProgress(frameDocument) {
  const frameWindow = frameDocument.defaultView;

  if (!frameWindow || !frameWindow.completed) {
    return;
  }

  localStorage.setItem(courseProgressKey(), JSON.stringify([...frameWindow.completed]));
}

function addTesterShortcuts(frameDocument) {
  const frameWindow = frameDocument.defaultView;
  const launchWrap = frameDocument.querySelector("#test-launch-wrap");

  if (!frameWindow || !launchWrap || launchWrap.querySelector(".portal-test-shortcut")) {
    return;
  }

  const shortcut = frameDocument.createElement("button");
  shortcut.className = "btn portal-test-shortcut";
  shortcut.type = "button";
  shortcut.textContent = "Show final test";
  shortcut.addEventListener("click", () => {
    if (frameWindow.T?.[frameWindow.lang]?.mods && frameWindow.completed) {
      frameWindow.T[frameWindow.lang].mods.forEach((module) => {
        frameWindow.completed.add(module.id);
      });
      persistCourseProgress(frameDocument);
    }

    if (typeof frameWindow.renderModuleGrid === "function") {
      frameWindow.renderModuleGrid();
    }

    if (typeof frameWindow.openFinalTest === "function") {
      frameWindow.openFinalTest();
    }
  });

  launchWrap.appendChild(shortcut);
}

function highlightMissingQuestions(frameDocument) {
  const questions = [...frameDocument.querySelectorAll(".quiz-q")];

  questions.forEach((question) => {
    const hasSelectedCard = question.querySelector(".quiz-opt.portal-selected");
    const hasOriginalSelection = [...question.querySelectorAll(".quiz-opt")].some((option) => {
      return option.style.fontWeight === "500" || option.style.fontWeight === "bold";
    });
    const alreadyAnsweredAndChecked = question.querySelector(".quiz-opt.correct,.quiz-opt.wrong");

    question.classList.toggle(
      "portal-missing",
      !hasSelectedCard && !hasOriginalSelection && !alreadyAnsweredAndChecked
    );
  });

  const firstMissing = frameDocument.querySelector(".quiz-q.portal-missing");

  if (firstMissing) {
    firstMissing.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }
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
renderSheetStatus();

const savedLearner = getLearner();

if (savedLearner) {
  showCourse(savedLearner);
} else {
  showLogin();
}
