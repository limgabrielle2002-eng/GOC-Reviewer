(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    bank: null,
    name: '',
    length: 50,
    mode: 'test',
    questions: [],
    index: 0,
    score: 0,
    answered: 0,
    selected: false,
    currentAnswered: false
  };

  const banks = {
    CRP1: () => window.CRP1_DATA,
    CRP2: () => window.CRP2_DATA
  };

  function show(id) {
    $$('.screen').forEach(el => el.classList.remove('active'));
    const screen = $('#' + id);
    if (!screen) return;
    screen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function shuffle(array) {
    const a = Array.isArray(array) ? array.slice() : [];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getBank(name) {
    try {
      const bank = banks[name] && banks[name]();
      if (!Array.isArray(bank) || bank.length === 0) {
        throw new Error(name + ' question bank did not load.');
      }
      return bank;
    } catch (error) {
      console.error(error);
      alert('The ' + name + ' question bank could not be loaded. Please refresh the page and try again.');
      return null;
    }
  }

  function openSetup(name) {
    const bank = getBank(name);
    if (!bank) return;

    state.name = name;
    state.bank = bank;
    state.length = 50;
    state.mode = 'test';

    const title = $('#setupTitle');
    const desc = $('#setupDescription');
    if (title) title.textContent = name;
    if (desc) {
      desc.textContent = name === 'CRP1'
        ? `${bank.length} questions from the uploaded CRP1 PDF. The source does not contain a marked answer key, so CRP1 uses self-marking.`
        : `${bank.length} questions from the uploaded CRP2 PDF. Marked answers in the source are used for automatic scoring.`;
    }

    $$('#lengthOptions button').forEach(b => b.classList.toggle('selected', b.dataset.length === '50'));
    $$('.mode').forEach(b => b.classList.toggle('selected', b.dataset.mode === 'test'));
    show('setup');
  }

  function startQuiz() {
    if (!Array.isArray(state.bank) || !state.bank.length) {
      alert('Please select CRP1 or CRP2 first.');
      show('home');
      return;
    }

    let pool = shuffle(state.bank);
    if (state.length !== 'all') {
      const requested = Number(state.length) || 50;
      pool = pool.slice(0, Math.min(requested, pool.length));
    }

    state.questions = pool.map(q => ({
      ...q,
      choices: shuffle(Array.isArray(q.choices) ? q.choices : [])
    }));
    state.index = 0;
    state.score = 0;
    state.answered = 0;
    state.selected = false;
    state.currentAnswered = false;

    if (!state.questions.length) {
      alert('No questions are available.');
      return;
    }

    show('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.questions[state.index];
    if (!q) return finishQuiz();

    state.selected = false;
    state.currentAnswered = false;

    $('#quizName').textContent = state.name;
    $('#quizCounter').textContent = `Question ${state.index + 1} of ${state.questions.length}`;
    $('#sourceNum').textContent = `Source #${q.id}`;
    $('#modeLabel').textContent = state.mode.toUpperCase();
    $('#scorePill').textContent = `${state.score} correct`;
    $('#progressBar').style.width = `${((state.index) / state.questions.length) * 100}%`;
    $('#questionText').textContent = q.question || '';

    const feedback = $('#feedback');
    feedback.className = 'feedback';
    feedback.textContent = '';

    const next = $('#nextBtn');
    next.disabled = true;
    next.textContent = state.index === state.questions.length - 1 ? 'Finish →' : 'Next →';

    const wrap = $('#choices');
    wrap.innerHTML = '';

    q.choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';

      const letter = document.createElement('span');
      letter.className = 'letter';
      letter.textContent = String.fromCharCode(65 + i);

      const text = document.createElement('span');
      text.textContent = choice && choice.text != null ? String(choice.text) : '';

      btn.append(letter, text);
      btn.addEventListener('click', () => choose(i, btn, choice));
      wrap.appendChild(btn);
    });
  }

  function choose(index, button, choice) {
    if (state.selected) return;

    state.selected = true;
    state.currentAnswered = true;
    state.answered++;

    $$('.choice').forEach(b => { b.disabled = true; });
    button.classList.add('selected');

    const q = state.questions[state.index];
    const correctIndex = q.choices.findIndex(c => c && c.correct === true);

    if (state.name === 'CRP2' && correctIndex >= 0) {
      if (choice && choice.correct === true) {
        state.score++;
        button.classList.add('correct');
        setFeedback('Correct!', 'ok');
      } else {
        button.classList.add('wrong');
        const correctButton = $$('.choice')[correctIndex];
        if (correctButton) correctButton.classList.add('correct');
        const correctText = q.choices[correctIndex].text;
        setFeedback(`Incorrect. Correct answer: ${String.fromCharCode(65 + correctIndex)}. ${correctText}`, 'bad');
      }
    } else {
      setFeedback('CRP1 has no answer key in the uploaded PDF. Mark your answer below.', '');
      addManualButtons();
    }

    $('#scorePill').textContent = `${state.score} correct`;
    $('#nextBtn').disabled = false;
  }

  function addManualButtons() {
    const f = $('#feedback');
    const note = f.textContent;
    f.innerHTML = '';
    const text = document.createElement('span');
    text.textContent = note + ' ';

    const wrap = document.createElement('span');
    wrap.className = 'manual';

    const right = document.createElement('button');
    right.type = 'button';
    right.className = 'secondary';
    right.textContent = 'I got it right';
    right.addEventListener('click', () => manual(true));

    const wrong = document.createElement('button');
    wrong.type = 'button';
    wrong.className = 'danger';
    wrong.textContent = 'I got it wrong';
    wrong.addEventListener('click', () => manual(false));

    wrap.append(right, wrong);
    f.append(text, wrap);
  }

  function manual(correct) {
    if (correct) {
      state.score++;
      $('#scorePill').textContent = `${state.score} correct`;
      setFeedback('Marked correct.', 'ok');
    } else {
      setFeedback('Marked incorrect.', 'bad');
    }
    $$('.manual button').forEach(b => { b.disabled = true; });
  }

  function setFeedback(text, className) {
    const f = $('#feedback');
    f.textContent = text;
    f.className = 'feedback ' + (className || '');
  }

  function finishQuiz(incomplete = false) {
    const total = state.questions.length;
    const pct = total ? Math.round((state.score / total) * 100) : 0;
    const record = {
      name: state.name,
      score: state.score,
      total,
      pct,
      incomplete,
      date: new Date().toISOString(),
      mode: state.mode
    };

    try {
      const history = JSON.parse(localStorage.getItem('crpHistory') || '[]');
      history.unshift(record);
      localStorage.setItem('crpHistory', JSON.stringify(history.slice(0, 100)));
    } catch (error) {
      console.warn('History could not be saved:', error);
    }

    $('#resultTitle').textContent = incomplete ? 'Attempt Saved' : 'Excellent work!';
    $('#resultScore').textContent = `${state.score}/${total}`;
    $('#resultDetails').textContent = `${pct}% • ${state.name} • ${state.mode === 'test' ? 'Test' : 'Study'}${incomplete ? ' • Incomplete' : ''}`;
    show('result');
  }

  function renderHistory() {
    let history = [];
    try { history = JSON.parse(localStorage.getItem('crpHistory') || '[]'); } catch (_) {}

    const el = $('#historyList');
    if (!history.length) {
      el.innerHTML = '<div class="empty">No attempts yet. Start CRP1 or CRP2 to build your history.</div>';
      return;
    }

    el.innerHTML = history.map(x => `
      <div class="history-item">
        <div><strong>${escapeHtml(x.name)} ${x.incomplete ? '• Incomplete' : ''}</strong>
        <small>${new Date(x.date).toLocaleString()} • ${escapeHtml(x.mode)}</small></div>
        <div class="history-score">${x.score}/${x.total}<small> ${x.pct}%</small></div>
      </div>`).join('');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[m]));
  }

  function bindEvents() {
    $$('[data-start]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        openSetup(button.dataset.start);
      });
    });

    $('#homeBtn').addEventListener('click', () => show('home'));
    $('#setupBack').addEventListener('click', () => show('home'));
    $('#historyBtn').addEventListener('click', () => { renderHistory(); show('history'); });
    $('#historyBack').addEventListener('click', () => show('home'));
    $('#beginBtn').addEventListener('click', startQuiz);
    $('#retryBtn').addEventListener('click', () => openSetup(state.name));
    $('#resultHomeBtn').addEventListener('click', () => show('home'));

    $('#lengthOptions').addEventListener('click', event => {
      const button = event.target.closest('button[data-length]');
      if (!button) return;
      state.length = button.dataset.length;
      $$('#lengthOptions button').forEach(b => b.classList.toggle('selected', b === button));
    });

    $$('.mode').forEach(button => button.addEventListener('click', () => {
      $$('.mode').forEach(x => x.classList.remove('selected'));
      button.classList.add('selected');
      state.mode = button.dataset.mode;
    }));

    $('#nextBtn').addEventListener('click', () => {
      if (!state.selected) return;
      if (state.index < state.questions.length - 1) {
        state.index++;
        renderQuestion();
      } else {
        finishQuiz();
      }
    });

    $('#skipBtn').addEventListener('click', () => {
      if (state.selected) return;
      state.answered++;
      if (state.index < state.questions.length - 1) {
        state.index++;
        renderQuestion();
      } else {
        finishQuiz();
      }
    });

    $('#quitBtn').addEventListener('click', () => {
      if (confirm('Quit this test? The attempt will be recorded as incomplete.')) finishQuiz(true);
    });

    $('#clearHistory').addEventListener('click', () => {
      if (confirm('Clear all saved history?')) {
        localStorage.removeItem('crpHistory');
        renderHistory();
      }
    });
  }

  function init() {
    try {
      bindEvents();
      console.log('CRP Reviewer initialized. CRP1:', Array.isArray(window.CRP1_DATA) ? window.CRP1_DATA.length : 'not loaded', 'CRP2:', Array.isArray(window.CRP2_DATA) ? window.CRP2_DATA.length : 'not loaded');
    } catch (error) {
      console.error('CRP Reviewer initialization failed:', error);
      alert('The reviewer could not initialize. Please refresh the page.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
