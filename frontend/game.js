/* =============================================
   LEXIGRAVITY — Full Game Engine
   Features: Adaptive Difficulty, Combos, Power-Ups,
             Leaderboard, Analytics, Particles
   ============================================= */

const API = 'http://localhost:8080/api';

// =============================================
// SCREEN MANAGER
// =============================================
const screens = {};
document.querySelectorAll('.screen').forEach(s => {
  screens[s.id.replace('screen-', '')] = s;
});

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = screens[name];
  if (s) s.classList.add('active');
}

// =============================================
// PARTICLE SYSTEM (Home Screen)
// =============================================
const pCanvas = document.getElementById('particle-canvas');
const pCtx = pCanvas.getContext('2d');
let particles = [];

function resizeParticleCanvas() {
  pCanvas.width  = window.innerWidth;
  pCanvas.height = window.innerHeight;
}

function spawnParticle() {
  return {
    x: Math.random() * pCanvas.width,
    y: Math.random() * pCanvas.height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: -Math.random() * 0.8 - 0.2,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.6 + 0.2,
    color: ['#00f5ff','#bf00ff','#ff006e','#ffea00'][Math.floor(Math.random()*4)],
    life: 1,
    decay: Math.random() * 0.003 + 0.001
  };
}

function initParticles() {
  particles = Array.from({length: 120}, spawnParticle);
}

function animateParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  particles.forEach((p, i) => {
    p.x += p.vx; p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0 || p.y < -10) {
      particles[i] = spawnParticle();
      particles[i].y = pCanvas.height + 10;
      return;
    }
    pCtx.save();
    pCtx.globalAlpha = p.life * p.opacity;
    pCtx.fillStyle = p.color;
    pCtx.shadowColor = p.color;
    pCtx.shadowBlur = 8;
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.restore();
  });
  if (screens.home.classList.contains('active')) {
    requestAnimationFrame(animateParticles);
  }
}

// =============================================
// BG CANVAS (Game Screen)
// =============================================
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let bgAnimId = null;

function resizeBgCanvas() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}

function drawGameBg() {
  const w = bgCanvas.width, h = bgCanvas.height;
  bgCtx.clearRect(0, 0, w, h);

  // Grid
  bgCtx.strokeStyle = 'rgba(0,245,255,0.03)';
  bgCtx.lineWidth = 1;
  const step = 60;
  for (let x = 0; x < w; x += step) {
    bgCtx.beginPath(); bgCtx.moveTo(x,0); bgCtx.lineTo(x,h); bgCtx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    bgCtx.beginPath(); bgCtx.moveTo(0,y); bgCtx.lineTo(w,y); bgCtx.stroke();
  }

  bgAnimId = requestAnimationFrame(drawGameBg);
}

// =============================================
// GAME STATE
// =============================================
const Game = {
  running: false,
  paused: false,
  playerName: 'Anonymous',
  score: 0,
  lives: 3,
  level: 1,
  combo: 0,
  maxCombo: 0,
  wordsTyped: 0,
  correctWords: 0,
  totalWords: 0,
  startTime: 0,
  startDiff: 1,

  // Analytics
  wpm: 0,
  accuracy: 100,

  // Word management
  words: [],
  wordId: 0,
  spawnTimer: null,

  // Power-ups
  activePowerups: {},
  powerupTimer: null,
  currentPowerup: null,

  // Speed control
  baseSpeed: 1.0,
  currentSpeed: 1.0,
};

// Word banks (fallback if API unavailable)
const WORD_BANKS_LOCAL = [
  ['cat','dog','run','sun','hat','big','red','cup','sky','fly','art','map','net','log','box'],
  ['apple','brave','cloud','dream','eagle','flame','grace','honey','ivory','jolly'],
  ['anchor','bridge','castle','dancer','empire','falcon','garden','harbor'],
  ['abstract','century','dynamic','eclipse','gravity','harmony','imagine'],
  ['algorithm','blueprint','chronicle','dimension','eloquence','frequency'],
  ['acknowledge','bibliography','consciousness','demonstration','encyclopedia'],
  ['accomplishment','circumnavigate','disappointment','establishment'],
  ['electromagnetic','extraordinarily','juxtaposition','infrastructure']
];

function getLocalWord(level) {
  const tier = Math.min(level - 1, WORD_BANKS_LOCAL.length - 1);
  const bank = WORD_BANKS_LOCAL[tier];
  return bank[Math.floor(Math.random() * bank.length)];
}

// =============================================
// HOME SCREEN LOGIC
// =============================================
let selectedDiff = 1;

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDiff = parseInt(btn.dataset.diff);
  });
});

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-leaderboard-home').addEventListener('click', () => {
  loadLeaderboard();
  Game._lbPrev = 'home';
  showScreen('leaderboard');
});
document.getElementById('btn-how-to').addEventListener('click', () => showScreen('howto'));
document.getElementById('btn-back-home').addEventListener('click', () => showScreen('home'));

async function startGame() {
  const nameInput = document.getElementById('player-name').value.trim() || 'Anonymous';
  Game.playerName = nameInput;

  // Register player
  try {
    await fetch(`${API}/player`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({name: nameInput})
    });
  } catch {}

  initGame(selectedDiff);
  showScreen('game');

  if (bgAnimId) cancelAnimationFrame(bgAnimId);
  resizeBgCanvas();
  drawGameBg();
  document.getElementById('game-input').focus();
}

// =============================================
// GAME INIT
// =============================================
function initGame(diff) {
  Game.running = true;
  Game.paused = false;
  Game.score = 0;
  Game.lives = 3;
  Game.level = diff;
  Game.startDiff = diff;
  Game.combo = 0;
  Game.maxCombo = 0;
  Game.wordsTyped = 0;
  Game.correctWords = 0;
  Game.totalWords = 0;
  Game.words = [];
  Game.wordId = 0;
  Game.activePowerups = {};
  Game.currentPowerup = null;
  Game.baseSpeed = 0.5 + diff * 0.2;
  Game.currentSpeed = Game.baseSpeed;
  Game.startTime = Date.now();

  updateHUD();
  updateLives();
  document.getElementById('word-field').innerHTML = '';
  document.getElementById('game-input').value = '';
  document.getElementById('active-powerups').innerHTML = '';
  document.getElementById('combo-banner').classList.add('hidden');

  // Remove old powerup
  const existingPU = document.getElementById('powerup-pickup');
  if (existingPU) existingPU.innerHTML = '';

  clearInterval(Game.spawnTimer);
  clearTimeout(Game.powerupTimer);

  scheduleSpawn();
  scheduleRandomPowerup();
  gameLoop();
}

// =============================================
// WORD SPAWNING
// =============================================
function spawnInterval() {
  const base = 2800 - Game.level * 200;
  return Math.max(700, base);
}

function scheduleSpawn() {
  if (!Game.running || Game.paused) return;
  spawnWord();
  const extraWords = Math.floor(Game.level / 3);
  for (let i = 0; i < extraWords; i++) {
    setTimeout(spawnWord, (i + 1) * 400);
  }
  Game.spawnTimer = setTimeout(scheduleSpawn, spawnInterval());
}

async function spawnWord() {
  if (!Game.running || Game.paused) return;
  let word;
  try {
    const res = await fetch(`${API}/words?level=${Game.level}&count=1`);
    const arr = await res.json();
    word = arr[0];
  } catch {
    word = getLocalWord(Game.level);
  }

  const fieldW = window.innerWidth;
  const wordWidth = word.length * 12 + 40;
  const x = Math.random() * (fieldW - wordWidth - 20) + 10;

  const el = document.createElement('div');
  el.className = 'falling-word';
  el.textContent = word;
  el.dataset.word = word;
  el.dataset.id = Game.wordId++;
  el.style.left = x + 'px';
  el.style.top = '0px';

  document.getElementById('word-field').appendChild(el);
  Game.totalWords++;
  Game.words.push({
    id: parseInt(el.dataset.id),
    word,
    el,
    y: 0,
    x
  });
}

// =============================================
// GAME LOOP
// =============================================
let lastFrame = 0;
function gameLoop(ts = 0) {
  if (!Game.running) return;
  const dt = Math.min(ts - lastFrame, 50);
  lastFrame = ts;

  if (!Game.paused) {
    updateWords(dt);
    checkInput();
  }

  requestAnimationFrame(gameLoop);
}

function getEffectiveSpeed() {
  let spd = Game.currentSpeed;
  if (Game.activePowerups.slow) spd *= 0.4;
  if (Game.activePowerups.freeze) spd = 0;
  return spd;
}

function updateWords(dt) {
  const fieldH = window.innerHeight - 140;
  const spd = getEffectiveSpeed();

  Game.words = Game.words.filter(w => {
    if (!w.el.parentNode) return false;
    w.y += spd * (dt / 16);
    w.el.style.top = w.y + 'px';

    const pct = w.y / fieldH;
    if (pct > 0.75) w.el.classList.add('danger');
    else w.el.classList.remove('danger');

    if (w.y >= fieldH) {
      // Word fell!
      w.el.classList.add('word-drop');
      setTimeout(() => w.el.remove(), 300);
      loseLife();
      return false;
    }
    return true;
  });
}

// =============================================
// INPUT HANDLING
// =============================================
const gameInput = document.getElementById('game-input');

gameInput.addEventListener('input', checkInput);
gameInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') togglePause();
});

function checkInput() {
  if (!Game.running || Game.paused) return;
  const typed = gameInput.value.trim().toLowerCase();
  if (!typed) {
    clearInputState();
    clearWordHighlights();
    return;
  }

  // Check for exact match
  const exact = Game.words.find(w => w.word === typed);
  if (exact) {
    wordMatched(exact);
    gameInput.value = '';
    clearInputState();
    clearWordHighlights();
    return;
  }

  // Partial match highlight
  let hasPartial = false;
  Game.words.forEach(w => {
    if (w.word.startsWith(typed)) {
      w.el.classList.add('partial');
      hasPartial = true;
    } else {
      w.el.classList.remove('partial');
    }
  });

  if (typed.length > 0 && !hasPartial) {
    gameInput.classList.add('wrong');
    gameInput.classList.remove('correct');
  } else if (hasPartial) {
    gameInput.classList.remove('wrong');
    gameInput.classList.add('correct');
  }
}

function clearInputState() {
  gameInput.classList.remove('wrong', 'correct');
}

function clearWordHighlights() {
  Game.words.forEach(w => {
    w.el.classList.remove('partial', 'matched');
  });
}

// =============================================
// WORD MATCHED
// =============================================
function wordMatched(wordObj) {
  Game.correctWords++;
  Game.wordsTyped++;
  Game.combo++;
  if (Game.combo > Game.maxCombo) Game.maxCombo = Game.combo;

  // Score calculation
  const basePoints = wordObj.word.length * 10;
  const levelBonus = Game.level * 5;
  const comboMultiplier = Math.min(Game.combo, 10);
  const points = (basePoints + levelBonus) * comboMultiplier;
  Game.score += points;

  // Show score popup
  showScorePopup(wordObj.el, `+${points}`, comboMultiplier > 1 ? `x${comboMultiplier}` : null);

  // Animate word
  wordObj.el.classList.add('matched');
  setTimeout(() => {
    wordObj.el.classList.add('word-explode');
    setTimeout(() => wordObj.el.remove(), 400);
  }, 80);

  Game.words = Game.words.filter(w => w.id !== wordObj.id);

  // Input flash
  document.getElementById('screen-game').classList.add('flash-green');
  setTimeout(() => document.getElementById('screen-game').classList.remove('flash-green'), 300);

  // Combo banners
  if (Game.combo === 5)  showComboBanner('🔥 COMBO x5!');
  if (Game.combo === 10) showComboBanner('⚡ COMBO x10!!');
  if (Game.combo === 20) showComboBanner('💥 UNSTOPPABLE!!');
  if (Game.combo === 30) showComboBanner('🚀 LEGENDARY!!!');

  // Adaptive difficulty
  adaptDifficulty();

  updateHUD();
}

function adaptDifficulty() {
  // Level up every 8 correct words
  const newLevel = Game.startDiff + Math.floor(Game.correctWords / 8);
  if (newLevel > Game.level) {
    Game.level = Math.min(newLevel, 8);
    Game.currentSpeed = Game.baseSpeed + (Game.level - Game.startDiff) * 0.25;
    showComboBanner(`⬆ LEVEL ${Game.level}!`);
  }

  // Update WPM
  const elapsedMin = (Date.now() - Game.startTime) / 60000;
  if (elapsedMin > 0) Game.wpm = Math.round(Game.wordsTyped / elapsedMin);

  // Accuracy
  Game.accuracy = Game.totalWords > 0
    ? Math.round((Game.correctWords / Game.totalWords) * 100)
    : 100;
}

// =============================================
// LOSE LIFE
// =============================================
function loseLife() {
  Game.lives--;
  Game.combo = 0;

  document.getElementById('screen-game').classList.add('flash-red');
  setTimeout(() => document.getElementById('screen-game').classList.remove('flash-red'), 400);

  updateLives();
  updateHUD();

  if (Game.lives <= 0) {
    endGame();
  }
}

function updateLives() {
  const icons = document.querySelectorAll('.life-icon');
  icons.forEach((icon, i) => {
    icon.classList.toggle('lost', i >= Game.lives);
  });
}

// =============================================
// POWER-UPS
// =============================================
const POWERUP_TYPES = [
  {type:'slow',   label:'🐌 SLOW',   duration:5000},
  {type:'freeze', label:'❄️ FREEZE', duration:3000},
  {type:'clear',  label:'💥 CLEAR',  duration:0},
];

function scheduleRandomPowerup() {
  const delay = 12000 + Math.random() * 10000;
  Game.powerupTimer = setTimeout(() => {
    if (Game.running && !Game.paused) spawnPowerup();
  }, delay);
}

function spawnPowerup() {
  const pu = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  const container = document.getElementById('word-field');
  const el = document.createElement('div');
  el.className = `powerup-item ${pu.type}`;
  el.textContent = pu.label;
  el.style.left = (Math.random() * (window.innerWidth - 160) + 20) + 'px';
  el.style.top = (Math.random() * (window.innerHeight * 0.4) + 80) + 'px';
  container.appendChild(el);

  el.addEventListener('click', () => {
    activatePowerup(pu);
    el.remove();
    scheduleRandomPowerup();
  });

  // Auto-remove after 6s
  setTimeout(() => { el.remove(); scheduleRandomPowerup(); }, 6000);
}

function activatePowerup(pu) {
  if (pu.type === 'clear') {
    // Clear all words
    Game.words.forEach(w => {
      w.el.classList.add('word-explode');
      setTimeout(() => w.el.remove(), 400);
    });
    Game.words = [];
    showComboBanner('💥 SCREEN CLEARED!');
    return;
  }

  Game.activePowerups[pu.type] = true;
  renderActivePowerups();

  setTimeout(() => {
    delete Game.activePowerups[pu.type];
    renderActivePowerups();
  }, pu.duration);

  showComboBanner(pu.label + ' ACTIVATED!');
}

function renderActivePowerups() {
  const container = document.getElementById('active-powerups');
  container.innerHTML = '';
  Object.keys(Game.activePowerups).forEach(type => {
    const span = document.createElement('span');
    span.className = `pu-active ${type}`;
    span.textContent = type.toUpperCase();
    container.appendChild(span);
  });
}

// =============================================
// HUD UPDATE
// =============================================
function updateHUD() {
  document.getElementById('hud-score').textContent = Game.score.toLocaleString();
  document.getElementById('hud-level').textContent = Game.level;
  document.getElementById('hud-wpm').textContent = Game.wpm;
  document.getElementById('hud-combo').textContent = `x${Math.min(Game.combo,10)}`;
  document.getElementById('hud-accuracy').textContent = Game.accuracy + '%';
}

// =============================================
// COMBO BANNER
// =============================================
function showComboBanner(text) {
  const banner = document.getElementById('combo-banner');
  banner.textContent = text;
  banner.classList.remove('hidden');
  banner.style.animation = 'none';
  banner.offsetHeight; // reflow
  banner.style.animation = '';
  clearTimeout(banner._t);
  banner._t = setTimeout(() => banner.classList.add('hidden'), 1200);
}

// =============================================
// SCORE POPUP
// =============================================
function showScorePopup(refEl, points, combo) {
  const rect = refEl.getBoundingClientRect();
  const field = document.getElementById('screen-game');
  const popup = document.createElement('div');
  popup.className = 'score-popup';
  popup.textContent = combo ? `${points} ${combo}` : points;
  popup.style.left = rect.left + 'px';
  popup.style.top = (rect.top - 20) + 'px';
  field.appendChild(popup);
  setTimeout(() => popup.remove(), 1000);
}

// =============================================
// PAUSE
// =============================================
document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-quit').addEventListener('click', () => { Game.running = false; showScreen('home'); });

function togglePause() {
  if (!Game.running) return;
  Game.paused = !Game.paused;
  document.getElementById('pause-overlay').classList.toggle('hidden', !Game.paused);
  if (!Game.paused) {
    scheduleSpawn();
    gameLoop();
  } else {
    clearTimeout(Game.spawnTimer);
  }
}

// =============================================
// GAME OVER
// =============================================
async function endGame() {
  Game.running = false;
  clearTimeout(Game.spawnTimer);
  clearTimeout(Game.powerupTimer);
  if (bgAnimId) { cancelAnimationFrame(bgAnimId); bgAnimId = null; }

  // Final analytics
  const elapsed = (Date.now() - Game.startTime) / 60000;
  Game.wpm = elapsed > 0 ? Math.round(Game.wordsTyped / elapsed) : 0;
  Game.accuracy = Game.totalWords > 0
    ? Math.round((Game.correctWords / Game.totalWords) * 100)
    : 100;

  // Show stats
  document.getElementById('go-score').textContent = Game.score.toLocaleString();
  document.getElementById('go-wpm').textContent = Game.wpm;
  document.getElementById('go-acc').textContent = Game.accuracy + '%';
  document.getElementById('go-combo').textContent = Game.maxCombo;
  document.getElementById('go-level').textContent = Game.level;
  document.getElementById('go-words').textContent = Game.wordsTyped;

  showScreen('gameover');

  // Save score
  let rank = null;
  try {
    const res = await fetch(`${API}/score`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        name: Game.playerName,
        score: Game.score,
        wpm: Game.wpm,
        accuracy: Game.accuracy,
        maxCombo: Game.maxCombo,
        wordsTyped: Game.wordsTyped,
        level: Game.level
      })
    });
    // Get leaderboard to determine rank
    const lb = await fetch(`${API}/leaderboard`);
    const data = await lb.json();
    const myRank = data.findIndex(e => e.name === Game.playerName && e.score === Game.score);
    if (myRank !== -1) rank = myRank + 1;
  } catch {}

  const rankEl = document.getElementById('go-rank');
  if (rank) {
    if (rank === 1) rankEl.textContent = '🥇 #1 — TOP OF THE LEADERBOARD!';
    else if (rank === 2) rankEl.textContent = '🥈 #2 — SILVER RANK!';
    else if (rank === 3) rankEl.textContent = '🥉 #3 — BRONZE RANK!';
    else rankEl.textContent = `#${rank} ON THE LEADERBOARD`;
  } else {
    rankEl.textContent = '';
  }
}

// Game Over buttons
document.getElementById('btn-play-again').addEventListener('click', () => {
  initGame(selectedDiff);
  showScreen('game');
  if (bgAnimId) cancelAnimationFrame(bgAnimId);
  resizeBgCanvas();
  drawGameBg();
  document.getElementById('game-input').focus();
});
document.getElementById('btn-leaderboard-go').addEventListener('click', () => {
  Game._lbPrev = 'gameover';
  loadLeaderboard();
  showScreen('leaderboard');
});
document.getElementById('btn-home-go').addEventListener('click', () => showScreen('home'));

// =============================================
// LEADERBOARD
// =============================================
async function loadLeaderboard() {
  document.getElementById('lb-body').innerHTML = '<tr><td colspan="7" class="lb-loading">⟳ Loading...</td></tr>';
  try {
    const res = await fetch(`${API}/leaderboard`);
    const data = await res.json();
    renderLeaderboard(data);
  } catch {
    document.getElementById('lb-body').innerHTML =
      '<tr><td colspan="7" class="lb-loading">⚠ Could not connect to server. Start the Java backend.</td></tr>';
  }
}

function renderLeaderboard(data) {
  const tbody = document.getElementById('lb-body');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="lb-loading">No scores yet — be the first!</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((e,i) => {
    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':e.rank;
    return `<tr>
      <td>${medal}</td>
      <td>${escHtml(e.name)}</td>
      <td>${e.score.toLocaleString()}</td>
      <td>${e.wpm}</td>
      <td>${e.accuracy}%</td>
      <td>x${e.maxCombo}</td>
      <td>${e.level}</td>
    </tr>`;
  }).join('');
}

document.getElementById('btn-lb-back').addEventListener('click', () => {
  showScreen(Game._lbPrev === 'gameover' ? 'gameover' : 'home');
});
document.getElementById('btn-lb-refresh').addEventListener('click', loadLeaderboard);

// =============================================
// UTILS
// =============================================
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =============================================
// INIT
// =============================================
window.addEventListener('resize', () => {
  resizeParticleCanvas();
  resizeBgCanvas();
});

resizeParticleCanvas();
resizeBgCanvas();
initParticles();
animateParticles();
showScreen('home');

// Keep particle animation running on home
const origShow = showScreen;
// Restart particles when home is shown
document.getElementById('btn-home-go')?.addEventListener('click', () => {
  setTimeout(() => { initParticles(); animateParticles(); }, 100);
});
document.getElementById('btn-back-home')?.addEventListener('click', () => {
  setTimeout(() => { initParticles(); animateParticles(); }, 100);
});
