(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const screens = ["homeScreen","setupScreen","quizScreen","resultScreen","historyScreen"];
  const letters = ["A","B","C","D"];
  const HISTORY_KEY = "crp-maritime-reviewer-history-v3";

  let exam = "CRP1";
  let mode = "test";
  let quiz = [];
  let index = 0;
  let score = 0;
  let answered = false;
  let lastResult = null;
  let deferredInstallPrompt = null;

  function dataFor(name) {
    if (name === "CRP1") return Array.isArray(window.CRP1_DATA) ? window.CRP1_DATA : [];
    return Array.isArray(window.CRP2_DATA) ? window.CRP2_DATA : [];
  }

  function showScreen(id) {
    screens.forEach(s => $(s).classList.toggle("active", s === id));
    window.scrollTo({top:0, behavior:"smooth"});
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  function prepareQuiz(source, count) {
    const selected = count === "all" ? shuffle(source) : shuffle(source).slice(0, Math.min(Number(count), source.length));
    return selected.map(q => ({
      id:q.id,
      question:q.question,
      choices:shuffle(q.choices.map(c => ({text:c.text, correct:!!c.correct})))
    }));
  }

  function openSetup(name) {
    exam = name;
    const total = dataFor(name).length;
    $("setupExamBadge").textContent = name;
    $("setupTitle").textContent = `Start ${name}`;
    const select = $("countSelect");
    [...select.options].forEach(o => {
      if (o.value !== "all") {
        const n = Number(o.value);
        o.disabled = n > total;
      }
    });
    showScreen("setupScreen");
  }

  function startQuiz() {
    const source = dataFor(exam);
    if (!source.length) {
      alert(`${exam} question data did not load. Please refresh the page.`);
      return;
    }
    mode = $("modeSelect").value;
    quiz = prepareQuiz(source, $("countSelect").value);
    index = 0; score = 0; answered = false;
    $("examLabel").textContent = exam;
    showScreen("quizScreen");
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz[index];
    answered = false;
    $("progressText").textContent = `Question ${index+1} of ${quiz.length}`;
    $("scoreLive").textContent = mode === "practice" ? `${Math.round((score/index)*100) || 0}%` : "";
    $("progressBar").style.width = `${((index)/quiz.length)*100}%`;
    $("sourceNumber").textContent = `Source #${q.id}`;
    $("questionText").textContent = q.question;
    $("feedback").className = "feedback hidden";
    $("feedback").textContent = "";
    $("nextBtn").disabled = true;
    $("nextBtn").textContent = index === quiz.length-1 ? "Finish Test ✓" : "Next Question →";

    const box = $("choices");
    box.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.innerHTML = `<span class="letter">${letters[i]}</span><span class="choice-text"></span>`;
      b.querySelector(".choice-text").textContent = choice.text;
      b.addEventListener("click", () => chooseAnswer(i));
      box.appendChild(b);
    });
  }

  function chooseAnswer(choiceIndex) {
    if (answered) return;
    answered = true;
    const q = quiz[index];
    const buttons = [...$("choices").children];
    const chosen = q.choices[choiceIndex];
    buttons[choiceIndex].classList.add("selected");

    if (chosen.correct) {
      score++;
      buttons[choiceIndex].classList.add("correct");
      $("feedback").className = "feedback good";
      $("feedback").textContent = mode === "practice" ? "✓ Correct answer." : "Answer recorded.";
    } else {
      buttons[choiceIndex].classList.add("wrong");
      const correctIndex = q.choices.findIndex(c => c.correct);
      if (mode === "practice" && correctIndex >= 0) {
        buttons[correctIndex].classList.add("reveal");
        $("feedback").className = "feedback bad";
        $("feedback").textContent = `✗ Incorrect. Correct answer: ${letters[correctIndex]}.`;
      } else {
        $("feedback").className = "feedback";
        $("feedback").textContent = "Answer recorded.";
      }
    }

    $("nextBtn").disabled = false;
  }

  function nextQuestion() {
    if (!answered) return;
    if (index < quiz.length-1) {
      index++;
      renderQuestion();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    const percent = Math.round((score/quiz.length)*100);
    lastResult = {exam, score, total:quiz.length, percent, mode, date:new Date().toISOString()};
    saveHistory(lastResult);
    $("resultScore").textContent = `${percent}%`;
    $("resultDetails").textContent = `You scored ${score} out of ${quiz.length} in ${exam}.`;
    $("resultTitle").textContent = percent >= 80 ? "Excellent Work!" : percent >= 60 ? "Good Work!" : "Keep Practicing";
    $("resultIcon").textContent = percent >= 80 ? "🏆" : percent >= 60 ? "⚓" : "📚";
    showScreen("resultScreen");
  }

  function saveHistory(result) {
    const history = loadHistory();
    history.unshift(result);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0,50)));
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
  }

  function renderHistory() {
    const list = $("historyList");
    const history = loadHistory();
    list.innerHTML = "";
    if (!history.length) {
      list.innerHTML = `<div class="info-card">No tests completed yet.</div>`;
      return;
    }
    history.forEach(r => {
      const item = document.createElement("div");
      item.className = "history-item";
      const date = new Date(r.date);
      item.innerHTML = `<div><strong>${r.exam} • ${r.mode === "practice" ? "Practice" : "Test"}</strong><small>${date.toLocaleString()} • ${r.score}/${r.total}</small></div><div class="history-score">${r.percent}%</div>`;
      list.appendChild(item);
    });
  }

  function clearHistory() {
    if (confirm("Clear all saved test history on this device?")) {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
    }
  }

  function quitQuiz() {
    if (confirm("Quit this test? Your current attempt will not be saved to history.")) showScreen("homeScreen");
  }

  function home() { showScreen("homeScreen"); }

  // Navigation
  document.querySelectorAll(".exam-card").forEach(btn => btn.addEventListener("click", () => openSetup(btn.dataset.exam)));
  $("historyBtn").addEventListener("click", () => { renderHistory(); showScreen("historyScreen"); });
  $("historyBackBtn").addEventListener("click", home);
  $("homeTopBtn").addEventListener("click", home);
  $("setupBackBtn").addEventListener("click", home);
  $("beginBtn").addEventListener("click", startQuiz);
  $("nextBtn").addEventListener("click", nextQuestion);
  $("quitBtn").addEventListener("click", quitQuiz);
  $("retryBtn").addEventListener("click", () => openSetup(lastResult.exam));
  $("resultHomeBtn").addEventListener("click", home);
  $("clearHistoryBtn").addEventListener("click", clearHistory);

  // PWA install prompt
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    $("installBtn").classList.remove("hidden");
  });
  $("installBtn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("installBtn").classList.add("hidden");
  });

  // Register offline service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(console.warn));
  }

  // Startup validation
  if (!dataFor("CRP1").length || !dataFor("CRP2").length) {
    console.warn("One or more CRP question banks did not load.");
  }
})();
