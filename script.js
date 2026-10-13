/**
 * Jocul X și 0 (Tic-Tac-Toe)
 * Logică joc, Inteligență Artificială (Minimax & Ușor), Efecte Sonore Web Audio, Confetti
 */

(() => {
    // --- Configurare & Stare Joc ---
    const WINNING_COMBINATIONS = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Orizontale
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Verticale
        [0, 4, 8], [2, 4, 6]             // Diagonale
    ];

    let board = Array(9).fill('');
    let currentPlayer = 'X';
    let isGameActive = true;
    let gameMode = 'pvp'; // 'pvp', 'ai-easy', 'ai-hard'
    let isAiThinking = false;
    let soundEnabled = true;

    const scores = {
        X: 0,
        O: 0,
        tie: 0
    };

    // --- Elemente DOM ---
    const cells = document.querySelectorAll('.cell');
    const statusMessage = document.getElementById('status-message');
    const scoreXEl = document.getElementById('score-x');
    const scoreOEl = document.getElementById('score-o');
    const scoreTieEl = document.getElementById('score-tie');
    const labelOEl = document.getElementById('label-o');
    const cardX = document.getElementById('card-x');
    const cardO = document.getElementById('card-o');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const btnRestart = document.getElementById('btn-restart');
    const btnResetScore = document.getElementById('btn-reset-score');
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const soundIcon = document.getElementById('sound-icon');
    const confettiCanvas = document.getElementById('confetti-canvas');

    // --- Web Audio API (Efecte sonore generate dinamic) ---
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTone(freq, duration, type = 'sine', delay = 0) {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

            gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + duration);
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    function playMoveSound(player) {
        if (player === 'X') {
            playTone(480, 0.12, 'sine');
        } else {
            playTone(360, 0.12, 'triangle');
        }
    }

    function playWinSound() {
        if (!soundEnabled) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
            playTone(freq, 0.22, 'sine', index * 0.08);
        });
    }

    function playTieSound() {
        if (!soundEnabled) return;
        playTone(300, 0.15, 'sawtooth', 0);
        playTone(250, 0.25, 'sawtooth', 0.15);
    }

    // --- Efect Confetti (Canvas) ---
    let confettiAnimationId = null;
    let confettiParticles = [];

    function resizeCanvas() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function triggerConfetti() {
        stopConfetti();
        confettiParticles = [];
        const count = 90;
        const colors = ['#00f0ff', '#ff3366', '#ffd166', '#10b981', '#6366f1'];

        for (let i = 0; i < count; i++) {
            confettiParticles.push({
                x: window.innerWidth / 2 + (Math.random() - 0.5) * 150,
                y: window.innerHeight / 2 - 50,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 1.2) * 12,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 12,
                opacity: 1
            });
        }

        const ctx = confettiCanvas.getContext('2d');

        function animate() {
            ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            let activeParticles = 0;

            for (const p of confettiParticles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35; // Gravitație
                p.rotation += p.rotSpeed;
                p.opacity -= 0.007;

                if (p.opacity > 0 && p.y < confettiCanvas.height + 20) {
                    activeParticles++;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rotation * Math.PI) / 180);
                    ctx.globalAlpha = Math.max(0, p.opacity);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                    ctx.restore();
                }
            }

            if (activeParticles > 0) {
                confettiAnimationId = requestAnimationFrame(animate);
            } else {
                stopConfetti();
            }
        }

        animate();
    }

    function stopConfetti() {
        if (confettiAnimationId) {
            cancelAnimationFrame(confettiAnimationId);
            confettiAnimationId = null;
        }
        const ctx = confettiCanvas.getContext('2d');
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }

    // --- Logică Joc & Verificări ---
    function checkWinner(currentBoard) {
        for (const combination of WINNING_COMBINATIONS) {
            const [a, b, c] = combination;
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                return {
                    winner: currentBoard[a],
                    combination
                };
            }
        }

        if (currentBoard.every(cell => cell !== '')) {
            return { winner: 'tie', combination: null };
        }

        return null;
    }

    function updateTurnIndicator() {
        if (!isGameActive) return;

        cardX.classList.toggle('active-card', currentPlayer === 'X');
        cardO.classList.toggle('active-card', currentPlayer === 'O');

        if (currentPlayer === 'X') {
            statusMessage.innerHTML = `Rândul lui <span class="current-turn x-turn">X</span>`;
        } else {
            const oName = gameMode === 'pvp' ? '0' : 'AI (0)';
            statusMessage.innerHTML = `Rândul lui <span class="current-turn o-turn">${oName}</span>`;
        }
    }

    function handleCellClick(e) {
        const cell = e.currentTarget;
        const index = parseInt(cell.getAttribute('data-index'), 10);

        if (board[index] !== '' || !isGameActive || isAiThinking) {
            return;
        }

        makeMove(index, currentPlayer);

        const outcome = checkWinner(board);
        if (outcome) {
            handleGameOver(outcome);
            return;
        }

        // Comută jucătorul
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateTurnIndicator();

        // Rândul AI dacă este activ modul AI
        if (currentPlayer === 'O' && gameMode.startsWith('ai') && isGameActive) {
            triggerAiMove();
        }
    }

    function makeMove(index, player) {
        board[index] = player;
        const cell = cells[index];
        cell.textContent = player;
        cell.classList.add(player.toLowerCase(), 'taken');
        cell.setAttribute('aria-label', `Căsuța ${index + 1}, ocupată de ${player}`);
        playMoveSound(player);
    }

    function handleGameOver(outcome) {
        isGameActive = false;
        cardX.classList.remove('active-card');
        cardO.classList.remove('active-card');

        if (outcome.winner === 'tie') {
            scores.tie++;
            scoreTieEl.textContent = scores.tie;
            statusMessage.innerHTML = `🤝 <strong>Egalitate!</strong> Meci nul.`;
            playTieSound();
        } else {
            const winner = outcome.winner;
            scores[winner]++;
            if (winner === 'X') {
                scoreXEl.textContent = scores.X;
                cardX.classList.add('active-card');
            } else {
                scoreOEl.textContent = scores.O;
                cardO.classList.add('active-card');
            }

            // Evidențiază căsuțele câștigătoare
            outcome.combination.forEach(idx => {
                cells[idx].classList.add('winning');
            });

            if (winner === 'X') {
                statusMessage.innerHTML = `🎉 Jucătorul <span class="current-turn x-turn">X</span> a câștigat!`;
            } else {
                const label = gameMode === 'pvp' ? 'Jucătorul 0' : 'AI (0)';
                statusMessage.innerHTML = `🏆 <span class="current-turn o-turn">${label}</span> a câștigat!`;
            }

            playWinSound();
            triggerConfetti();
        }
    }

    // --- Inteligență Artificială (AI) ---
    function triggerAiMove() {
        isAiThinking = true;
        // Mic delay pentru o experiență de joc naturală
        setTimeout(() => {
            if (!isGameActive) {
                isAiThinking = false;
                return;
            }

            let moveIndex;
            if (gameMode === 'ai-easy') {
                moveIndex = getRandomMove();
            } else {
                moveIndex = getBestMoveMinimax();
            }

            if (moveIndex !== -1 && moveIndex !== undefined) {
                makeMove(moveIndex, 'O');

                const outcome = checkWinner(board);
                if (outcome) {
                    handleGameOver(outcome);
                } else {
                    currentPlayer = 'X';
                    updateTurnIndicator();
                }
            }

            isAiThinking = false;
        }, 380);
    }

    function getRandomMove() {
        const availableMoves = [];
        board.forEach((val, idx) => {
            if (val === '') availableMoves.push(idx);
        });
        if (availableMoves.length === 0) return -1;
        const randomIndex = Math.floor(Math.random() * availableMoves.length);
        return availableMoves[randomIndex];
    }

    function getBestMoveMinimax() {
        // Dacă tabla este goală, alege centru sau colț
        const emptyCells = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
        if (emptyCells.length === 9) {
            return 4; // Centru
        }

        let bestScore = -Infinity;
        let bestMove = emptyCells[0];

        for (const index of emptyCells) {
            board[index] = 'O';
            const score = minimax(board, 0, false, -Infinity, Infinity);
            board[index] = '';

            if (score > bestScore) {
                bestScore = score;
                bestMove = index;
            }
        }

        return bestMove;
    }

    function minimax(tempBoard, depth, isMaximizing, alpha, beta) {
        const outcome = checkWinner(tempBoard);

        if (outcome) {
            if (outcome.winner === 'O') return 10 - depth;
            if (outcome.winner === 'X') return depth - 10;
            if (outcome.winner === 'tie') return 0;
        }

        const emptyIndices = [];
        for (let i = 0; i < 9; i++) {
            if (tempBoard[i] === '') emptyIndices.push(i);
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const index of emptyIndices) {
                tempBoard[index] = 'O';
                const evaluation = minimax(tempBoard, depth + 1, false, alpha, beta);
                tempBoard[index] = '';
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const index of emptyIndices) {
                tempBoard[index] = 'X';
                const evaluation = minimax(tempBoard, depth + 1, true, alpha, beta);
                tempBoard[index] = '';
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            return minEval;
        }
    }

    // --- Resetare & Setări ---
    function restartRound() {
        stopConfetti();
        board = Array(9).fill('');
        currentPlayer = 'X';
        isGameActive = true;
        isAiThinking = false;

        cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
            const idx = cell.getAttribute('data-index');
            cell.setAttribute('aria-label', `Căsuța ${parseInt(idx, 10) + 1}`);
        });

        updateTurnIndicator();
    }

    function resetAllScores() {
        scores.X = 0;
        scores.O = 0;
        scores.tie = 0;
        scoreXEl.textContent = '0';
        scoreOEl.textContent = '0';
        scoreTieEl.textContent = '0';
        restartRound();
    }

    function switchMode(newMode) {
        if (gameMode === newMode) return;
        gameMode = newMode;

        modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-mode') === newMode);
        });

        if (gameMode === 'pvp') {
            labelOEl.textContent = 'Jucător 0';
        } else {
            labelOEl.textContent = 'AI (0)';
        }

        restartRound();
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
        btnSoundToggle.title = soundEnabled ? 'Sunet Activat' : 'Sunet Oprit';
    }

    // --- Evenimente & Inițializare ---
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                cell.click();
            }
        });
    });

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchMode(btn.getAttribute('data-mode'));
        });
    });

    btnRestart.addEventListener('click', restartRound);
    btnResetScore.addEventListener('click', resetAllScores);
    btnSoundToggle.addEventListener('click', toggleSound);

    // Inițializare stare afișaj
    updateTurnIndicator();
})();
