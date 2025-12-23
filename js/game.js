const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Aset Gambar
const birdImages = {
  idle: new Image(),
  jump: new Image(),
  fall: new Image(),
  hit: new Image(),
};
birdImages.idle.src = "assets/manyu_idle.png";
birdImages.jump.src = "assets/manyu_jump.png";
birdImages.fall.src = "assets/manyu_fall.png";
birdImages.hit.src = "assets/manyu_hit.png";

const scoreElement = document.getElementById("score");
const homeMenu = document.getElementById("home-menu");
const leaderboardMenu = document.getElementById("leaderboard-menu");
const gameOverMenu = document.getElementById("game-over-menu");
const finalScoreText = document.getElementById("final-score");
const bestScoreText = document.getElementById("best-score");
const leaderboardContent = document.getElementById("leaderboard-content");

function resize() {
  canvas.height = Math.min(window.innerHeight * 0.9, 600);
  canvas.width = Math.min(window.innerWidth * 0.9, 400);
}
resize();

// Variabel Game
let bird, pipes, clouds, stars, frameCount, score, gameRunning, bestScore;
let dayTime = 0; // 0 to 1 (Siang ke Malam)
let dayDirection = 1;

bestScore = parseInt(localStorage.getItem("flappyBestScore")) || 0;
gameRunning = false;

const GRAVITY = 0.25;
const JUMP_STRENGTH = -5;
const PIPE_SPEED = 2;
const PIPE_SPAWN_RATE = 100;
const PIPE_GAP = 150;

class Bird {
  constructor() {
    this.x = 60;
    this.y = canvas.height / 2;
    this.size = 48;
    this.velocity = 0;
    this.state = "idle";
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Rotate bird based on velocity
    let rotation = Math.min(
      Math.PI / 4,
      Math.max(-Math.PI / 4, this.velocity * 0.1)
    );
    ctx.rotate(rotation);

    // Fallback jika image belum load/tidak ada
    try {
      ctx.drawImage(
        birdImages[this.state],
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );
    } catch (e) {
      ctx.fillStyle = "yellow";
      ctx.fillRect(-15, -15, 30, 30);
    }
    ctx.restore();
  }
  update() {
    this.velocity += GRAVITY;
    this.y += this.velocity;
    if (this.velocity < -1) this.state = "jump";
    else if (this.velocity > 1) this.state = "fall";
    else this.state = "idle";

    if (this.y + this.size / 2 > canvas.height) endGame();
    if (this.y - this.size / 2 < 0) {
      this.y = this.size / 2;
      this.velocity = 0;
    }
  }
  jump() {
    this.velocity = JUMP_STRENGTH;
  }
  hit() {
    this.state = "hit";
  }
}

class Pipe {
  constructor() {
    this.topHeight = Math.random() * (canvas.height - PIPE_GAP - 120) + 60;
    this.bottomY = this.topHeight + PIPE_GAP;
    this.x = canvas.width;
    this.width = 55;
    this.passed = false;
  }
  draw() {
    // Top Pipe (Red)
    ctx.fillStyle = "#f44336";
    ctx.fillRect(this.x, 0, this.width, this.topHeight);
    ctx.strokeStyle = "#440000";
    ctx.lineWidth = 3;
    ctx.strokeRect(this.x, 0, this.width, this.topHeight);

    // Bottom Pipe (Green)
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(
      this.x,
      this.bottomY,
      this.width,
      canvas.height - this.bottomY
    );
    ctx.strokeStyle = "#004400";
    ctx.strokeRect(
      this.x,
      this.bottomY,
      this.width,
      canvas.height - this.bottomY
    );
  }
  update() {
    this.x -= PIPE_SPEED;
  }
}

class Cloud {
  constructor(x = null) {
    this.x = x !== null ? x : canvas.width + Math.random() * 100;
    this.y = Math.random() * (canvas.height / 2);
    this.speed = 0.3 + Math.random() * 0.5;
    this.scale = 0.5 + Math.random() * 1;
  }
  draw() {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - dayTime * 0.5)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 20 * this.scale, 0, Math.PI * 2);
    ctx.arc(
      this.x + 20 * this.scale,
      this.y - 10 * this.scale,
      25 * this.scale,
      0,
      Math.PI * 2
    );
    ctx.arc(this.x + 45 * this.scale, this.y, 20 * this.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  update() {
    this.x -= this.speed;
    if (this.x < -100) {
      this.x = canvas.width + 50;
      this.y = Math.random() * (canvas.height / 2);
    }
  }
}

function drawBackground() {
  // Day/Night Gradient
  // Siang: #70c5ce, Malam: #1a1a2e
  const r = Math.floor(112 - (112 - 26) * dayTime);
  const g = Math.floor(197 - (197 - 26) * dayTime);
  const b = Math.floor(206 - (206 - 46) * dayTime);
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bintang (hanya muncul saat malam)
  if (dayTime > 0.5) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(dayTime - 0.5) * 2})`;
    stars.forEach((s) => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Gunung (Static)
  ctx.fillStyle = dayTime > 0.7 ? "#0a2a0a" : "#1b4d3e";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(canvas.width * 0.3, canvas.height * 0.6);
  ctx.lineTo(canvas.width * 0.6, canvas.height);
  ctx.fill();

  ctx.fillStyle = dayTime > 0.7 ? "#051a05" : "#2d5a27";
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.4, canvas.height);
  ctx.lineTo(canvas.width * 0.8, canvas.height * 0.7);
  ctx.lineTo(canvas.width * 1.2, canvas.height);
  ctx.fill();

  // Kota / Siluet Bangunan
  ctx.fillStyle = dayTime > 0.5 ? "#000000" : "#333333";
  const cityY = canvas.height - 40;
  for (let i = 0; i < canvas.width; i += 40) {
    let h = 30 + (i % 30);
    ctx.fillRect(i, canvas.height - h, 35, h);
    // Jendela lampu saat malam
    if (dayTime > 0.8) {
      ctx.fillStyle = "yellow";
      ctx.fillRect(i + 10, canvas.height - h + 10, 5, 5);
      ctx.fillStyle = dayTime > 0.5 ? "#000000" : "#333333";
    }
  }

  clouds.forEach((c) => {
    c.update();
    c.draw();
  });
}

function initStars() {
  stars = [];
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * 400,
      y: Math.random() * 300,
      size: Math.random() * 1.5,
    });
  }
}

function initClouds() {
  clouds = [];
  for (let i = 0; i < 4; i++) {
    clouds.push(new Cloud(Math.random() * canvas.width));
  }
}

function showHome() {
  gameRunning = false;
  homeMenu.classList.remove("hidden");
  leaderboardMenu.classList.add("hidden");
  gameOverMenu.classList.add("hidden");
  scoreElement.classList.add("hidden");
  initClouds();
  initStars();
  drawInitialState();
}

function showLeaderboard() {
  homeMenu.classList.add("hidden");
  leaderboardMenu.classList.remove("hidden");
  leaderboardContent.innerHTML = "";
  const scores = JSON.parse(localStorage.getItem("flappyHistory")) || [];
  scores.sort((a, b) => b - a);
  if (scores.length === 0) {
    leaderboardContent.innerHTML =
      '<p style="text-align:center">Belum ada skor.</p>';
  } else {
    scores.slice(0, 5).forEach((s, i) => {
      leaderboardContent.innerHTML += `<div class="leaderboard-item"><span>Peringkat ${
        i + 1
      }</span><strong>${s}</strong></div>`;
    });
  }
}

function startGame() {
  bird = new Bird();
  pipes = [];
  frameCount = 0;
  score = 0;
  dayTime = 0;
  dayDirection = 1;
  scoreElement.innerText = "0";
  homeMenu.classList.add("hidden");
  leaderboardMenu.classList.add("hidden");
  gameOverMenu.classList.add("hidden");
  scoreElement.classList.remove("hidden");
  gameRunning = true;
  animate();
}

function endGame() {
  if (!gameRunning) return;
  gameRunning = false;
  bird.hit();
  let scores = JSON.parse(localStorage.getItem("flappyHistory")) || [];
  scores.push(score);
  localStorage.setItem("flappyHistory", JSON.stringify(scores));
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("flappyBestScore", bestScore);
  }
  finalScoreText.innerText = `Skor: ${score}`;
  bestScoreText.innerText = `Terbaik: ${bestScore}`;
  gameOverMenu.classList.remove("hidden");
}

function update() {
  if (!gameRunning) return;
  bird.update();

  // Day/Night Cycle speed
  dayTime += 0.001 * dayDirection;
  if (dayTime >= 1 || dayTime <= 0) dayDirection *= -1;

  if (frameCount % PIPE_SPAWN_RATE === 0) pipes.push(new Pipe());

  pipes.forEach((pipe, index) => {
    pipe.update();
    // Collision
    const hb = bird.size * 0.3; // Hitbox sedikit lebih kecil dari visual
    if (bird.x + hb > pipe.x && bird.x - hb < pipe.x + pipe.width) {
      if (bird.y - hb < pipe.topHeight || bird.y + hb > pipe.bottomY) endGame();
    }
    if (!pipe.passed && bird.x > pipe.x + pipe.width) {
      score++;
      scoreElement.innerText = score;
      pipe.passed = true;
    }
    if (pipe.x + pipe.width < 0) pipes.splice(index, 1);
  });
  frameCount++;
}

function draw() {
  drawBackground();
  pipes.forEach((pipe) => pipe.draw());
  bird.draw();
}

function drawInitialState() {
  drawBackground();
  const tempBird = new Bird();
  tempBird.draw();
}

function animate() {
  if (!gameRunning) return;
  update();
  draw();
  requestAnimationFrame(animate);
}

window.addEventListener("keydown", (e) => {
  if ((e.code === "Space" || e.code === "ArrowUp") && gameRunning) bird.jump();
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    if (gameRunning) bird.jump();
  },
  { passive: false }
);

canvas.addEventListener("mousedown", () => {
  if (gameRunning) bird.jump();
});

window.addEventListener("resize", () => {
  resize();
  drawInitialState();
});

// Init
initClouds();
initStars();
drawInitialState();
