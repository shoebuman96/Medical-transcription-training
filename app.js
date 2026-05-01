const SCORE_ENDPOINT = "https://script.google.com/macros/s/AKfycbxtxTq30w5c0pYWrk8YH4kLOkp58IfErNKY-2ccv27qSkJDhUiOFypoxHVYPFyHRBgsbw/exec";
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
