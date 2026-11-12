/**
 * CosmoCrew - UI & Screen Management System
 * Handles Opening Page, Avatar Selection, Rocket Launch Animation, Level Selection,
 * Robot Buddy Guide, HUD, Task Transitions, Sound Controls, and Celebrations.
 */

/* -------------------------------------------------------------
   ROBOT BUDDY COMPONENT
   ------------------------------------------------------------- */
class RobotBuddy {
  constructor() {
    this.wrap = document.getElementById('robotBuddyWidget');
    this.eyes = document.getElementById('robotEyes');
    this.bubble = document.getElementById('robotSpeechBubble');
    this.textEl = document.getElementById('robotSpeechText');
    this.timer = null;
    this.currentEmotion = 'normal';
  }

  say(message, emotion = 'normal', duration = 0) {
    if (!this.textEl || !this.bubble) return;

    this.currentEmotion = emotion;
    this.setEmotion(emotion);

    // Cute typing / pop-in text
    this.textEl.textContent = message;
    this.bubble.classList.add('visible');

    // Bounce animation
    if (this.wrap) {
      this.wrap.classList.remove('bounce');
      void this.wrap.offsetWidth; // trigger reflow
      this.wrap.classList.add('bounce');
    }

    // Play robot speech chirps
    if (window.soundSystem) {
      window.soundSystem.playRobotChirp();
    }

    if (this.timer) clearTimeout(this.timer);
    if (duration > 0) {
      this.timer = setTimeout(() => {
        this.hideBubble();
      }, duration);
    }
  }

  setEmotion(emotion) {
    if (!this.eyes) return;
    this.eyes.className = 'robot-eyes';
    if (emotion === 'happy') {
      this.eyes.textContent = '^  ^';
      this.eyes.classList.add('happy');
    } else if (emotion === 'worried') {
      this.eyes.textContent = 'O  O';
      this.eyes.classList.add('worried');
    } else if (emotion === 'celebrate') {
      this.eyes.textContent = '★  ★';
      this.eyes.classList.add('celebrate');
    } else if (emotion === 'excited') {
      this.eyes.textContent = '♥  ♥';
      this.eyes.classList.add('excited');
    } else {
      this.eyes.textContent = '•  •';
    }
  }

  hideBubble() {
    if (this.bubble) this.bubble.classList.remove('visible');
    this.setEmotion('normal');
  }
}

/* -------------------------------------------------------------
   CONFETTI CELEBRATION
   ------------------------------------------------------------- */
function showConfetti(duration = 2200) {
  let canvas = document.getElementById('confettiCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#00f0ff', '#ff70a6', '#ffd166', '#06d6a0', '#ffbe0b', '#70d6ff'];
  const pieces = [];
  for (let i = 0; i < 90; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 50,
      w: 8 + Math.random() * 8,
      h: 5 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 4,
      vy: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  let animId = null;
  const start = performance.now();

  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (now - start < duration) {
      animId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animId);
    }
  }

  animId = requestAnimationFrame(draw);
}
window.showConfetti = showConfetti;

/* -------------------------------------------------------------
   UI & SCREEN MANAGER
   ------------------------------------------------------------- */
class UIManager {
  constructor() {
    this.currentScreen = 'title';
    this.currentLevel = 1;
    this.currentTask = 1;

    // Default player profile
    window.playerProfile = {
      avatarId: 'bunny',
      avatarName: 'Pip',
      avatarTitle: 'Star Bunny',
      avatarEmoji: '🐰',
      color: '#00f0ff',
      accent: '#06d6a0'
    };

    this.screens = {
      title: document.getElementById('screenTitle'),
      levelSelect: document.getElementById('screenLevelSelect'),
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
      avatarBadge: document.getElementById('hudAvatarBadge'),
      avatarIcon: document.getElementById('hudAvatarIcon'),
      avatarName: document.getElementById('hudAvatarName'),
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
    this.bindAvatarSelection();
    this.bindRocketStart();
  }

  bindAvatarSelection() {
    const avatarCards = document.querySelectorAll('.avatar-option');
    const nameInput = document.getElementById('avatarNameInput');

    const avatars = {
      bunny: { name: 'Pip', title: 'Star Bunny', emoji: '🐰', color: '#00f0ff', accent: '#06d6a0' },
      cat: { name: 'Luna', title: 'Cosmo Kitty', emoji: '🐱', color: '#ff70a6', accent: '#ffd166' },
      bear: { name: 'Barnaby', title: 'Astro Bear', emoji: '🐻', color: '#ffbe0b', accent: '#fb5607' },
      fox: { name: 'Sparky', title: 'Rocket Fox', emoji: '🦊', color: '#ff9770', accent: '#ff4d6d' }
    };

    avatarCards.forEach(card => {
      card.addEventListener('click', () => {
        avatarCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        const aid = card.getAttribute('data-avatar');
        const info = avatars[aid] || avatars.bunny;

        window.playerProfile.avatarId = aid;
        window.playerProfile.avatarTitle = info.title;
        window.playerProfile.avatarEmoji = info.emoji;
        window.playerProfile.color = info.color;
        window.playerProfile.accent = info.accent;

        if (nameInput) {
          nameInput.value = info.name;
          window.playerProfile.avatarName = info.name;
        }

        if (window.soundSystem) window.soundSystem.playButtonClick();
        this.updateProfileDisplays();

        if (window.robotBuddy) {
          window.robotBuddy.say(`Cute choice! Looking sharp, ${info.name}!`, 'happy', 2500);
        }
      });
    });

    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        window.playerProfile.avatarName = val || 'Cadet';
        this.updateProfileDisplays();
      });
    }

    this.updateProfileDisplays();
  }

  updateProfileDisplays() {
    const p = window.playerProfile;
    if (!p) return;

    // Update HUD
    if (this.hud.avatarIcon) this.hud.avatarIcon.textContent = p.avatarEmoji;
    if (this.hud.avatarName) this.hud.avatarName.textContent = p.avatarName;

    // Update Level Select greeting
    const lsBadge = document.getElementById('levelSelectAvatarBadge');
    if (lsBadge) {
      lsBadge.innerHTML = `
        <span class="avatar-badge-emoji">${p.avatarEmoji}</span>
        <span class="avatar-badge-text">Cadet <strong>${p.avatarName}</strong> (${p.avatarTitle})</span>
      `;
    }
  }

  bindRocketStart() {
    const btnStart = document.getElementById('btnStartAdventure');
    const rocket = document.getElementById('titleRocket');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        btnStart.disabled = true;

        // Ensure audio context starts
        if (window.soundSystem) {
          window.soundSystem.ensureContext();
          window.soundSystem.playRocketLaunch();
        }

        // Animate Rocket Launch
        if (rocket) {
          rocket.classList.add('launching');
        }

        if (window.robotBuddy) {
          window.robotBuddy.say(`Blastoff, ${window.playerProfile.avatarName}! Heading to orbit!`, 'celebrate');
        }

        setTimeout(() => {
          if (rocket) rocket.classList.remove('launching');
          btnStart.disabled = false;
          this.showScreen('levelSelect');

          if (window.soundSystem) {
            window.soundSystem.playMusic('playful');
          }

          if (window.robotBuddy) {
            window.robotBuddy.say(
              `Welcome aboard, ${window.playerProfile.avatarName}! Choose Level 1 or Level 2 to begin our mission!`,
              'normal'
            );
          }
        }, 1300);
      });
    }

    // Level selection planet cards
    const cardL1 = document.getElementById('cardLevel1');
    const cardL2 = document.getElementById('cardLevel2');
    const btnBackToTitle = document.getElementById('btnBackToTitle');

    if (cardL1) {
      cardL1.addEventListener('click', () => {
        if (window.soundSystem) {
          window.soundSystem.playButtonClick();
          window.soundSystem.playLevelTransition();
        }
        if (window.game) window.game.startLevel(1);
      });
    }

    if (cardL2) {
      cardL2.addEventListener('click', () => {
        if (window.soundSystem) {
          window.soundSystem.playButtonClick();
          window.soundSystem.playLevelTransition();
        }
        if (window.game) window.game.startLevel(2);
      });
    }

    if (btnBackToTitle) {
      btnBackToTitle.addEventListener('click', () => {
        if (window.soundSystem) window.soundSystem.playButtonClick();
        this.showScreen('title');
      });
    }
  }

  bindGlobalUIEvents() {
    // Music & SFX toggles
    const btnMusic = document.getElementById('btnToggleMusic');
    const btnSfx = document.getElementById('btnToggleSfx');
    const volumeSlider = document.getElementById('volumeSlider');

    if (btnMusic) {
      btnMusic.onclick = () => {
        if (window.soundSystem) {
          const enabled = window.soundSystem.toggleMusic();
          btnMusic.classList.toggle('muted', !enabled);
          btnMusic.textContent = enabled ? '🎵 Music: ON' : '🔇 Music: OFF';
        }
      };
    }

    if (btnSfx) {
      btnSfx.onclick = () => {
        if (window.soundSystem) {
          const enabled = window.soundSystem.toggleSfx();
          btnSfx.classList.toggle('muted', !enabled);
          btnSfx.textContent = enabled ? '🔊 SFX: ON' : '🔈 SFX: OFF';
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

    // Pause & Menu Buttons
    const btnPause = document.getElementById('btnPauseGame');
    if (btnPause) {
      btnPause.onclick = () => {
        if (window.game) window.game.pauseGame();
      };
    }

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
        if (window.game) window.game.quitToLevelSelect();
      };
    }
  }

  showScreen(screenName) {
    Object.keys(this.screens).forEach(name => {
      const el = this.screens[name];
      if (el) {
        if (name === screenName) el.classList.add('active');
        else el.classList.remove('active');
      }
    });
    this.currentScreen = screenName;
  }

  closeAllModals() {
    Object.values(this.modals).forEach(m => {
      if (m) m.classList.remove('active');
    });
  }

  showModal(modalName) {
    this.closeAllModals();
    const modal = this.modals[modalName];
    if (modal) modal.classList.add('active');
  }

  /* -------------------------------------------------------------
     HUD & TASK SWITCHING
     ------------------------------------------------------------- */
  setHUDForTask(levelNum, taskNum) {
    this.currentLevel = levelNum;
    this.currentTask = taskNum;
    this.updateProfileDisplays();

    // Step dots
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
      if (line) line.classList.toggle('done', i + 1 < taskNum);
    }

    // Hide all task views
    const allViews = [
      'l1t1View', 'l1t2View', 'l1t3View',
      'task1View', 'task2View', 'task3View'
    ];
    allViews.forEach(vid => {
      const el = document.getElementById(vid);
      if (el) el.style.display = 'none';
    });

    // Hide all level HUD items
    const allHuds = ['l1t1HudItems', 'l1t2HudItems', 'l1t3HudItems', 'task1HudItems', 'task2HudItems', 'task3HudItems'];
    allHuds.forEach(hid => {
      const el = document.getElementById(hid);
      if (el) el.style.display = 'none';
    });

    // Activate specific view and HUD
    if (levelNum === 1) {
      if (taskNum === 1) {
        if (this.hud.taskTag) this.hud.taskTag.textContent = 'LEVEL 1 • TASK 01 / 03';
        if (this.hud.taskName) this.hud.taskName.innerHTML = '🧪 OXYGEN REGULATION';
        const v = document.getElementById('l1t1View');
        if (v) v.style.display = 'block';
        const h = document.getElementById('l1t1HudItems');
        if (h) h.style.display = 'flex';
      } else if (taskNum === 2) {
        if (this.hud.taskTag) this.hud.taskTag.textContent = 'LEVEL 1 • TASK 02 / 03';
        if (this.hud.taskName) this.hud.taskName.innerHTML = '🌱 LUNAR CROP PRODUCTION';
        const v = document.getElementById('l1t2View');
        if (v) v.style.display = 'block';
        const h = document.getElementById('l1t2HudItems');
        if (h) h.style.display = 'flex';
      } else if (taskNum === 3) {
        if (this.hud.taskTag) this.hud.taskTag.textContent = 'LEVEL 1 • TASK 03 / 03';
        if (this.hud.taskName) this.hud.taskName.innerHTML = '☀️ SOLAR POWER GENERATION';
        const v = document.getElementById('l1t3View');
        if (v) v.style.display = 'block';
        const h = document.getElementById('l1t3HudItems');
        if (h) h.style.display = 'flex';
      }
    } else {
      if (taskNum === 1) {
        if (this.hud.taskTag) this.hud.taskTag.textContent = 'LEVEL 2 • TASK 01 / 03';
        if (this.hud.taskName) this.hud.taskName.innerHTML = '🛡️ FIX AIR LEAK';
        const v = document.getElementById('task1View');
        if (v) v.style.display = 'block';
        const h = document.getElementById('task1HudItems');
        if (h) h.style.display = 'flex';
      } else if (taskNum === 2) {
        if (this.hud.taskTag) this.hud.taskTag.textContent = 'LEVEL 2 • TASK 02 / 03';
        if (this.hud.taskName) this.hud.taskName.innerHTML = '🏃 COLLECT ESSENTIALS';
        const v = document.getElementById('task2View');
        if (v) v.style.display = 'block';
        const h = document.getElementById('task2HudItems');
        if (h) h.style.display = 'flex';
      } else if (taskNum === 3) {
        if (this.hud.taskTag) this.hud.taskTag.textContent = 'LEVEL 2 • TASK 03 / 03';
        if (this.hud.taskName) this.hud.taskName.innerHTML = '⚡ POWER SAVE';
        const v = document.getElementById('task3View');
        if (v) v.style.display = 'block';
        const h = document.getElementById('task3HudItems');
        if (h) h.style.display = 'flex';
      }
    }
  }

  updateTimer(seconds) {
    if (!this.hud.timerVal) return;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    this.hud.timerVal.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    this.hud.timerVal.classList.toggle('warning', seconds <= 10);
  }

  /* -------------------------------------------------------------
     DIALOGS: BRIEFING, COMPLETE, GAME OVER, VICTORY
     ------------------------------------------------------------- */
  showBriefing(levelNum, taskNum, onStart) {
    const title = document.getElementById('briefingTitle');
    const sub = document.getElementById('briefingSubtitle');
    const tagline = document.getElementById('briefingTagline');
    const codeId = document.getElementById('briefingCode');
    const iconWrap = document.getElementById('briefingIconWrap');
    const protocols = document.getElementById('briefingProtocolList');
    const guide = document.getElementById('briefingControlsGuide');
    const startBtn = document.getElementById('btnStartTask');

    const pName = (window.playerProfile && window.playerProfile.avatarName) || 'Explorer';

    if (levelNum === 1) {
      if (taskNum === 1) {
        if (title) title.textContent = 'TASK 1: OXYGEN REGULATION';
        if (tagline) tagline.textContent = 'EARTH WORKSHOP • BIO-DOME LIFE SUPPORT';
        if (codeId) codeId.textContent = 'MISSION #01-OXYGEN';
        if (iconWrap) iconWrap.innerHTML = '🧪';
        if (sub) sub.textContent = `Welcome ${pName}! Adjust the slider until the oxygen gauge enters the safe green zone (19%–23%, target: 21%). Keep our greenhouse plants thriving!`;
        if (protocols) {
          protocols.innerHTML = `
            <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 60 Seconds</div>
            <div class="protocol-item"><span>🎯</span> <strong>TARGET:</strong> 21% Oxygen (Safe: 19%–23%)</div>
            <div class="protocol-item"><span>🔒</span> <strong>LOCK-IN:</strong> Press Lock In once stable</div>
          `;
        }
        if (guide) {
          guide.innerHTML = `
            <div class="board-key-row">
              <span class="board-key-action">Drag the slider or use Arrow Keys to adjust oxygen.</span>
            </div>
          `;
        }
      } else if (taskNum === 2) {
        if (title) title.textContent = 'TASK 2: LUNAR CROP PRODUCTION';
        if (tagline) tagline.textContent = 'EARTH WORKSHOP • GREENHOUSE FARMING';
        if (codeId) codeId.textContent = 'MISSION #02-CROPS';
        if (iconWrap) iconWrap.innerHTML = '🌱';
        if (sub) sub.textContent = `Time to farm cosmic crops, ${pName}! Walk to each soil bed to drop seeds, then water them, let them grow, and harvest delicious food!`;
        if (protocols) {
          protocols.innerHTML = `
            <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 90 Seconds</div>
            <div class="protocol-item"><span>🌱</span> <strong>STEPS:</strong> Plant Seeds → Water → Grow → Harvest</div>
            <div class="protocol-item"><span>🍎</span> <strong>TARGET:</strong> 4 Cosmic Crop Beds</div>
          `;
        }
        if (guide) {
          guide.innerHTML = `
            <div class="board-key-row">
              <span class="board-key-action">Move: <strong>Arrow Keys / WASD</strong> • Action: <strong>Spacebar / Button</strong></span>
            </div>
          `;
        }
      } else if (taskNum === 3) {
        if (title) title.textContent = 'TASK 3: SOLAR POWER GENERATION';
        if (tagline) tagline.textContent = 'EARTH WORKSHOP • CLEAN ENERGY';
        if (codeId) codeId.textContent = 'MISSION #03-SOLAR';
        if (iconWrap) iconWrap.innerHTML = '☀️';
        if (sub) sub.textContent = `Assemble the solar array, ${pName}! Drag solar panel pieces onto the grey BARREN land slots. Remember: never place them on green fertile crop soil!`;
        if (protocols) {
          protocols.innerHTML = `
            <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 90 Seconds</div>
            <div class="protocol-item"><span>⚡</span> <strong>TARGET:</strong> Install all 4 Solar Panels</div>
            <div class="protocol-item"><span>🛡️</span> <strong>PROTECT:</strong> Do NOT place on Fertile Land</div>
          `;
        }
        if (guide) {
          guide.innerHTML = `
            <div class="board-key-row">
              <span class="board-key-action">Drag and drop solar panel pieces or click to place.</span>
            </div>
          `;
        }
      }
    } else {
      if (taskNum === 1) {
        if (title) title.textContent = 'TASK 1: FIX AIR LEAK';
        if (tagline) tagline.textContent = 'SPACE SURVIVAL • HULL INTEGRITY';
        if (codeId) codeId.textContent = 'MISSION #01-AIR-SEAL';
        if (iconWrap) iconWrap.innerHTML = '🛡️';
        if (sub) sub.textContent = `Emergency, ${pName}! Micro-meteoroids cracked our cockpit window! Click directly on breaches or fly near them to weld patches before pressure drops!`;
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
              <span class="board-key-action">Click breaches directly OR move with WASD/Arrows and press Spacebar.</span>
            </div>
          `;
        }
      } else if (taskNum === 2) {
        if (title) title.textContent = 'TASK 2: COLLECT ESSENTIALS';
        if (tagline) tagline.textContent = 'SPACE SURVIVAL • 3-LANE RUNNER';
        if (codeId) codeId.textContent = 'MISSION #02-RUNNER';
        if (iconWrap) iconWrap.innerHTML = '🏃';
        if (sub) sub.textContent = `High-speed highway sprint, ${pName}! Switch lanes, jump over red lasers, and slide under yellow gantries while gathering 15 vital supplies!`;
        if (protocols) {
          protocols.innerHTML = `
            <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 75 Seconds</div>
            <div class="protocol-item"><span>💎</span> <strong>GATHER:</strong> 5 O₂ + 5 Water + 5 Shields</div>
            <div class="protocol-item"><span>⚠️</span> <strong>DODGE:</strong> Jump Lasers (Up/Space), Slide Gantries (Down)</div>
          `;
        }
        if (guide) {
          guide.innerHTML = `
            <div class="board-key-row">
              <span class="board-key-action">Steer: <strong>A/D or ◀/▶</strong> • Jump: <strong>W/▲/Space</strong> • Slide: <strong>S/▼</strong></span>
            </div>
          `;
        }
      } else if (taskNum === 3) {
        if (title) title.textContent = 'TASK 3: POWER SAVE';
        if (tagline) tagline.textContent = 'SPACE SURVIVAL • REPAIR DECK';
        if (codeId) codeId.textContent = 'MISSION #03-POWER';
        if (iconWrap) iconWrap.innerHTML = '⚡';
        if (sub) sub.textContent = `Three spaceship systems are malfunctioning, ${pName}! Click blinking red rooms to connect matching colored wires, balance power sliders, and reboot keypads!`;
        if (protocols) {
          protocols.innerHTML = `
            <div class="protocol-item"><span>⏱️</span> <strong>TIME LIMIT:</strong> 120 Seconds</div>
            <div class="protocol-item"><span>🔌</span> <strong>WIRES:</strong> Drag matching colored cables</div>
            <div class="protocol-item"><span>⚡</span> <strong>GRID:</strong> Adjust sliders into green zones</div>
            <div class="protocol-item"><span>🔢</span> <strong>KEYPAD:</strong> Repeat flashing 4-step sequence</div>
          `;
        }
        if (guide) {
          guide.innerHTML = `
            <div class="board-key-row">
              <span class="board-key-action">Click flashing red room cards on the spaceship deck to solve minigames.</span>
            </div>
          `;
        }
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

  showTaskComplete(levelNum, taskNum, stats, onNext) {
    if (window.soundSystem) window.soundSystem.playVictory();
    if (window.showConfetti) window.showConfetti();

    const title = document.getElementById('completeTitle');
    const sub = document.getElementById('completeSubtitle');
    const stat1Val = document.getElementById('completeStat1Val');
    const stat1Lbl = document.getElementById('completeStat1Lbl');
    const stat2Val = document.getElementById('completeStat2Val');
    const stat2Lbl = document.getElementById('completeStat2Lbl');
    const nextBtn = document.getElementById('btnNextTask');

    const pName = (window.playerProfile && window.playerProfile.avatarName) || 'Cadet';

    if (title) title.textContent = `TASK ${taskNum} COMPLETE!`;

    if (levelNum === 1) {
      if (taskNum === 1) {
        if (sub) sub.textContent = `Superb work, ${pName}! Bio-dome oxygen stabilized cleanly at ${stats.oxygen || 21}%.`;
        if (stat1Lbl) stat1Lbl.textContent = 'Final Oxygen';
        if (stat1Val) stat1Val.textContent = `${stats.oxygen || 21}%`;
      } else if (taskNum === 2) {
        if (sub) sub.textContent = `Delicious harvest, ${pName}! 4 healthy cosmic crops ready for the space crew.`;
        if (stat1Lbl) stat1Lbl.textContent = 'Crops Harvested';
        if (stat1Val) stat1Val.textContent = '4 / 4';
      } else if (taskNum === 3) {
        if (sub) sub.textContent = `Fantastic engineering, ${pName}! Solar grid is 100% powered up!`;
        if (stat1Lbl) stat1Lbl.textContent = 'Solar Panels';
        if (stat1Val) stat1Val.textContent = '4 / 4';
      }
    } else {
      if (taskNum === 1) {
        if (sub) sub.textContent = `Rapid response, ${pName}! Cockpit window sealed airtight with nano-composite patches.`;
        if (stat1Lbl) stat1Lbl.textContent = 'Cabin Pressure';
        if (stat1Val) stat1Val.textContent = `${stats.pressureRemaining || 100}%`;
      } else if (taskNum === 2) {
        if (sub) sub.textContent = `Lightning speed, ${pName}! All 15 survival supply containers gathered safely.`;
        if (stat1Lbl) stat1Lbl.textContent = 'Supplies';
        if (stat1Val) stat1Val.textContent = '15 / 15';
      } else if (taskNum === 3) {
        if (sub) sub.textContent = `Ship systems restored, ${pName}! Power grid is fully functional.`;
        if (stat1Lbl) stat1Lbl.textContent = 'Power Saved';
        if (stat1Val) stat1Val.textContent = `${stats.powerRemaining || 100}%`;
      }
    }

    if (stat2Lbl) stat2Lbl.textContent = 'Time Taken';
    if (stat2Val) stat2Val.textContent = `${stats.timeTaken || 15}s`;

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
    const pName = (window.playerProfile && window.playerProfile.avatarName) || 'Cadet';

    if (reasonEl) reasonEl.textContent = reason || `Don't worry ${pName}, space exploration takes practice!`;
    if (taskEl) taskEl.textContent = taskName || 'Mission Retry';

    if (window.robotBuddy) {
      window.robotBuddy.say(`Don't give up, ${pName}! You can do this! Let's try again!`, 'worried');
    }

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
    if (window.showConfetti) window.showConfetti(4000);

    const timeVal = document.getElementById('victoryTotalTime');
    const scoreVal = document.getElementById('victoryTotalScore');
    const restartBtn = document.getElementById('btnRestartMission');
    const avatarBadge = document.getElementById('victoryAvatarBadge');
    const pName = (window.playerProfile && window.playerProfile.avatarName) || 'Space Explorer';

    if (avatarBadge) {
      avatarBadge.innerHTML = `
        <span class="victory-avatar-emoji">${window.playerProfile.avatarEmoji}</span>
        <h3>Awarded to Cadet ${pName}</h3>
        <p>Certified Space Mission Commander</p>
      `;
    }

    if (timeVal) timeVal.textContent = `${stats.totalTime || 45}s`;
    if (scoreVal) scoreVal.textContent = `${stats.score || 3000} PTS`;

    if (window.robotBuddy) {
      window.robotBuddy.say(
        `HIP-HIP-HOORAY! You completed all 3 tasks, ${pName}! You are officially a CosmoCrew Space Hero!`,
        'celebrate'
      );
    }

    if (restartBtn) {
      restartBtn.onclick = () => {
        this.closeAllModals();
        if (onRestart) onRestart();
      };
    }

    this.showModal('victory');
  }
}

/* -------------------------------------------------------------
   MAIN GAME CONTROLLER
   ------------------------------------------------------------- */
class GameController {
  constructor() {
    this.ui = new UIManager();
    this.currentLevel = 1;
    this.currentTaskNum = 1;
    this.activeTask = null;
    this.totalLevelTime = 0;
  }

  startLevel(levelNum) {
    this.currentLevel = levelNum;
    this.currentTaskNum = 1;
    this.totalLevelTime = 0;
    this.ui.showScreen('game');
    this.loadTask(this.currentLevel, this.currentTaskNum);
  }

  loadTask(levelNum, taskNum) {
    if (this.activeTask && this.activeTask.stop) {
      this.activeTask.stop();
    }
    this.activeTask = null;

    this.currentLevel = levelNum;
    this.currentTaskNum = taskNum;
    this.ui.setHUDForTask(levelNum, taskNum);

    // Callbacks passed to task instances
    const callbacks = {
      onWin: (stats) => this.handleTaskWin(stats),
      onLose: (data) => this.handleTaskLose(data),
      onUpdateHUD: (data) => this.handleUpdateHUD(data)
    };

    // Instantiate task
    if (levelNum === 1) {
      if (taskNum === 1) {
        this.activeTask = new window.Task1OxygenRegulation(callbacks);
      } else if (taskNum === 2) {
        this.activeTask = new window.Task2LunarCrops('l1t2Canvas', callbacks);
      } else if (taskNum === 3) {
        this.activeTask = new window.Task3SolarPower(callbacks);
      }
    } else {
      if (taskNum === 1) {
        this.activeTask = new window.Task1AirLeak('t1Canvas', callbacks);
      } else if (taskNum === 2) {
        this.activeTask = new window.Task2SpaceRunner('runnerCanvas', callbacks);
      } else if (taskNum === 3) {
        this.activeTask = new window.Task3PowerSave(callbacks);
      }
    }

    // Show Briefing before starting task
    this.ui.showBriefing(levelNum, taskNum, () => {
      if (this.activeTask && this.activeTask.start) {
        this.activeTask.start();
      }
    });
  }

  handleTaskWin(stats) {
    this.totalLevelTime += (stats.timeTaken || 20);

    if (this.currentTaskNum < 3) {
      this.ui.showTaskComplete(this.currentLevel, this.currentTaskNum, stats, () => {
        this.loadTask(this.currentLevel, this.currentTaskNum + 1);
      });
    } else {
      // Level Complete Victory!
      const totalScore = Math.max(1000, 3600 - this.totalLevelTime * 15);
      this.ui.showVictory(
        { totalTime: this.totalLevelTime, score: totalScore },
        () => this.quitToLevelSelect()
      );
    }
  }

  handleTaskLose(data) {
    this.ui.showGameOver(data.reason, data.taskName, () => {
      this.restartCurrentTask();
    });
  }

  handleUpdateHUD(data) {
    if (data.timeLeft !== undefined) {
      this.ui.updateTimer(data.timeLeft);
    }

    // Level 2 Task 1
    if (this.currentLevel === 2 && this.currentTaskNum === 1) {
      const fill = document.getElementById('t1PressureFill');
      const pct = document.getElementById('t1PressurePct');
      const leaks = document.getElementById('t1LeaksRemaining');
      if (fill) fill.style.width = `${data.pressure}%`;
      if (pct) pct.textContent = `${data.pressure}%`;
      if (leaks) leaks.textContent = `${data.leaksRemaining} / ${data.totalLeaks}`;
    }

    // Level 2 Task 2
    if (this.currentLevel === 2 && this.currentTaskNum === 2) {
      const o2 = document.getElementById('runnerO2Count');
      const water = document.getElementById('runnerWaterCount');
      const shield = document.getElementById('runnerShieldCount');
      if (o2) o2.textContent = `${data.oxygen}/${data.targets.oxygen}`;
      if (water) water.textContent = `${data.water}/${data.targets.water}`;
      if (shield) shield.textContent = `${data.shield}/${data.targets.shield}`;

      const pillO2 = document.getElementById('pillO2');
      const pillWater = document.getElementById('pillWater');
      const pillShield = document.getElementById('pillShield');
      if (pillO2) pillO2.classList.toggle('complete', data.oxygen >= data.targets.oxygen);
      if (pillWater) pillWater.classList.toggle('complete', data.water >= data.targets.water);
      if (pillShield) pillShield.classList.toggle('complete', data.shield >= data.targets.shield);
    }

    // Level 2 Task 3
    if (this.currentLevel === 2 && this.currentTaskNum === 3) {
      const fill = document.getElementById('t3PowerFill');
      const pct = document.getElementById('t3PowerPct');
      const count = document.getElementById('t3RepairedCount');
      if (fill) fill.style.width = `${data.power}%`;
      if (pct) pct.textContent = `${data.power}%`;
      if (count) count.textContent = `${data.repaired} / ${data.required}`;
    }
  }

  pauseGame() {
    if (this.activeTask && this.activeTask.pause) this.activeTask.pause();
    this.ui.showModal('pause');
  }

  resumeGame() {
    this.ui.closeAllModals();
    if (this.activeTask && this.activeTask.resume) this.activeTask.resume();
  }

  restartCurrentTask() {
    this.loadTask(this.currentLevel, this.currentTaskNum);
  }

  quitToLevelSelect() {
    if (this.activeTask && this.activeTask.stop) this.activeTask.stop();
    this.ui.showScreen('levelSelect');
    if (window.soundSystem) window.soundSystem.playMusic('playful');
  }

  quitToMenu() {
    if (this.activeTask && this.activeTask.stop) this.activeTask.stop();
    this.ui.showScreen('title');
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.robotBuddy = new RobotBuddy();
  window.game = new GameController();
});
