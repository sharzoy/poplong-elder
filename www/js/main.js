(() => {
  const canvas = document.getElementById('game-canvas');
  const elScoreBig = document.getElementById('score-big');
  const elHudHighscore = document.getElementById('hud-highscore');
  const screenHome = document.getElementById('screen-home');
  const screenOver = document.getElementById('screen-over');
  const homeHighscore = document.getElementById('home-highscore');
  const overScore = document.getElementById('over-score');
  const overHighscore = document.getElementById('over-highscore');
  const btnContinue = document.getElementById('btn-continue');
  const btnSoundHome = document.getElementById('btn-sound-home');

  let game = null;
  let state = { screen: 'home', highScore: 0 };

  function updateHighScoreDisplay() {
    const text = String(state.highScore);
    if (homeHighscore) homeHighscore.textContent = text;
    if (elHudHighscore) elHudHighscore.textContent = text;
  }

  function tryUpdateHighScore(score) {
    if (score > state.highScore) {
      state.highScore = score;
      updateHighScoreDisplay();
      return true;
    }
    return false;
  }

  function hideAllOverlays() {
    [screenHome, screenOver].forEach((el) => el?.classList.remove('overlay-visible'));
  }

  function showScreen(name) {
    hideAllOverlays();
    state.screen = name === 'playing' ? 'playing' : name;
    if (name === 'home') {
      screenHome?.classList.add('overlay-visible');
      updateHighScoreDisplay();
    } else if (name === 'over') {
      screenOver?.classList.add('overlay-visible');
    }
    saveProgress();
  }

  function saveProgress() {
    GameStorage.save({
      screen: state.screen,
      soundEnabled: GameAudio.isEnabled(),
      highScore: state.highScore,
      session: state.screen === 'playing' && game && !game.gameOver ? game.serialize() : null
    });
  }

  function applySoundSetting(enabled) {
    GameAudio.setEnabled(enabled);
    if (btnSoundHome) btnSoundHome.textContent = enabled ? '音效：开' : '音效：关';
  }

  function enterPlaying(restore = false) {
    if (!game) return;
    GameAudio.resume();
    hideAllOverlays();
    state.screen = 'playing';

    if (restore) {
      const data = GameStorage.load();
      if (data?.session && game.restoreState(data.session)) {
        if (!game.gameOver) game.setLocked(false);
        saveProgress();
        requestAnimationFrame(() => game.resize());
        return;
      }
    }

    game.setLocked(false);
    game.resetGame();
    saveProgress();
    requestAnimationFrame(() => game.resize());
  }

  function restartGame() {
    enterPlaying(false);
  }

  function goHome() {
    if (!game) return;
    game.setLocked(true);
    showScreen('home');
  }

  function handleGameOver(score) {
    if (!game) return;
    const isNewRecord = tryUpdateHighScore(score);
    if (overScore) overScore.textContent = `本次得分：${score}`;
    if (overHighscore) {
      overHighscore.textContent = isNewRecord
        ? `🎉 新纪录！最高分：${state.highScore}`
        : `最高分：${state.highScore}`;
    }
    GameAudio.gameOver();
    showScreen('over');
  }

  function bindUi() {
    btnContinue?.addEventListener('click', (e) => {
      e.preventDefault();
      enterPlaying(false);
    });

    document.getElementById('btn-retry')?.addEventListener('click', restartGame);
    document.getElementById('btn-restart')?.addEventListener('click', restartGame);
    document.getElementById('btn-home')?.addEventListener('click', goHome);
    document.getElementById('btn-home-hud')?.addEventListener('click', goHome);
    document.getElementById('btn-swap')?.addEventListener('click', () => game?.swapBubble());

    btnSoundHome?.addEventListener('click', () => {
      applySoundSetting(!GameAudio.isEnabled());
      saveProgress();
      if (GameAudio.isEnabled()) GameAudio.tap();
    });
  }

  function initGame() {
    if (!canvas || typeof BubbleShooterGame !== 'function') return;

    game = new BubbleShooterGame(canvas, {
      onStateChange({ score }) {
        if (elScoreBig) elScoreBig.textContent = `得分: ${score}`;
      },
      onSave: saveProgress,
      onGameOver({ score }) {
        handleGameOver(score);
      }
    });
  }

  function boot() {
    bindUi();
    try {
      initGame();
      const data = GameStorage.load();
      applySoundSetting(data?.soundEnabled !== false);
      state.highScore = data?.highScore || 0;
      updateHighScoreDisplay();

      if (data?.session && game && data.screen === 'playing') {
        if (game.restoreState(data.session)) {
          if (!game.gameOver) game.setLocked(false);
          hideAllOverlays();
          state.screen = 'playing';
        } else {
          game.setLocked(true);
          showScreen('home');
        }
      } else {
        game?.setLocked(true);
        showScreen('home');
      }

      requestAnimationFrame(() => game?.resize());
    } catch (err) {
      console.error('游戏启动失败', err);
      showScreen('home');
    }
  }

  boot();
})();
