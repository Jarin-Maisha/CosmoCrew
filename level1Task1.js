/**
 * CosmoCrew - Level 1, Task 1: Oxygen Regulation
 * Players adjust the life-support slider to stabilize cabin oxygen to 21% (safe range: 19%–23%).
 * Features real-time danger/safe visual meters, alert sounds, hold-to-lock, and robot cheers.
 */

class Task1OxygenRegulation {
  constructor(callbacks) {
    this.callbacks = callbacks || {};

    this.active = false;
    this.paused = false;
    this.timeLeft = 60;
    this.timerInterval = null;

    this.currentO2 = 10; // Start in danger zone
    this.targetO2 = 21;
    this.minSafe = 19;
    this.maxSafe = 23;
    this.isSafe = false;

    this.lastAlertTime = 0;
    this.boundSliderInput = this.onSliderInput.bind(this);
    this.boundConfirmClick = this.onConfirmClick.bind(this);
  }

  start() {
    this.active = true;
    this.paused = false;
    this.timeLeft = 60;
    this.currentO2 = 10;
    this.isSafe = false;
    this.lastAlertTime = 0;

    const slider = document.getElementById('l1t1OxygenSlider');
    const confirmBtn = document.getElementById('l1t1ConfirmBtn');

    if (slider) {
      slider.value = this.currentO2;
      slider.removeEventListener('input', this.boundSliderInput);
      slider.addEventListener('input', this.boundSliderInput);
    }

    if (confirmBtn) {
      confirmBtn.removeEventListener('click', this.boundConfirmClick);
      confirmBtn.addEventListener('click', this.boundConfirmClick);
    }

    // Play playful music
    if (window.soundSystem) {
      window.soundSystem.playMusic('playful');
    }

    // Timer countdown
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.active || this.paused) return;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerGameOver('Time ran out! Oxygen dropped into critical danger.');
      }
      this.updateHUD();
    }, 1000);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Explorer';
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Hi ${playerName}! Let's regulate the Earth Workshop oxygen! Slide until it hits 21% (safe between 19%–23%)!`,
        'normal'
      );
    }

    this.updateDisplay();
    this.updateHUD();
  }

  onSliderInput(e) {
    if (!this.active || this.paused) return;
    this.currentO2 = parseInt(e.target.value, 10);

    if (window.soundSystem) {
      window.soundSystem.playSliderTick(300 + this.currentO2 * 8);
    }

    this.updateDisplay();
  }

  updateDisplay() {
    const valEl = document.getElementById('l1t1OxygenVal');
    const needle = document.getElementById('l1t1GaugeNeedle');
    const warningBox = document.getElementById('l1t1WarningBox');
    const confirmBtn = document.getElementById('l1t1ConfirmBtn');
    const statusPill = document.getElementById('l1t1StatusPill');
    const domeGlow = document.getElementById('l1t1DomeVisual');

    if (valEl) valEl.textContent = `${this.currentO2}%`;
    if (needle) needle.style.left = `${this.currentO2}%`;

    const wasSafe = this.isSafe;
    this.isSafe = this.currentO2 >= this.minSafe && this.currentO2 <= this.maxSafe;

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Cadet';

    if (this.isSafe) {
      if (warningBox) {
        warningBox.className = 'status-banner safe';
        warningBox.innerHTML = `<span>✅ SAFE ZONE!</span> Oxygen level is stable at ${this.currentO2}%. Ready to lock in!`;
      }
      if (statusPill) {
        statusPill.className = 'status-pill safe';
        statusPill.textContent = 'STABLE (19% - 23%)';
      }
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.add('pulse');
      }
      if (domeGlow) {
        domeGlow.classList.add('safe-glow');
        domeGlow.classList.remove('danger-glow');
      }

      if (!wasSafe) {
        if (window.soundSystem) window.soundSystem.playOxygenSafe();
        if (window.robotBuddy) {
          window.robotBuddy.say(`Spot on, ${playerName}! 21% is perfect! Click 'LOCK IN O₂ LEVEL' now!`, 'happy');
        }
      }
    } else {
      if (warningBox) {
        warningBox.className = 'status-banner danger';
        if (this.currentO2 < this.minSafe) {
          warningBox.innerHTML = `<span>⚠️ O₂ TOO LOW!</span> Currently at ${this.currentO2}%. Slide right to reach 21%!`;
        } else {
          warningBox.innerHTML = `<span>⚠️ O₂ TOO HIGH!</span> Currently at ${this.currentO2}%. Slide left to reach 21%!`;
        }
      }
      if (statusPill) {
        statusPill.className = 'status-pill danger';
        statusPill.textContent = 'DANGER ZONE!';
      }
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.classList.remove('pulse');
      }
      if (domeGlow) {
        domeGlow.classList.remove('safe-glow');
        domeGlow.classList.add('danger-glow');
      }

      // Play alert sound debounced
      const now = Date.now();
      if (now - this.lastAlertTime > 1600) {
        this.lastAlertTime = now;
        if (window.soundSystem) window.soundSystem.playOxygenDanger();
      }
    }
  }

  onConfirmClick() {
    if (!this.active || this.paused || !this.isSafe) return;
    this.triggerWin();
  }

  updateHUD() {
    if (this.callbacks.onUpdateHUD) {
      this.callbacks.onUpdateHUD({
        timeLeft: this.timeLeft,
        oxygen: this.currentO2,
        isSafe: this.isSafe
      });
    }
  }

  triggerWin() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Space Explorer';

    if (window.soundSystem) {
      window.soundSystem.playVictory();
    }

    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Fantastic job, ${playerName}! The bio-dome atmosphere is perfectly balanced at ${this.currentO2}%!`,
        'celebrate'
      );
    }

    if (window.showConfetti) {
      window.showConfetti();
    }

    setTimeout(() => {
      if (this.callbacks.onWin) {
        this.callbacks.onWin({
          timeTaken: 60 - this.timeLeft,
          oxygen: this.currentO2
        });
      }
    }, 1200);
  }

  triggerGameOver(reason) {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (this.callbacks.onLose) {
      this.callbacks.onLose({
        reason: reason || 'Oxygen level failed to stabilize in time.',
        taskName: 'Task 1: Oxygen Regulation'
      });
    }
  }

  stop() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }
}

window.Task1OxygenRegulation = Task1OxygenRegulation;
