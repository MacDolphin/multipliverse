// Global State
let currentLang = "zh-Hant";
let currentGame = null;
let isSoundOn = true;
let totalGems = 0; // Will be synced with UserManager

// --- User Manager ---
const UserManager = {
    users: {},
    currentUser: null,

    init: function () {
        try {
            this.users = JSON.parse(localStorage.getItem("mv_users") || "{}");
            const lastUser = localStorage.getItem("mv_last_user");
            if (lastUser && this.users[lastUser]) {
                this.login(lastUser, this.users[lastUser].password, true);
            } else {
                this.updateUI(); // Guest mode
            }
        } catch (e) {
            console.warn("User init failed", e);
        }
        this.renderAvatars();
    },

    toggleModal: function () {
        const modal = document.getElementById("login-modal");
        modal.classList.toggle("hidden");
        if (!modal.classList.contains("hidden")) {
            // Reset fields
            document.getElementById("username-input").value = "";
            document.getElementById("password-input").value = "";
            document.querySelectorAll(".avatar-option").forEach(el => el.classList.remove("selected"));

            // If logged in, show logout
            if (this.currentUser) {
                document.getElementById("logout-btn").classList.remove("hidden");
                document.getElementById("username-input").value = this.currentUser.username;
                document.getElementById("username-input").disabled = true;
            } else {
                document.getElementById("logout-btn").classList.add("hidden");
                document.getElementById("username-input").disabled = false;
            }
        }
    },

    renderAvatars: function () {
        const grid = document.getElementById("avatar-grid");
        grid.innerHTML = "";
        const seeds = ["Felix", "Aneka", "Zoe", "Jack", "Bear", "Leo", "Max", "Lily"];
        seeds.forEach(seed => {
            const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`;
            const img = document.createElement("img");
            img.src = url;
            img.className = "avatar-option";
            img.onclick = () => {
                document.querySelectorAll(".avatar-option").forEach(el => el.classList.remove("selected"));
                img.classList.add("selected");
                img.dataset.seed = seed;
            };
            grid.appendChild(img);
        });
    },

    signup: function () {
        const username = document.getElementById("username-input").value.trim();
        const password = document.getElementById("password-input").value.trim();
        const selectedAvatar = document.querySelector(".avatar-option.selected");

        if (!username || !password) {
            alert("Please enter username and password!");
            return;
        }

        if (this.users[username]) {
            alert("User already exists!");
            return;
        }

        const avatarSeed = selectedAvatar ? selectedAvatar.dataset.seed : "Felix";

        this.users[username] = {
            username,
            password,
            avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${avatarSeed}`,
            gems: 0
        };

        this.saveUsers();
        this.login(username, password);
    },

    login: function (usernameInput = null, passwordInput = null, auto = false) {
        const username = usernameInput || document.getElementById("username-input").value.trim();
        const password = passwordInput || document.getElementById("password-input").value.trim();

        if (!this.users[username] || this.users[username].password !== password) {
            if (!auto) alert("Invalid username or password!");
            return;
        }

        this.currentUser = this.users[username];
        localStorage.setItem("mv_last_user", username);

        // Sync gems
        totalGems = this.currentUser.gems;
        GemManager.updateDisplay();

        this.updateUI();
        if (!auto) this.toggleModal();

        const t = translations[currentLang];
        showFloatingFeedback(t.welcomeUser.replace("{name}", username), window.innerWidth / 2, window.innerHeight / 2, "#0f0");
    },

    logout: function () {
        this.currentUser = null;
        localStorage.removeItem("mv_last_user");
        totalGems = 0; // Reset to 0 or guest gems
        GemManager.updateDisplay();
        this.updateUI();
        this.toggleModal();
    },

    saveUsers: function () {
        localStorage.setItem("mv_users", JSON.stringify(this.users));
    },

    updateGem: function (amount) {
        if (this.currentUser) {
            this.currentUser.gems += amount;
            this.saveUsers();
        }
    },

    updateUI: function () {
        const avatarDisplay = document.getElementById("user-avatar-display");
        const nameDisplay = document.getElementById("user-name");
        const t = translations[currentLang];

        if (this.currentUser) {
            avatarDisplay.innerHTML = `<img src="${this.currentUser.avatar}">`;
            nameDisplay.textContent = this.currentUser.username;
        } else {
            avatarDisplay.innerHTML = "👤";
            nameDisplay.textContent = t.loginBtn;
        }
    }
};

// --- Gem Manager ---
const GemManager = {
    add: function (amount) {
        totalGems += amount;
        UserManager.updateGem(amount); // Sync with user account
        // Legacy local storage backup (optional, or remove)
        // localStorage.setItem("mv_gems", totalGems); 
        this.updateDisplay();
        this.animateAdd(amount);
    },
    updateDisplay: function () {
        document.getElementById("gem-count").textContent = totalGems;
    },
    animateAdd: function (amount) {
        const el = document.getElementById("gem-counter");
        el.classList.add("anim-pop");
        setTimeout(() => el.classList.remove("anim-pop"), 300);
        showFloatingFeedback(`+${amount} 💎`, el.getBoundingClientRect().left, el.getBoundingClientRect().top + 50, "#00e5ff");
    }
};

// --- Monster Generator ---
function generateMonster() {
    // Use RoboHash Set 2 (Monsters) for "Monsters Inc" style
    const seed = monsterVal + "-" + Date.now();
    const url = `https://robohash.org/${seed}?set=set2&size=150x150`;

    document.getElementById("monster-image").innerHTML = `<img src="${url}" alt="Monster" style="width:100%; height:100%; object-fit:contain;">`;
}

// --- Sound & Voice Manager ---
const SoundManager = {
    ctx: null,
    init: function () {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    resume: function () {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    playTone: function (freq, type, duration) {
        if (!isSoundOn) return;
        this.init();
        this.resume();

        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playCorrect: function () {
        this.playTone(600, 'sine', 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.2), 100);
    },
    playWrong: function () {
        this.playTone(150, 'sawtooth', 0.3);
    },
    playWin: function () {
        [400, 500, 600, 800].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.2), i * 100));
    },
    playMonsterRoar: function () {
        // Deeper, longer roar
        this.playTone(150, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(120, 'sawtooth', 0.4), 100);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.6), 200);
    }
};

const VoiceManager = {
    speak: function (text) {
        if (!isSoundOn) return;
        window.speechSynthesis.cancel();

        // Remove emojis and leading symbols for cleaner speech
        const cleanText = text.replace(/^[\p{Emoji}\p{Punct}]+/gu, '').trim();

        const u = new SpeechSynthesisUtterance(cleanText);
        u.lang = currentLang === 'zh-Hant' ? 'zh-TW' : 'en-US';
        window.speechSynthesis.speak(u);
    }
};

function toggleSound() {
    isSoundOn = !isSoundOn;
    const btn = document.getElementById("sound-toggle");
    btn.textContent = isSoundOn ? "🔊" : "🔇";
    // Initialize audio context on user gesture
    if (isSoundOn) SoundManager.init();
}

// --- Visual Effects ---
function showFloatingFeedback(text, x, y, color) {
    const el = document.createElement("div");
    el.className = "float-feedback";
    el.textContent = text;
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.color = color;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function triggerConfetti() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement("div");
        c.className = "confetti";
        c.style.left = Math.random() * 100 + "vw";
        c.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        c.style.animationDuration = (Math.random() * 2 + 1) + "s";
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 3000);
    }
}

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

    const t = translations[currentLang];
    const parts = t.targetText.split('×');
    const label1 = parts[0].trim();
    const label2 = parts[1].trim();

    if (currentLang === 'zh-Hant') {
        // Chinese: Col x Row (行 x 列)
        document.getElementById("current-array").textContent = `${cols.size} ${label1} × ${rows.size} ${label2}`;
    } else {
        // English: Row x Col
        document.getElementById("current-array").textContent = `${rows.size} ${label1} × ${cols.size} ${label2}`;
    }
    document.getElementById("current-total").textContent = arraySelected.length;
}

function newArrayTask() {
    arrayTargetRows = 2 + Math.floor(Math.random() * 4);
    arrayTargetCols = 2 + Math.floor(Math.random() * 4);
    const t = translations[currentLang];
    const parts = t.targetText.split('×');
    const label1 = parts[0].trim();
    const label2 = parts[1].trim();

    let text = "";
    if (currentLang === 'zh-Hant') {
        // Chinese: Col x Row (行 x 列)
        text = `${arrayTargetCols} ${label1} × ${arrayTargetRows} ${label2}`;
    } else {
        // English: Row x Col
        text = `${arrayTargetRows} ${label1} × ${arrayTargetCols} ${label2}`;
    }

    document.getElementById("target-rc-text").textContent =
        `${text} (${arrayTargetRows * arrayTargetCols})`;

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
        SoundManager.playCorrect();
        VoiceManager.speak(t.arrayFeedbackSuccess);
        triggerConfetti();
        GemManager.add(10);
    } else if (rows === arrayTargetRows && cols === arrayTargetCols) {
        fb.textContent = t.arrayFeedbackShape;
        fb.style.color = "var(--error-color)";
        SoundManager.playWrong();
        VoiceManager.speak(t.arrayFeedbackShape);
    } else {
        fb.textContent = t.arrayFeedbackWrong;
        fb.style.color = "var(--error-color)";
        SoundManager.playWrong();
        VoiceManager.speak(t.arrayFeedbackWrong);
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
    VoiceManager.speak(`${a} times ${b}`.replace("times", currentLang === 'zh-Hant' ? '乘' : 'times'));
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
        SoundManager.playCorrect();
        document.getElementById("quiz-question").classList.add("anim-pop");
        setTimeout(() => document.getElementById("quiz-question").classList.remove("anim-pop"), 300);
        GemManager.add(5);
    } else {
        fb.textContent = t.quizWrong + ans;
        fb.style.color = "var(--error-color)";
        SoundManager.playWrong();
        document.getElementById("quiz-question").classList.add("anim-shake");
        setTimeout(() => document.getElementById("quiz-question").classList.remove("anim-shake"), 400);
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
    generateMonster();
    SoundManager.playMonsterRoar();
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
        SoundManager.playWin();
        triggerConfetti();
        VoiceManager.speak(t.monsterSuccess);
        GemManager.add(20);
    } else {
        fb.textContent = t.monsterFail;
        fb.style.color = "var(--error-color)";
        SoundManager.playWrong();
        VoiceManager.speak(t.monsterFail);
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
                SoundManager.playCorrect();
                nextTimeQuestion();
            } else {
                timeData.score = Math.max(0, timeData.score - 5);
                SoundManager.playWrong();
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

    if (timeData.score > 0) {
        const gems = Math.floor(timeData.score / 10);
        GemManager.add(gems);
        showFloatingFeedback(`+${gems} 💎`, window.innerWidth / 2, window.innerHeight / 2, "#00e5ff");
    }
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
        speed: (1 + Math.random() * 1.5) * 0.4 // Reduced to 40%
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
        SoundManager.playCorrect();
        showFloatingFeedback("+10", canvas.getBoundingClientRect().left + canvas.width / 2, canvas.getBoundingClientRect().top + 50, "#0f0");
        GemManager.add(1); // 1 gem per star
    } else {
        SoundManager.playWrong();
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
UserManager.init(); // Initialize User System
GemManager.updateDisplay();
