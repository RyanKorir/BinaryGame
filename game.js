'use strict';

// ── Utility ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const POWERS = [128, 64, 32, 16, 8, 4, 2, 1];

// ── State ────────────────────────────────────────────────
let mode = 'classic', difficulty = 'easy';
let score = 0, streak = 0, bestStreak = 0, correctCount = 0, timeBonus = 0;
let timeLeft = 30, timerInterval = null;
let targetValue = 0, bits = [0,0,0,0,0,0,0,0];
let ipAddress = [192,168,1,1], ipOctetIdx = 0;
let lastMode = 'classic';

const DIFF = {
  easy:   { min: 0,   max: 15,  time: 45 },
  medium: { min: 0,   max: 127, time: 35 },
  hard:   { min: 0,   max: 255, time: 25 },
};

// ── Screens ──────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const el = $(id);
  el.style.display = 'flex';
  el.classList.add('active');
}

// ── Home ─────────────────────────────────────────────────
function updateHiScore() {
  const key = `hs_${mode}_${difficulty}`;
  const hs = localStorage.getItem(key);
  $('hiScoreDisplay').textContent = hs ? hs : '—';
}

document.querySelectorAll('.mode-card').forEach(btn => {
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    lastMode = mode;
    updateHiScore();
    startGame();
  });
});

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    difficulty = btn.dataset.diff;
    updateHiScore();
  });
});

// ── Build bit buttons ────────────────────────────────────
function buildBitRow(rowId) {
  const row = $(rowId);
  row.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const btn = document.createElement('button');
    btn.className = 'bit-btn';
    btn.textContent = '0';
    btn.dataset.idx = i;
    btn.addEventListener('click', () => toggleBit(i, rowId));
    row.appendChild(btn);
  }
}

function toggleBit(idx, rowId) {
  bits[idx] = bits[idx] ? 0 : 1;
  renderBits(rowId);
  updateRunningSum(rowId);
}

function renderBits(rowId) {
  const row = $(rowId);
  row.querySelectorAll('.bit-btn').forEach((btn, i) => {
    btn.textContent = bits[i];
    btn.classList.toggle('on', bits[i] === 1);
  });
}

function updateRunningSum(rowId) {
  const val = bitsToInt();
  const sumId = rowId === 'bitRow' ? 'runningSum' : 'runningSumIP';
  $(sumId).innerHTML = `Current value: <strong>${val}</strong>`;
}

function bitsToInt() {
  return bits.reduce((acc, b, i) => acc + b * POWERS[i], 0);
}

function clearBits(rowId) {
  bits = [0,0,0,0,0,0,0,0];
  renderBits(rowId);
  updateRunningSum(rowId);
}

// ── Game Start ───────────────────────────────────────────
function startGame() {
  score = 0; streak = 0; bestStreak = 0; correctCount = 0; timeBonus = 0;
  updateHUD();

  const timerSec = mode === 'blitz' ? 60 : DIFF[difficulty].time;
  timeLeft = timerSec;
  updateTimer();

  // Show correct game area
  ['area-classic','area-reverse','area-ip'].forEach(id => $(id).classList.add('hidden'));
  clearFeedback();

  if (mode === 'classic' || mode === 'blitz') {
    $('area-classic').classList.remove('hidden');
    buildBitRow('bitRow');
    $('challengeLabel').textContent = 'Convert to binary:';
    nextChallenge();
  } else if (mode === 'reverse') {
    $('area-reverse').classList.remove('hidden');
    nextChallenge();
  } else if (mode === 'ip') {
    $('area-ip').classList.remove('hidden');
    buildBitRow('bitRowIP');
    ipAddress = generateIP();
    ipOctetIdx = 0;
    renderIPDisplay();
    nextIPOctet();
  }

  showScreen('screen-game');
  startTimer(timerSec);
}

// ── Timer ────────────────────────────────────────────────
function startTimer(seconds) {
  clearInterval(timerInterval);
  $('progressBar').style.transition = `width ${seconds}s linear`;
  $('progressBar').style.width = '100%';
  $('progressBar').classList.remove('urgent');
  // Trigger reflow so transition fires
  void $('progressBar').offsetWidth;
  $('progressBar').style.width = '0%';

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 10) $('progressBar').classList.add('urgent');
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function updateTimer() {
  $('timerDisplay').textContent = timeLeft;
}

function updateHUD() {
  $('scoreDisplay').textContent = score;
  $('streakDisplay').textContent = streak;
}

// ── Challenges ───────────────────────────────────────────
function randTarget() {
  const { min, max } = DIFF[difficulty];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextChallenge() {
  clearFeedback();
  targetValue = randTarget();

  if (mode === 'classic' || mode === 'blitz') {
    clearBits('bitRow');
    $('targetNumber').textContent = targetValue;
    $('targetNumber').className = 'target-number';
  } else if (mode === 'reverse') {
    const bin = targetValue.toString(2).padStart(8, '0');
    $('binaryDisplay').textContent = bin;
    $('reverseInput').value = '';
    $('reverseInput').focus();
  }
}

function generateIP() {
  return [
    Math.floor(Math.random()*223)+1,
    Math.floor(Math.random()*255),
    Math.floor(Math.random()*255),
    Math.floor(Math.random()*255)
  ];
}

function renderIPDisplay() {
  for (let i = 0; i < 4; i++) {
    const el = $(`ipOct${i}`);
    el.textContent = ipAddress[i];
    el.classList.toggle('active-oct', i === ipOctetIdx);
  }
}

function nextIPOctet() {
  clearBits('bitRowIP');
  clearFeedback();
  const val = ipAddress[ipOctetIdx];
  targetValue = val;
  $('ipTarget').textContent = val;
  renderIPDisplay();
}

// ── Submit logic ─────────────────────────────────────────
function checkClassic() {
  const answer = bitsToInt();
  if (answer === targetValue) handleCorrect('bitRow', 'feedback');
  else handleWrong('bitRow', 'feedback', targetValue.toString(2).padStart(8,'0'));
}

function checkReverse() {
  const answer = parseInt($('reverseInput').value, 10);
  if (isNaN(answer)) { showFeedback('feedbackR', 'Enter a number!', 'wrong'); return; }
  if (answer === targetValue) handleCorrect(null, 'feedbackR');
  else handleWrong(null, 'feedbackR', targetValue);
}

function checkIP() {
  const answer = bitsToInt();
  if (answer === targetValue) {
    showFeedback('feedbackIP', '✓ Correct!', 'correct');
    tallyCorrect();
    ipOctetIdx++;
    if (ipOctetIdx >= 4) {
      // Full IP done — generate new one
      ipAddress = generateIP();
      ipOctetIdx = 0;
      setTimeout(() => { nextIPOctet(); renderIPDisplay(); }, 700);
    } else {
      setTimeout(() => nextIPOctet(), 700);
    }
  } else {
    const correct = targetValue.toString(2).padStart(8,'0');
    handleWrong('bitRowIP', 'feedbackIP', correct);
  }
}

function handleCorrect(rowId, feedbackId) {
  tallyCorrect();
  showFeedback(feedbackId, '✓ Correct!', 'correct');
  if (rowId) {
    const el = $('targetNumber');
    if (el) { el.classList.remove('flash-wrong'); void el.offsetWidth; el.classList.add('flash-correct'); }
  }
  setTimeout(() => nextChallenge(), 600);
}

function handleWrong(rowId, feedbackId, correctAnswer) {
  streak = 0;
  updateHUD();
  showFeedback(feedbackId, `✗ Answer: ${correctAnswer}`, 'wrong');
  if ($('targetNumber')) {
    const el = $('targetNumber');
    el.classList.remove('flash-correct'); void el.offsetWidth; el.classList.add('flash-wrong');
  }
  setTimeout(() => nextChallenge(), 900);
}

function tallyCorrect() {
  correctCount++;
  streak++;
  if (streak > bestStreak) bestStreak = streak;
  const pts = 10 + (streak > 1 ? (streak - 1) * 5 : 0);
  score += pts;
  updateHUD();
}

// ── Feedback ─────────────────────────────────────────────
function showFeedback(id, msg, cls) {
  const el = $(id);
  el.textContent = msg;
  el.className = `feedback ${cls}`;
}
function clearFeedback() {
  ['feedback','feedbackR','feedbackIP'].forEach(id => {
    const el = $(id);
    if (el) { el.textContent = ''; el.className = 'feedback'; }
  });
}

// ── Submit buttons ────────────────────────────────────────
$('submitBtn').addEventListener('click', checkClassic);
$('submitBtnR').addEventListener('click', checkReverse);
$('submitBtnIP').addEventListener('click', checkIP);

$('reverseInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') checkReverse();
});

// ── End Game ─────────────────────────────────────────────
function endGame() {
  clearInterval(timerInterval);
  timeBonus = Math.max(0, timeLeft * 2);
  const totalScore = score + timeBonus;

  // Hi score
  const key = `hs_${lastMode}_${difficulty}`;
  const prev = parseInt(localStorage.getItem(key) || '0', 10);
  const isNewPB = totalScore > prev;
  if (isNewPB) localStorage.setItem(key, totalScore);

  // Result screen
  $('resultEmoji').textContent = totalScore >= 100 ? '🏆' : totalScore >= 50 ? '🎯' : '💪';
  $('resultTitle').textContent = totalScore >= 100 ? 'Outstanding!' : totalScore >= 50 ? 'Nice work!' : 'Keep practising!';
  $('finalScore').textContent = totalScore;
  $('finalStreak').textContent = bestStreak;
  $('finalCorrect').textContent = correctCount;
  $('finalBonus').textContent = `+${timeBonus}`;
  const pbRow = $('pbRow');
  if (isNewPB) pbRow.removeAttribute('hidden');
  else pbRow.setAttribute('hidden', '');

  showScreen('screen-result');
}

// ── Result buttons ────────────────────────────────────────
$('playAgainBtn').addEventListener('click', () => {
  mode = lastMode;
  startGame();
});
$('menuBtn').addEventListener('click', () => {
  clearInterval(timerInterval);
  updateHiScore();
  showScreen('screen-home');
});
$('backBtn').addEventListener('click', () => {
  clearInterval(timerInterval);
  updateHiScore();
  showScreen('screen-home');
});

// ── Init ─────────────────────────────────────────────────
updateHiScore();
showScreen('screen-home');
