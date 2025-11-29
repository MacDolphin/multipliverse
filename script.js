// Global State
let currentLang = "zh-Hant";
let currentGame = null;

// --- Localization ---
function updateTexts() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (translations[currentLang][key]) {
            el.innerHTML = translations[currentLang][key];
        }
    });
    document.getElementById("lang-toggle").textContent = translations[currentLang].toggleLang;

    // Refresh specific dynamic texts if needed
    if (currentGame === 'array') updateArrayInfo();
}

function toggleLanguage() {
    currentLang = currentLang === "zh-Hant" ? "en" : "zh-Hant";
    document.documentElement.lang = currentLang;
    updateTexts();
}

// --- Navigation ---
function showGame(gameId) {
    currentGame = gameId;
    document.getElementById("menu").classList.add("hidden");
    document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    document.getElementById("game-" + gameId).classList.remove("hidden");

    if (gameId === 'array') initArrayGame();
    if (gameId === 'monster') initMonsterGame();
    if (gameId === 'quiz') resetQuizUI();
    if (gameId === 'time') resetTimeUI();
    if (gameId === 'stars') resetStarsUI();
}

function backToMenu() {
    currentGame = null;
    document.getElementById("menu").classList.remove("hidden");
    document.querySelectorAll(".game-container").forEach(el => el.classList.add("hidden"));
    stopAllTimers();
}

function stopAllTimers() {
    clearInterval(timeAttackInterval);
    cancelAnimationFrame(starsAnimFrame);
}

// --- Array Garden ---
let arraySelected = [];
let arrayTargetRows = 2;
let arrayTargetCols = 3;

function initArrayGame() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    arraySelected = [];
    for (let i = 0; i < 100; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.onclick = () => toggleArrayCell(i, cell);
        grid.appendChild(cell);
    }
    newArrayTask();
}

function toggleArrayCell(i, cell) {
    const idx = arraySelected.indexOf(i);
    if (idx === -1) {
        arraySelected.push(i);
        cell.classList.add("filled");
    } else {
        arraySelected.splice(idx, 1);
        cell.classList.remove("filled");
    }
    updateArrayInfo();
}

function updateArrayInfo() {
    document.getElementById("current-count").textContent = arraySelected.length;

    if (arraySelected.length === 0) {
        document.getElementById("current-array").textContent = "？ × ？";
        document.getElementById("current-total").textContent = "0";
        return;
    }

    const rows = new Set(arraySelected.map(i => Math.floor(i / 10)));
    const cols = new Set(arraySelected.map(i => i % 10));
    document.getElementById("current-array").textContent = `${rows.size} × ${cols.size}`;
    document.getElementById("current-total").textContent = arraySelected.length;
}

function newArrayTask() {
    arrayTargetRows = 2 + Math.floor(Math.random() * 4);
    arrayTargetCols = 2 + Math.floor(Math.random() * 4);
    const t = translations[currentLang];
    document.getElementById("target-rc-text").textContent =
        `${arrayTargetRows} ${t.targetText.split('×')[0]} × ${arrayTargetCols} ${t.targetText.split('×')[1]} (${arrayTargetRows * arrayTargetCols})`;

    arraySelected = [];
    document.querySelectorAll(".cell").forEach(c => c.classList.remove("filled"));
    updateArrayInfo();
    document.getElementById("array-feedback").textContent = "";
}

function checkArray() {
    const t = translations[currentLang];
    const fb = document.getElementById("array-feedback");

    if (arraySelected.length === 0) {
        fb.textContent = t.arrayFeedbackEmpty;
        return;
    }

    const rows = new Set(arraySelected.map(i => Math.floor(i / 10))).size;
    const cols = new Set(arraySelected.map(i => i % 10)).size;
    const total = arraySelected.length;

    if (rows === arrayTargetRows && cols === arrayTargetCols && total === rows * cols) {
        fb.textContent = t.arrayFeedbackSuccess;
        fb.style.color = "var(--success-color)";
    } else if (rows === arrayTargetRows && cols === arrayTargetCols) {
        fb.textContent = t.arrayFeedbackShape;
        fb.style.color = "var(--error-color)";
    } else {
        fb.textContent = t.arrayFeedbackWrong;
        fb.style.color = "var(--error-color)";
    }
}

// --- Quiz ---
let quizData = { min: 2, max: 9, current: 0, total: 10, score: 0 };

function resetQuizUI() {
    document.getElementById("quiz-menu").classList.remove("hidden");
    document.getElementById("quiz-play").classList.add("hidden");
}

function startQuiz(min, max) {
    quizData = { min, max, current: 0, total: 10, score: 0 };
    document.getElementById("quiz-menu").classList.add("hidden");
    document.getElementById("quiz-play").classList.remove("hidden");
    nextQuizQuestion();
}

function nextQuizQuestion() {
    const t = translations[currentLang];
    if (quizData.current >= quizData.total) {
        document.getElementById("quiz-question").textContent = t.quizScore + " " + quizData.score + " / " + quizData.total;
        document.getElementById("quiz-options").innerHTML = "";
        document.getElementById("quiz-feedback").textContent = quizData.score >= 8 ? t.quizExcellent : t.quizGood;

        const backBtn = document.createElement("button");
        backBtn.textContent = t.backToMenu;
        backBtn.onclick = backToMenu;
        backBtn.style.marginTop = "20px";
        document.getElementById("quiz-options").appendChild(backBtn);
        return;
    }

    quizData.current++;
    const a = quizData.min + Math.floor(Math.random() * (quizData.max - quizData.min + 1));
    const b = quizData.min + Math.floor(Math.random() * (quizData.max - quizData.min + 1));
    const ans = a * b;

    document.getElementById("quiz-question").textContent = `${a} × ${b} = ?`;
    document.getElementById("quiz-progress").textContent = t.quizProgress.replace("{current}", quizData.current).replace("{total}", quizData.total);
    document.getElementById("quiz-feedback").textContent = "";

    let opts = [ans];
    while (opts.length < 4) {
        let fake = ans + (Math.floor(Math.random() * 11) - 5);
        if (fake > 0 && !opts.includes(fake)) opts.push(fake);
    }
    opts.sort(() => Math.random() - 0.5);

    const container = document.getElementById("quiz-options");
    container.innerHTML = "";
    opts.forEach(val => {
        const btn = document.createElement("button");
        btn.textContent = val;
        btn.onclick = () => checkQuizAnswer(val, ans);
        container.appendChild(btn);
    });
}

function checkQuizAnswer(val, ans) {
    const t = translations[currentLang];
    const fb = document.getElementById("quiz-feedback");
    if (val === ans) {
        quizData.score++;
        fb.textContent = t.quizCorrect;
        fb.style.color = "var(--success-color)";
    } else {
        fb.textContent = t.quizWrong + ans;
        fb.style.color = "var(--error-color)";
    }
    setTimeout(nextQuizQuestion, 1000);
}

// --- Monster ---
let monsterVal = 0;

function initMonsterGame() {
    const selA = document.getElementById("monster-a");
    const selB = document.getElementById("monster-b");
    if (selA.options.length === 0) {
        for (let i = 1; i <= 9; i++) {
            selA.add(new Option(i, i));
            selB.add(new Option(i, i));
        }
    }
    newMonster();
}

function newMonster() {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    monsterVal = a * b;
    document.getElementById("monster-number").textContent = monsterVal;
    document.getElementById("monster-feedback").textContent = translations[currentLang].monsterIntro;
    document.getElementById("monster-feedback").style.color = "var(--text-color)";
    document.getElementById("monster-array").innerHTML = "";
}

function attackMonster() {
    const a = parseInt(document.getElementById("monster-a").value);
    const b = parseInt(document.getElementById("monster-b").value);
    const t = translations[currentLang];
    const fb = document.getElementById("monster-feedback");

    if (a * b === monsterVal) {
        fb.textContent = t.monsterSuccess;
        fb.style.color = "var(--success-color)";
        drawMonsterArray(a, b);
    } else {
        fb.textContent = t.monsterFail;
        fb.style.color = "var(--error-color)";
    }
}

function drawMonsterArray(a, b) {
    const div = document.getElementById("monster-array");
    div.innerHTML = "";
    div.style.gridTemplateColumns = `repeat(${b}, 20px)`;
    for (let i = 0; i < a * b; i++) {
        const tile = document.createElement("div");
        tile.className = "monster-tile";
        div.appendChild(tile);
    }
}

// --- Time Attack ---
let timeAttackInterval;
let timeData = { timeLeft: 60, score: 0 };

function resetTimeUI() {
    document.getElementById("time-menu").classList.remove("hidden");
    document.getElementById("time-play").classList.add("hidden");
}

function startTimeAttack() {
    timeData = { timeLeft: 60, score: 0 };
    document.getElementById("time-menu").classList.add("hidden");
    document.getElementById("time-play").classList.remove("hidden");
    updateTimeDisplay();
    nextTimeQuestion();

    timeAttackInterval = setInterval(() => {
        timeData.timeLeft--;
        updateTimeDisplay();
        if (timeData.timeLeft <= 0) {
            clearInterval(timeAttackInterval);
            endTimeAttack();
        }
    }, 1000);
}

function updateTimeDisplay() {
    document.getElementById("time-left").textContent = timeData.timeLeft;
    document.getElementById("time-score").textContent = timeData.score;
    document.getElementById("timer-fill").style.width = (timeData.timeLeft / 60 * 100) + "%";
}

function nextTimeQuestion() {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    const ans = a * b;

    document.getElementById("time-question").textContent = `${a} × ${b} = ?`;

    let opts = [ans];
    while (opts.length < 4) {
        let fake = ans + (Math.floor(Math.random() * 11) - 5);
        if (fake > 0 && !opts.includes(fake)) opts.push(fake);
    }
    opts.sort(() => Math.random() - 0.5);

    const container = document.getElementById("time-options");
    container.innerHTML = "";
    opts.forEach(val => {
        const btn = document.createElement("button");
        btn.textContent = val;
        btn.onclick = () => {
            if (val === ans) {
                timeData.score += 10;
                nextTimeQuestion();
            } else {
                timeData.score = Math.max(0, timeData.score - 5);
                updateTimeDisplay();
            }
        };
        container.appendChild(btn);
    });
}

function endTimeAttack() {
    const t = translations[currentLang];
    document.getElementById("time-question").textContent = t.timeOver;
    document.getElementById("time-options").innerHTML = `<h3>${t.timeFinalScore} ${timeData.score}</h3>`;

    const backBtn = document.createElement("button");
    backBtn.textContent = t.backToMenu;
    backBtn.onclick = backToMenu;
    backBtn.style.marginTop = "20px";
    document.getElementById("time-options").appendChild(backBtn);
}

// --- Falling Stars ---
let starsAnimFrame;
let stars = [];
let starsData = { score: 0, lives: 3 };
const canvas = document.getElementById("stars-canvas");
const ctx = canvas.getContext("2d");

function resetStarsUI() {
    document.getElementById("stars-menu").classList.remove("hidden");
    document.getElementById("stars-play").classList.add("hidden");
    document.getElementById("stars-gameover").classList.add("hidden");
}

function startStarsGame() {
    starsData = { score: 0, lives: 3 };
    stars = [];
    document.getElementById("stars-menu").classList.add("hidden");
    document.getElementById("stars-play").classList.remove("hidden");
    document.getElementById("stars-gameover").classList.add("hidden");
    document.getElementById("stars-input").value = "";
    document.getElementById("stars-input").focus();
    updateStarsUI();

    // Adjust canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    lastTime = performance.now();
    spawnTimer = 0;
    starsAnimFrame = requestAnimationFrame(gameLoop);
}

let lastTime = 0;
let spawnTimer = 0;

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    updateStars(dt);
    drawStars();

    if (starsData.lives > 0) {
        starsAnimFrame = requestAnimationFrame(gameLoop);
    } else {
        endStarsGame();
    }
}

function updateStars(dt) {
    spawnTimer += dt;
    if (spawnTimer > 2000) { // Spawn every 2s
        spawnStar();
        spawnTimer = 0;
    }

    for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].y += stars[i].speed * (dt / 16);
        if (stars[i].y > canvas.height) {
            stars.splice(i, 1);
            starsData.lives--;
            updateStarsUI();
        }
    }
}

function spawnStar() {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    stars.push({
        a: a,
        b: b,
        ans: a * b,
        x: Math.random() * (canvas.width - 60) + 30,
        y: -30,
        speed: 1 + Math.random() * 1.5
    });
}

function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#fff";

    stars.forEach(s => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = "#ffeb3b";
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.fillText(`${s.a}×${s.b}`, s.x - 20, s.y + 8);
    });
}

function checkStarInput(e) {
    if (e.key === "Enter") submitStarInput();
}

function submitStarInput() {
    const val = parseInt(document.getElementById("stars-input").value);
    const idx = stars.findIndex(s => s.ans === val);

    if (idx !== -1) {
        stars.splice(idx, 1);
        starsData.score += 10;
        document.getElementById("stars-input").value = "";
        // Visual feedback could be added here
    }
    updateStarsUI();
}

function updateStarsUI() {
    document.getElementById("stars-score").textContent = starsData.score;
    document.getElementById("stars-lives").textContent = "❤".repeat(starsData.lives);
}

function endStarsGame() {
    const t = translations[currentLang];
    // Show Game Over Overlay
    const overlay = document.getElementById("stars-gameover");
    overlay.classList.remove("hidden");
    document.getElementById("stars-final-score").textContent = `${t.starsScore} ${starsData.score}`;
    updateTexts(); // Ensure buttons are localized
}

// Init
updateTexts();
