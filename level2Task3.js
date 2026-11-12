/**
 * Space Survival Level 2 - Task 3: Power Save
 * Among Us-inspired Spaceship System Repair with 5 interactive stations,
 * random emergency malfunctions, power drain simulation, and 3 full mini-games:
 * 1) Connect Matching Coloured Wires
 * 2) Distribute Limited Power Grid
 * 3) System Reboot Button Sequence (Simon Keypad)
 */

class Task3PowerSave {
  constructor(callbacks) {
    this.callbacks = callbacks || {};

    this.active = false;
    this.paused = false;
    this.timerInterval = null;
    this.lastTime = 0;
    this.animationFrame = null;

    // Game state
    this.power = 100.0;
    this.timeLeft = 120;
    this.malfunctioningSystems = [];
    this.repairedCount = 0;
    this.requiredRepairs = 3;

    // Station definitions
    this.stations = [
      { id: 'oxygen', name: 'Oxygen Generator', minigame: 'wires', status: 'normal' },
      { id: 'navigation', name: 'Navigation Bridge', minigame: 'keypad', status: 'normal' },
      { id: 'reactor', name: 'Main Reactor', minigame: 'power', status: 'normal' },
      { id: 'lifeSupport', name: 'Life Support', minigame: 'power', status: 'normal' },
      { id: 'communication', name: 'Communication', minigame: 'wires', status: 'normal' }
    ];

    // Current active mini-game
    this.activeStation = null;
    this.currentMinigame = null;
    this.completionPending = false;

    // Mini-game states
    this.wiresState = {
      selectedLeft: null,
      connections: {}, // leftColor -> rightColor
      leftOrder: ['red', 'blue', 'yellow', 'green'],
      rightOrder: ['blue', 'yellow', 'red', 'green'],
      isDragging: false,
      dragColor: null,
      dragStart: { x: 0, y: 0 },
      dragCurrent: { x: 0, y: 0 }
    };

    this.powerState = {
      ch1: 15,
      ch2: 65,
      ch3: 20,
      targets: { ch1: 40, ch2: 35, ch3: 25 }
    };

    this.keypadState = {
      sequence: [],
      playerStep: 0,
      isShowingSequence: false
    };

    this.focusedStationIndex = 0;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.bindEvents();
  }

  bindEvents() {
    // A window capture listener is enough; registering on document as well
    // would process each key twice as the event bubbles through both targets.
    window.addEventListener('keydown', this.boundKeyDown, { capture: true });

    // Station card clicks
    const deck = document.getElementById('spaceshipDeck');
    if (deck) {
      deck.addEventListener('click', (e) => {
        if (!this.active || this.paused) return;
        const card = e.target.closest('.station-card');
        if (!card) return;
        const stationId = card.getAttribute('data-station');
        this.openStation(stationId);
      });
    }

    // Mini-game close button
    const closeBtn = document.getElementById('minigameCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeMinigame();
    }

    // Mini-game Wires: TRUE DRAG & DROP AND CLICK SUPPORT
    const wireContainer = document.getElementById('minigameWires');
    if (wireContainer) {
      const getPos = (e) => {
        const rect = wireContainer.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
        const clientY = e.touches ? e.touches[0].clientY : (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);
        return {
          clientX,
          clientY,
          x: clientX - rect.left,
          y: clientY - rect.top
        };
      };

      const startDrag = (e) => {
        const pin = e.target.closest('.wire-pin[data-side="left"]');
        if (!pin) return;
        if (e.cancelable) e.preventDefault();
        const color = pin.getAttribute('data-color');
        if (this.wiresState.connections[color]) return; // already connected

        const pos = getPos(e);
        const pRect = pin.getBoundingClientRect();
        const cRect = wireContainer.getBoundingClientRect();

        this.wiresState.isDragging = true;
        this.wiresState.dragColor = color;
        this.wiresState.dragStart = {
          x: pRect.right - cRect.left - 6,
          y: pRect.top + pRect.height / 2 - cRect.top
        };
        this.wiresState.dragCurrent = { x: pos.x, y: pos.y };

        if (window.soundSystem) window.soundSystem.playButtonClick();
        this.drawWiresLines();
      };

      const moveDrag = (e) => {
        if (!this.wiresState.isDragging) return;
        if (e.cancelable) e.preventDefault();
        const pos = getPos(e);
        this.wiresState.dragCurrent = { x: pos.x, y: pos.y };
        this.drawWiresLines();
      };

      const endDrag = (e) => {
        if (!this.wiresState.isDragging) return;
        const pos = getPos(e);
        const dragColor = this.wiresState.dragColor;
        this.wiresState.isDragging = false;
        this.wiresState.dragColor = null;

        // Check if released over matching right pin
        let hitRightPin = null;
        document.querySelectorAll('#wiresRightCol .wire-pin').forEach((pin) => {
          const pr = pin.getBoundingClientRect();
          if (
            pos.clientX >= pr.left - 30 &&
            pos.clientX <= pr.right + 30 &&
            pos.clientY >= pr.top - 30 &&
            pos.clientY <= pr.bottom + 30
          ) {
            hitRightPin = pin;
          }
        });

        if (hitRightPin) {
          const targetColor = hitRightPin.getAttribute('data-color');
          if (targetColor === dragColor) {
            // SUCCESSFUL WIRE CONNECTION!
            this.wiresState.connections[dragColor] = dragColor;
            if (window.soundSystem) window.soundSystem.playWireConnect();

            this.drawWiresLines();

            if (Object.keys(this.wiresState.connections).length === 4) {
              this.scheduleStationCompletion(450);
            }
          } else {
            // Mismatch
            if (window.soundSystem) window.soundSystem.playFailure();
            this.drawWiresLines();
          }
        } else {
          this.drawWiresLines();
        }
      };

      // Mouse drag events
      wireContainer.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', moveDrag);
      window.addEventListener('mouseup', endDrag);

      // Touch drag events
      wireContainer.addEventListener('touchstart', startDrag, { passive: false });
      window.addEventListener('touchmove', moveDrag, { passive: false });
      window.addEventListener('touchend', endDrag);

      // Click fallback
      wireContainer.addEventListener('click', (e) => {
        const pin = e.target.closest('.wire-pin');
        if (!pin) return;
        this.handleWirePinClick(pin);
      });
    }

    // Mini-game Power Sliders
    const s1 = document.getElementById('sliderCh1');
    const s2 = document.getElementById('sliderCh2');
    const s3 = document.getElementById('sliderCh3');

    if (s1) s1.oninput = (e) => this.handlePowerSlider('ch1', e.target.value);
    if (s2) s2.oninput = (e) => this.handlePowerSlider('ch2', e.target.value);
    if (s3) s3.oninput = (e) => this.handlePowerSlider('ch3', e.target.value);

    // Mini-game Keypad buttons
    const keypadGrid = document.getElementById('keypadGrid');
    if (keypadGrid) {
      keypadGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.keypad-key');
        if (!btn) return;
        const keyIndex = parseInt(btn.getAttribute('data-key'), 10);
        this.handleKeypadPress(keyIndex);
      });
    }
  }

  handleKeyDown(e) {
    if (!this.active || this.paused) return;
    const key = (e.key || '').toLowerCase();
    const code = e.code || '';

    // If a mini-game popup is active:
    if (this.activeStation) {
      if (key === 'escape') {
        this.closeMinigame();
        return;
      }

      // If keypad mini-game is open, allow pressing 1, 2, 3, 4
      if (this.activeStation.minigame === 'keypad') {
        if (key === '1' || code === 'Digit1' || code === 'Numpad1') this.handleKeypadPress(0);
        else if (key === '2' || code === 'Digit2' || code === 'Numpad2') this.handleKeypadPress(1);
        else if (key === '3' || code === 'Digit3' || code === 'Numpad3') this.handleKeypadPress(2);
        else if (key === '4' || code === 'Digit4' || code === 'Numpad4') this.handleKeypadPress(3);
      }
      return;
    }

    // On deck: Navigate between stations with Arrow Keys / WASD
    if (key === 'arrowleft' || key === 'a' || code === 'KeyA' || code === 'ArrowLeft') {
      e.preventDefault();
      this.focusedStationIndex = (this.focusedStationIndex - 1 + this.stations.length) % this.stations.length;
      this.highlightFocusedStation();
    } else if (key === 'arrowright' || key === 'd' || code === 'KeyD' || code === 'ArrowRight') {
      e.preventDefault();
      this.focusedStationIndex = (this.focusedStationIndex + 1) % this.stations.length;
      this.highlightFocusedStation();
    } else if (key === 'arrowup' || key === 'w' || code === 'KeyW' || code === 'ArrowUp') {
      e.preventDefault();
      this.focusedStationIndex = 2; // reactor center
      this.highlightFocusedStation();
    } else if (key === 'arrowdown' || key === 's' || code === 'KeyS' || code === 'ArrowDown') {
      e.preventDefault();
      this.focusedStationIndex = 3; // life support
      this.highlightFocusedStation();
    } else if (key === ' ' || key === 'enter' || key === 'e' || code === 'Space' || code === 'Enter' || code === 'KeyE') {
      e.preventDefault();
      const s = this.stations[this.focusedStationIndex];
      if (s) this.openStation(s.id);
    }
  }

  highlightFocusedStation() {
    this.stations.forEach((s, i) => {
      const el = document.getElementById(`station-${s.id}`);
      if (el) {
        if (i === this.focusedStationIndex) {
          el.style.transform = 'scale(1.06)';
          el.style.outline = '3px solid #00f0ff';
        } else {
          el.style.transform = '';
          el.style.outline = '';
        }
      }
    });
  }

  start() {
    this.active = true;
    this.paused = false;
    this.power = 100.0;
    this.timeLeft = 120;
    this.repairedCount = 0;
    this.activeStation = null;

    // Pick 3 random systems to malfunction
    this.initMalfunctions();

    // Sound
    if (window.soundSystem) {
      window.soundSystem.playMusic('emergency');
      window.soundSystem.playMalfunction();
    }

    // Timer interval
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.active || this.paused) return;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerGameOver('Time expired! Critical power systems failed.');
      }
      this.updateHUD();
    }, 1000);

    this.lastTime = performance.now();
    this.loop();
    this.updateHUD();
    this.renderStationsDOM();
  }

  initMalfunctions() {
    // Reset statuses
    this.stations.forEach(s => s.status = 'normal');

    // Shuffle and pick 3
    const shuffled = [...this.stations].sort(() => 0.5 - Math.random());
    this.malfunctioningSystems = shuffled.slice(0, 3).map(s => s.id);

    this.stations.forEach(s => {
      if (this.malfunctioningSystems.includes(s.id)) {
        s.status = 'malfunction';
      }
    });

    this.requiredRepairs = this.malfunctioningSystems.length;
  }

  renderStationsDOM() {
    this.stations.forEach((s) => {
      const el = document.getElementById(`station-${s.id}`);
      if (!el) return;

      el.classList.remove('malfunctioning', 'repaired');
      const pill = el.querySelector('.station-status-pill');

      if (s.status === 'malfunction') {
        el.classList.add('malfunctioning');
        if (pill) pill.textContent = 'ALERT: OFFLINE';
      } else if (s.status === 'repaired') {
        el.classList.add('repaired');
        if (pill) pill.textContent = 'OPERATIONAL';
      } else {
        if (pill) pill.textContent = 'NOMINAL';
      }
    });
  }

  openStation(stationId) {
    const station = this.stations.find(s => s.id === stationId);
    if (!station || station.status !== 'malfunction') return;

    this.activeStation = station;
    this.completionPending = false;
    this.completionPending = false;
    if (window.soundSystem) window.soundSystem.playButtonClick();

    // Show appropriate mini-game modal
    const overlay = document.getElementById('minigameModalOverlay');
    if (!overlay) return;

    overlay.classList.add('active');

    // Hide all minigames, then show the active one
    document.getElementById('minigameWires').style.display = 'none';
    document.getElementById('minigamePower').style.display = 'none';
    document.getElementById('minigameKeypad').style.display = 'none';

    const titleEl = document.getElementById('minigameTitle');
    const descEl = document.getElementById('minigameDesc');

    if (station.minigame === 'wires') {
      if (titleEl) titleEl.textContent = `REPAIR WIRES: ${station.name.toUpperCase()}`;
      if (descEl) descEl.textContent = 'Click matching colored terminal pins on left and right to connect severed conduits.';
      document.getElementById('minigameWires').style.display = 'flex';
      this.initWiresMiniGame();
    } else if (station.minigame === 'power') {
      if (titleEl) titleEl.textContent = `POWER BALANCE: ${station.name.toUpperCase()}`;
      if (descEl) descEl.textContent = 'Adjust distribution sliders to calibrate power into target green zones.';
      document.getElementById('minigamePower').style.display = 'flex';
      this.initPowerMiniGame();
    } else if (station.minigame === 'keypad') {
      if (titleEl) titleEl.textContent = `SYSTEM REBOOT: ${station.name.toUpperCase()}`;
      if (descEl) descEl.textContent = 'Observe the flashing reboot key sequence and repeat it accurately.';
      document.getElementById('minigameKeypad').style.display = 'flex';
      this.initKeypadMiniGame();
    }
  }

  closeMinigame() {
    const overlay = document.getElementById('minigameModalOverlay');
    if (overlay) overlay.classList.remove('active');
    this.activeStation = null;
    this.completionPending = false;
  }

  scheduleStationCompletion(delay = 500) {
    if (!this.activeStation || this.completionPending) return;
    this.completionPending = true;
    window.setTimeout(() => {
      if (this.activeStation && this.active) this.completeActiveStation();
      else this.completionPending = false;
    }, delay);
  }

  completeActiveStation() {
    if (!this.activeStation) return;
    this.activeStation.status = 'repaired';
    this.malfunctioningSystems = this.malfunctioningSystems.filter(id => id !== this.activeStation.id);
    this.repairedCount++;

    if (window.soundSystem) {
      window.soundSystem.playWireConnect();
    }

    this.renderStationsDOM();
    this.closeMinigame();
    this.updateHUD();

    // Check Win
    if (this.malfunctioningSystems.length === 0) {
      this.triggerWin();
    }
  }

  /* -------------------------------------------------------------
     MINI-GAME 1: WIRES
     ------------------------------------------------------------- */

  initWiresMiniGame() {
    this.wiresState.selectedLeft = null;
    this.wiresState.connections = {};

    // Shuffle right pins
    this.wiresState.rightOrder = ['red', 'blue', 'yellow', 'green'].sort(() => 0.5 - Math.random());

    this.renderWiresDOM();
    this.drawWiresLines();
  }

  renderWiresDOM() {
    const leftCol = document.getElementById('wiresLeftCol');
    const rightCol = document.getElementById('wiresRightCol');
    if (!leftCol || !rightCol) return;

    leftCol.innerHTML = '';
    rightCol.innerHTML = '';

    this.wiresState.leftOrder.forEach((color) => {
      const pin = document.createElement('div');
      pin.className = `wire-pin pin-${color}`;
      pin.setAttribute('data-side', 'left');
      pin.setAttribute('data-color', color);
      leftCol.appendChild(pin);
    });

    this.wiresState.rightOrder.forEach((color) => {
      const pin = document.createElement('div');
      pin.className = `wire-pin pin-${color}`;
      pin.setAttribute('data-side', 'right');
      pin.setAttribute('data-color', color);
      rightCol.appendChild(pin);
    });
  }

  handleWirePinClick(pin) {
    const side = pin.getAttribute('data-side');
    const color = pin.getAttribute('data-color');

    if (side === 'left') {
      // Select left pin
      document.querySelectorAll('#wiresLeftCol .wire-pin').forEach(p => p.classList.remove('selected'));
      this.wiresState.selectedLeft = color;
      pin.classList.add('selected');
      if (window.soundSystem) window.soundSystem.playButtonClick();

    } else if (side === 'right') {
      // Connect to right pin
      if (!this.wiresState.selectedLeft) return;

      if (this.wiresState.selectedLeft === color) {
        // Correct wire connection!
        this.wiresState.connections[color] = color;
        if (window.soundSystem) window.soundSystem.playWireConnect();

        document.querySelectorAll('#wiresLeftCol .wire-pin').forEach(p => p.classList.remove('selected'));
        this.wiresState.selectedLeft = null;

        this.drawWiresLines();

        // Check if all 4 connected
        if (Object.keys(this.wiresState.connections).length === 4) {
          this.scheduleStationCompletion(450);
        }
      } else {
        // Wrong wire color
        if (window.soundSystem) window.soundSystem.playFailure();
      }
    }
  }

  drawWiresLines() {
    const canvas = document.getElementById('wireCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colorHex = {
      red: '#ff2a5f',
      blue: '#00b4d8',
      yellow: '#ffb703',
      green: '#00ff88'
    };

    Object.keys(this.wiresState.connections).forEach((color) => {
      const leftPin = document.querySelector(`#wiresLeftCol .pin-${color}`);
      const rightPin = document.querySelector(`#wiresRightCol .pin-${color}`);

      if (leftPin && rightPin) {
        const lRect = leftPin.getBoundingClientRect();
        const rRect = rightPin.getBoundingClientRect();

        const x1 = lRect.right - rect.left - 6;
        const y1 = lRect.top + lRect.height / 2 - rect.top;
        const x2 = rRect.left - rect.left + 6;
        const y2 = rRect.top + rRect.height / 2 - rect.top;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x1 + 80, y1, x2 - 80, y2, x2, y2);
        ctx.strokeStyle = colorHex[color];
        ctx.lineWidth = 7;
        ctx.shadowColor = colorHex[color];
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // Draw live dragging wire!
    if (this.wiresState.isDragging && this.wiresState.dragColor) {
      const color = this.wiresState.dragColor;
      const s = this.wiresState.dragStart;
      const c = this.wiresState.dragCurrent;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.bezierCurveTo(s.x + 80, s.y, c.x - 40, c.y, c.x, c.y);
      ctx.strokeStyle = colorHex[color];
      ctx.lineWidth = 8;
      ctx.shadowColor = colorHex[color];
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw probe tip connector at cursor
      ctx.beginPath();
      ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = colorHex[color];
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  /* -------------------------------------------------------------
     MINI-GAME 2: POWER DISTRIBUTION GRID
     ------------------------------------------------------------- */

  initPowerMiniGame() {
    this.powerState.ch1 = 15;
    this.powerState.ch2 = 65;
    this.powerState.ch3 = 20;

    const s1 = document.getElementById('sliderCh1');
    const s2 = document.getElementById('sliderCh2');
    const s3 = document.getElementById('sliderCh3');

    if (s1) s1.value = this.powerState.ch1;
    if (s2) s2.value = this.powerState.ch2;
    if (s3) s3.value = this.powerState.ch3;

    this.updatePowerSlidersDisplay();
  }

  handlePowerSlider(ch, val) {
    const num = parseInt(val, 10);
    this.powerState[ch] = num;

    if (window.soundSystem) {
      window.soundSystem.playSliderTick(300 + num * 5);
    }

    this.updatePowerSlidersDisplay();

    // Check calibration tolerance (within +/- 4% of target)
    const t = this.powerState.targets;
    const ok1 = Math.abs(this.powerState.ch1 - t.ch1) <= 4;
    const ok2 = Math.abs(this.powerState.ch2 - t.ch2) <= 4;
    const ok3 = Math.abs(this.powerState.ch3 - t.ch3) <= 4;

    if (ok1 && ok2 && ok3) {
      this.scheduleStationCompletion(650);
    }
  }

  updatePowerSlidersDisplay() {
    const t = this.powerState.targets;
    let calibratedCount = 0;

    ['ch1', 'ch2', 'ch3'].forEach((ch) => {
      const valEl = document.getElementById(`val${ch.toUpperCase()}`);
      const parent = document.getElementById(`channel${ch.toUpperCase()}`);
      if (valEl) valEl.textContent = `${this.powerState[ch]}%`;

      if (parent) {
        if (Math.abs(this.powerState[ch] - t[ch]) <= 4) {
          parent.classList.add('calibrated');
          calibratedCount++;
        } else {
          parent.classList.remove('calibrated');
        }
      }
    });

    const status = document.getElementById('powerCalibrationStatus');
    if (status) {
      status.textContent = calibratedCount === 3
        ? 'ALL CHANNELS LOCKED · RESTORING SYSTEM…'
        : `${calibratedCount} / 3 POWER CHANNELS CALIBRATED`;
      status.classList.toggle('complete', calibratedCount === 3);
    }
  }

  /* -------------------------------------------------------------
     MINI-GAME 3: KEYPAD SEQUENCE (SIMON SAYS)
     ------------------------------------------------------------- */

  initKeypadMiniGame() {
    this.keypadState.sequence = [0, 1, 2, 3].sort(() => 0.5 - Math.random());
    this.keypadState.playerStep = 0;
    this.keypadState.isShowingSequence = true;

    this.renderKeypadSlots();
    this.playKeypadSequence();
  }

  renderKeypadSlots() {
    const container = document.getElementById('sequenceSlots');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < this.keypadState.sequence.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'seq-slot';
      slot.id = `seqSlot-${i}`;
      slot.textContent = '?';
      container.appendChild(slot);
    }
  }

  playKeypadSequence() {
    this.keypadState.isShowingSequence = true;
    let step = 0;

    const timer = setInterval(() => {
      if (step >= this.keypadState.sequence.length) {
        clearInterval(timer);
        this.keypadState.isShowingSequence = false;
        return;
      }

      const keyIndex = this.keypadState.sequence[step];
      this.flashKeypadButton(keyIndex);

      const slot = document.getElementById(`seqSlot-${step}`);
      if (slot) {
        slot.textContent = keyIndex + 1;
        slot.classList.add('active');
      }

      step++;
    }, 700);
  }

  flashKeypadButton(keyIndex) {
    const btn = document.querySelector(`.keypad-key[data-key="${keyIndex}"]`);
    if (btn) {
      btn.classList.add('pressed');
      if (window.soundSystem) window.soundSystem.playSequenceNote(keyIndex);
      setTimeout(() => btn.classList.remove('pressed'), 350);
    }
  }

  handleKeypadPress(keyIndex) {
    if (this.keypadState.isShowingSequence) return;

    this.flashKeypadButton(keyIndex);

    const expected = this.keypadState.sequence[this.keypadState.playerStep];
    if (keyIndex === expected) {
      // Correct step
      const slot = document.getElementById(`seqSlot-${this.keypadState.playerStep}`);
      if (slot) {
        slot.style.borderColor = '#00ff88';
        slot.style.color = '#00ff88';
      }

      this.keypadState.playerStep++;

      if (this.keypadState.playerStep >= this.keypadState.sequence.length) {
        // Complete sequence!
        this.scheduleStationCompletion(500);
      }
    } else {
      // Wrong key!
      if (window.soundSystem) window.soundSystem.playFailure();
      this.keypadState.playerStep = 0;
      setTimeout(() => this.initKeypadMiniGame(), 600);
    }
  }

  /* -------------------------------------------------------------
     TASK LIFECYCLE & TICK
     ------------------------------------------------------------- */

  loop(timestamp = performance.now()) {
    if (!this.active) return;
    this.animationFrame = requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (!this.paused) {
      this.update(dt);
    }
  }

  update(dt) {
    const activeMalfunctions = this.malfunctioningSystems.length;

    // Power drains while malfunctions exist
    if (activeMalfunctions > 0) {
      const drainRate = 0.45 * activeMalfunctions; // ~1.35%/s with 3 systems; leaves time to repair
      this.power -= drainRate * dt;
      if (this.power <= 0) {
        this.power = 0;
        this.updateHUD();
        this.triggerGameOver('Main spaceship battery depleted to 0%! Systems shutdown.');
        return;
      }
    }

    this.updateHUD();
  }

  updateHUD() {
    if (this.callbacks.onUpdateHUD) {
      this.callbacks.onUpdateHUD({
        power: Math.round(this.power),
        timeLeft: this.timeLeft,
        repaired: this.repairedCount,
        required: this.requiredRepairs
      });
    }
  }

  triggerWin() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (window.soundSystem) window.soundSystem.stopMusic();

    setTimeout(() => {
      if (this.callbacks.onWin) {
        this.callbacks.onWin({
          powerRemaining: Math.round(this.power),
          timeTaken: 120 - this.timeLeft
        });
      }
    }, 600);
  }

  triggerGameOver(reason) {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (window.soundSystem) window.soundSystem.stopMusic();

    this.closeMinigame();

    if (this.callbacks.onLose) {
      this.callbacks.onLose({
        reason: reason || 'Spacecraft power depleted!',
        taskName: 'Task 3: Power Save'
      });
    }
  }

  stop() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (window.soundSystem) window.soundSystem.stopMusic();
    this.closeMinigame();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
  }
}

window.Task3PowerSave = Task3PowerSave;