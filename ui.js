/**
 * Space Survival Level 2 - UI & Screen Management System
 * Handles HUD rendering, screen transitions, briefing modals, task complete dialogs,
 * game over screens, victory diplomas, audio controls, and touch buttons.
 */

class UIManager {
  constructor() {
    this.currentScreen = 'title';
    this.currentTask = 1;

    // Elements cache
    this.screens = {
      title: document.getElementById('screenTitle'),
      game: document.getElementById('screenGame')
    };

    this.modals = {
      briefing: document.getElementById('modalBriefing'),
      pause: document.getElementById('modalPause'),
      taskComplete: document.getElementById('modalTaskComplete'),
      gameOver: document.getElementById('modalGameOver'),
      victory: document.getElementById('modalVictory')
    };

    this.hud = {
      taskTag: document.getElementById('hudTaskTag'),
      taskName: document.getElementById('hudTaskName'),
      timerVal: document.getElementById('hudTimerVal'),
      task1Hud: document.getElementById('task1HudItems'),
      task2Hud: document.getElementById('task2HudItems'),
      task3Hud: document.getElementById('task3HudItems'),
      stepDots: [
        document.getElementById('stepDot1'),
        document.getElementById('stepDot2'),
        document.getElementById('stepDot3')
      ],
      stepLines: [
        document.getElementById('stepLine1'),
        document.getElementById('stepLine2')
      ]
    };

    this.bindGlobalUIEvents();
  }

  bindGlobalUIEvents() {
    // Sound & Volume controls in HUD
    const btnMusic = document.getElementById('btnToggleMusic');
    const btnSfx = document.getElementById('btnToggleSfx');
    const volumeSlider = document.getElementById('volumeSlider');

    if (btnMusic) {
      btnMusic.onclick = () => {
        if (window.soundSystem) {
          const enabled = window.soundSystem.toggleMusic();
          btnMusic.classList.toggle('muted', !enabled);
          btnMusic.title = enabled ? 'Music: ON' : 'Music: MUTED';
        }
      };
    }

    if (btnSfx) {
      btnSfx.onclick = () => {
        if (window.soundSystem) {
          const enabled = window.soundSystem.toggleSfx();
          btnSfx.classList.toggle('muted', !enabled);
          btnSfx.title = enabled ? 'SFX: ON' : 'SFX: MUTED';
        }
      };
    }

    if (volumeSlider) {
      volumeSlider.oninput = (e) => {
        if (window.soundSystem) {
          window.soundSystem.setVolume(parseFloat(e.target.value));
        }
      };
    }

    // Pause button in HUD
    const btnPause = document.getElementById('btnPauseGame');
    if (btnPause) {
      btnPause.onclick = () => {
        if (window.game) window.game.pauseGame();
      };
    }

    // Pause Modal Buttons
    const btnResume = document.getElementById('btnResumeGame');
    const btnRestartTask = document.getElementById('btnRestartTask');
    const btnQuitToMenu = document.getElementById('btnQuitToMenu');

    if (btnResume) {
      btnResume.onclick = () => {
        if (window.game) window.game.resumeGame();
      };
    }

    if (btnRestartTask) {
      btnRestartTask.onclick = () => {
        this.closeAllModals();
        if (window.game) window.game.restartCurrentTask();
      };
    }

    if (btnQuitToMenu) {
      btnQuitToMenu.onclick = () => {
        this.closeAllModals();
        if (window.game) window.game.quitToMenu();
      };
    }
  }

  showScreen(screenName) {
    Object.keys(this.screens).forEach((name) => {
      const el = this.screens[name];
      if (el) {
        if (name === screenName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
    this.currentScreen = screenName;
  }

  closeAllModals() {
    Object.values(this.modals).forEach((m) => {
      if (m) m.classList.remove('active');
    });
  }

  showModal(modalName) {
    this.closeAllModals();
    const modal = this.modals[modalName];
    if (modal) {
      modal.classList.add('active');
    }
  }

  /* -------------------------------------------------------------
     HUD TASK SWITCHING & PROGRESSION
     ------------------------------------------------------------- */

  setHUDForTask(taskNum) {
    this.currentTask = taskNum;

    // Progression steps
    for (let i = 0; i < 3; i++) {
      const dot = this.hud.stepDots[i];
      if (dot) {
        dot.classList.remove('active', 'completed');
        if (i + 1 < taskNum) {
          dot.classList.add('completed');
          dot.textContent = '✓';
        } else if (i + 1 === taskNum) {
          dot.classList.add('active');
          dot.textContent = `${i + 1}`;
        } else {
          dot.textContent = `${i + 1}`;
        }
      }
    }

    for (let i = 0; i < 2; i++) {
      const line = this.hud.stepLines[i];
      if (line) {
        line.classList.toggle('done', i + 1 < taskNum);
      }
    }

    // Hide all task HUDs, then show specific one
    if (this.hud.task1Hud) this.hud.task1Hud.style.display = 'none';
    if (this.hud.task2Hud) this.hud.task2Hud.style.display = 'none';
    if (this.hud.task3Hud) this.hud.task3Hud.style.display = 'none';

    // Show task view containers
    const t1View = document.getElementById('task1View');
    const t2View = document.getElementById('task2View');
    const t3View = document.getElementById('task3View');

    if (t1View) t1View.style.display = 'none';
    if (t2View) t2View.style.display = 'none';
    if (t3View) t3View.style.display = 'none';

    if (taskNum === 1) {
      if (this.hud.taskTag) this.hud.taskTag.textContent = 'TASK 01 / 03';
      if (this.hud.taskName) this.hud.taskName.innerHTML = '🛡️ FIX AIR LEAK';
      if (this.hud.task1Hud) this.hud.task1Hud.style.display = 'flex';
      if (t1View) t1View.style.display = 'block';
    } else if (taskNum === 2) {
      if (this.hud.taskTag) this.hud.taskTag.textContent = 'TASK 02 / 03';
      if (this.hud.taskName) this.hud.taskName.innerHTML = '🏃 COLLECT ESSENTIALS';
      if (this.hud.task2Hud) this.hud.task2Hud.style.display = 'flex';
      if (t2View) t2View.style.display = 'block';
    } else if (taskNum === 3) {
      if (this.hud.taskTag) this.hud.taskTag.textContent = 'TASK 03 / 03';
      if (this.hud.taskName) this.hud.taskName.innerHTML = '⚡ POWER SAVE';
      if (this.hud.task3Hud) this.hud.task3Hud.style.display = 'flex';
      if (t3View) t3View.style.display = 'block';
    }
  }

  updateTimer(seconds) {
    if (!this.hud.timerVal) return;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    this.hud.timerVal.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    this.hud.timerVal.classList.toggle('warning', seconds <= 10);
  }

  updateTask1HUD(data) {
    this.updateTimer(data.timeLeft);
    const fill = document.getElementById('t1PressureFill');
    const pct = document.getElementById('t1PressurePct');
    const leaks = document.getElementById('t1LeaksRemaining');

    if (fill) {
      fill.style.width = `${data.pressure}%`;
      fill.classList.toggle('critical', data.pressure <= 25);
    }
    if (pct) pct.textContent = `${data.pressure}%`;
    if (leaks) leaks.textContent = `${data.leaksRemaining} / ${data.totalLeaks}`;

    const vignette = document.getElementById('hullVignette');
    if (vignette) {
      vignette.classList.toggle('active', data.leaksRemaining > 0);
    }
  }

  updateTask2HUD(data) {
    this.updateTimer(data.timeLeft);
    const o2 = document.getElementById('runnerO2Count');
    const water = document.getElementById('runnerWaterCount');
    const shield = document.getElementById('runnerShieldCount');

    if (o2) o2.textContent = `${data.oxygen}/${data.targets.oxygen}`;
    if (water) water.textContent = `${data.water}/${data.targets.water}`;
    if (shield) shield.textContent = `${data.shield}/${data.targets.shield}`;

    // Mark complete pills
    const pillO2 = document.getElementById('pillO2');
    const pillWater = document.getElementById('pillWater');
    const pillShield = document.getElementById('pillShield');

    if (pillO2) pillO2.classList.toggle('complete', data.oxygen >= data.targets.oxygen);
    if (pillWater) pillWater.classList.toggle('complete', data.water >= data.targets.water);
    if (pillShield) pillShield.classList.toggle('complete', data.shield >= data.targets.shield);
  }

  updateTask3HUD(data) {
    this.updateTimer(data.timeLeft);
    const fill = document.getElementById('t3PowerFill');
    const pct = document.getElementById('t3PowerPct');
    const count = document.getElementById('t3RepairedCount');

    if (fill) {
      fill.style.width = `${data.power}%`;
      fill.classList.toggle('critical', data.power <= 25);
    }
    if (pct) pct.textContent = `${data.power}%`;
    if (count) count.textContent = `${data.repaired} / ${data.required}`;
  }

  /* -------------------------------------------------------------
     DIALOGS: BRIEFING, COMPLETE, GAME OVER, VICTORY
     ------------------------------------------------------------- */

  showBriefing(taskNum, onStart) {
    const title = document.getElementById('briefingTitle');
    const sub = document.getElementById('briefingSubtitle');
    const tagline = document.getElementById('briefingTagline');
    const codeId = document.getElementById('briefingCode');
    const iconWrap = document.getElementById('briefingIconWrap');
    const protocols = document.getElementById('briefingProtocolList');
    const guide = document.getElementById('briefingControlsGuide');
    const startBtn = document.getElementById('btnStartTask');

    if (taskNum === 1) {
      if (title) title.textContent = 'TASK 1: FIX AIR LEAK';
      if (tagline) tagline.textContent = 'HULL INTEGRITY EMERGENCY';
      if (codeId) codeId.textContent = 'SYS-ORD #01-AIR-SEAL';
      if (iconWrap) {
        iconWrap.innerHTML = `
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#ff2a5f" stroke-width="2.2">
            <circle cx="12" cy="12" r="9"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <circle cx="12" cy="12" r="2" fill="#ff2a5f"></circle>
          </svg>
        `;
      }
      if (sub) sub.textContent = 'Multiple micro-meteoroids punctured the cockpit viewport! Cabin air pressure is venting rapidly into the vacuum of space. Fly in zero-G or click/tap directly on breaches to apply nano-composite sealing patches before oxygen reaches 0%!';
      if (protocols) {
        protocols.innerHTML = `
          <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 75 Seconds</div>
          <div class="protocol-item"><span>🎯</span> <strong>TARGET:</strong> Seal all 6 active hull punctures</div>
          <div class="protocol-item"><span>🛡️</span> <strong>SAFEGUARD:</strong> Keep cabin pressure above 0%</div>
        `;
      }
      if (guide) {
        guide.innerHTML = `
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">W</span><span class="key-cap">A</span><span class="key-cap">S</span><span class="key-cap">D</span>
              <span class="key-cap">◀</span><span class="key-cap">▲</span><span class="key-cap">▼</span><span class="key-cap">▶</span>
            </div>
            <span class="board-key-action">Fly Astronaut in Zero-G</span>
          </div>
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">LEFT CLICK</span>
              <span class="key-cap">RIGHT CLICK</span>
            </div>
            <span class="board-key-action">Weld & Seal Breach</span>
          </div>
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">SPACE</span>
              <span class="key-cap">E</span>
              <span class="key-cap">ENTER</span>
            </div>
            <span class="board-key-action">Seal When Near Breach</span>
          </div>
        `;
      }
    } else if (taskNum === 2) {
      if (title) title.textContent = 'TASK 2: COLLECT ESSENTIALS';
      if (tagline) tagline.textContent = '3-LANE LUNAR HIGHWAY RUNNER';
      if (codeId) codeId.textContent = 'RUN-ORD #02-SUPPLY-RUN';
      if (iconWrap) {
        iconWrap.innerHTML = `
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#00f0ff" stroke-width="2.2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        `;
      }
      if (sub) sub.textContent = 'High-speed Subway Surfers-style lunar runner! Steer across 3 lanes, jump over high-voltage laser barriers, and slide under industrial gantries while gathering 15 vital survival canisters!';
      if (protocols) {
        protocols.innerHTML = `
          <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 75 Seconds</div>
          <div class="protocol-item"><span>💎</span> <strong>GATHER:</strong> 5 O₂ Tanks + 5 Water Ice + 5 Shielding</div>
          <div class="protocol-item"><span>⚠️</span> <strong>DODGE:</strong> Giant Asteroids, Laser Fences & Gantries</div>
        `;
      }
      if (guide) {
        guide.innerHTML = `
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">A</span><span class="key-cap">D</span>
              <span class="key-cap">◀</span><span class="key-cap">▶</span>
            </div>
            <span class="board-key-action">Switch Lanes (1 by 1)</span>
          </div>
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">W</span>
              <span class="key-cap">▲</span>
              <span class="key-cap">SPACE</span>
            </div>
            <span class="board-key-action">High Jump Over Red Lasers</span>
          </div>
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">S</span>
              <span class="key-cap">▼</span>
            </div>
            <span class="board-key-action">Slide Under Yellow Gantries</span>
          </div>
        `;
      }
    } else if (taskNum === 3) {
      if (title) title.textContent = 'TASK 3: POWER SAVE';
      if (tagline) tagline.textContent = 'AMONG US-STYLE REPAIR DECK';
      if (codeId) codeId.textContent = 'PWR-ORD #03-STATION-FIX';
      if (iconWrap) {
        iconWrap.innerHTML = `
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#ffc837" stroke-width="2.2">
            <circle cx="12" cy="12" r="8"></circle>
            <line x1="12" y1="2" x2="12" y2="4"></line>
            <line x1="12" y1="20" x2="12" y2="22"></line>
            <circle cx="12" cy="12" r="3" fill="#ffc837"></circle>
          </svg>
        `;
      }
      if (sub) sub.textContent = 'Three critical systems across the spaceship interior have malfunctioned and are actively draining main battery reserves! Inspect the deck, click flashing red rooms, and complete wire connections, power sliders, and keypad sequences!';
      if (protocols) {
        protocols.innerHTML = `
          <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 120 Seconds</div>
          <div class="protocol-item"><span>🔌</span> <strong>WIRES:</strong> Click & drag matching colored cables</div>
          <div class="protocol-item"><span>⚡</span> <strong>GRID:</strong> Balance power sliders into target green zones</div>
          <div class="protocol-item"><span>🔢</span> <strong>KEYPAD:</strong> Repeat 4-step reboot flashing code</div>
        `;
      }
      if (guide) {
        guide.innerHTML = `
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">CLICK ROOM</span>
              <span class="key-cap">WASD</span>
            </div>
            <span class="board-key-action">Inspect Malfunctioning System</span>
          </div>
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">MOUSE DRAG</span>
              <span class="key-cap">TOUCH</span>
            </div>
            <span class="board-key-action">Drag Wire Left to Right Pin</span>
          </div>
          <div class="board-key-row">
            <div class="board-key-caps">
              <span class="key-cap">1</span><span class="key-cap">2</span><span class="key-cap">3</span><span class="key-cap">4</span>
              <span class="key-cap">ESC</span>
            </div>
            <span class="board-key-action">Keypad Code / Close Panel</span>
          </div>
        `;
      }
    }

    if (startBtn) {
      startBtn.onclick = () => {
        this.closeAllModals();
        if (onStart) onStart();
      };
    }

    this.showModal('briefing');
  }

  showTaskComplete(taskNum, stats, onNext) {
    if (window.soundSystem) window.soundSystem.playVictory();

    const title = document.getElementById('completeTitle');
    const sub = document.getElementById('completeSubtitle');
    const stat1Val = document.getElementById('completeStat1Val');
    const stat1Lbl = document.getElementById('completeStat1Lbl');
    const stat2Val = document.getElementById('completeStat2Val');
    const stat2Lbl = document.getElementById('completeStat2Lbl');
    const nextBtn = document.getElementById('btnNextTask');

    if (taskNum === 1) {
      if (title) title.textContent = 'TASK 1 COMPLETED!';
      if (sub) sub.textContent = 'Exceptional rapid response Cadet! All hull punctures sealed with airtight nano-composite patches.';
      if (stat1Lbl) stat1Lbl.textContent = 'Pressure Retained';
      if (stat1Val) stat1Val.textContent = `${stats.pressureRemaining}%`;
      if (stat2Lbl) stat2Lbl.textContent = 'Time Taken';
      if (stat2Val) stat2Val.textContent = `${stats.timeTaken}s`;
    } else if (taskNum === 2) {
      if (title) title.textContent = 'TASK 2 COMPLETED!';
      if (sub) sub.textContent = 'Outstanding navigation! All 15 vital survival resources gathered from the lunar runway.';
      if (stat1Lbl) stat1Lbl.textContent = 'Supplies Gathered';
      if (stat1Val) stat1Val.textContent = '15 / 15';
      if (stat2Lbl) stat2Lbl.textContent = 'Run Time';
      if (stat2Val) stat2Val.textContent = `${stats.timeTaken}s`;
    }

    if (nextBtn) {
      nextBtn.onclick = () => {
        this.closeAllModals();
        if (onNext) onNext();
      };
    }

    this.showModal('taskComplete');
  }

  showGameOver(reason, taskName, onRetry) {
    if (window.soundSystem) window.soundSystem.playFailure();

    const reasonEl = document.getElementById('gameOverReason');
    const taskEl = document.getElementById('gameOverTaskName');
    const retryBtn = document.getElementById('btnRetryTask');

    if (reasonEl) reasonEl.textContent = reason || 'Mission parameters breached.';
    if (taskEl) taskEl.textContent = taskName || 'Space Survival';

    if (retryBtn) {
      retryBtn.onclick = () => {
        this.closeAllModals();
        if (onRetry) onRetry();
      };
    }

    this.showModal('gameOver');
  }

  showVictory(stats, onRestart) {
    if (window.soundSystem) window.soundSystem.playVictory();

    const timeVal = document.getElementById('victoryTotalTime');
    const scoreVal = document.getElementById('victoryTotalScore');
    const restartBtn = document.getElementById('btnRestartMission');

    if (timeVal) timeVal.textContent = `${stats.totalTime}s`;
    if (scoreVal) scoreVal.textContent = `${stats.score} PTS`;

    if (restartBtn) {
      restartBtn.onclick = () => {
        this.closeAllModals();
        if (onRestart) onRestart();
      };
    }

    this.showModal('victory');
  }
}

window.UIManager = UIManager;
