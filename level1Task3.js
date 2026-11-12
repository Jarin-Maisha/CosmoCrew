/**
 * CosmoCrew - Level 1, Task 3: Solar Power Generation
 * Player drags & drops solar panel jigsaw units onto barren lunar land.
 * Placement on fertile land is blocked to protect the bio-reserve!
 */

class Task3SolarPower {
  constructor(callbacks) {
    this.callbacks = callbacks || {};

    this.active = false;
    this.paused = false;
    this.timeLeft = 90;
    this.timerInterval = null;

    // Slots definition (2 Fertile tiles, 4 Barren slots)
    this.slots = [
      { id: 'b1', type: 'barren', label: 'Barren Slot A', panelId: null },
      { id: 'f1', type: 'fertile', label: 'Bio-Reserve Alpha', panelId: null },
      { id: 'b2', type: 'barren', label: 'Barren Slot B', panelId: null },
      { id: 'f2', type: 'fertile', label: 'Bio-Reserve Beta', panelId: null },
      { id: 'b3', type: 'barren', label: 'Barren Slot C', panelId: null },
      { id: 'b4', type: 'barren', label: 'Barren Slot D', panelId: null }
    ];

    // 4 Solar panel pieces
    this.panels = [
      { id: 'p1', name: 'Alpha Panel', installedSlot: null },
      { id: 'p2', name: 'Beta Panel', installedSlot: null },
      { id: 'p3', name: 'Gamma Panel', installedSlot: null },
      { id: 'p4', name: 'Delta Panel', installedSlot: null }
    ];

    this.selectedPanelId = null;
    this.installedCount = 0;
  }

  start() {
    this.active = true;
    this.paused = false;
    this.timeLeft = 90;
    this.installedCount = 0;
    this.selectedPanelId = null;

    // Reset slots and panels
    this.slots.forEach(s => (s.panelId = null));
    this.panels.forEach(p => (p.installedSlot = null));

    if (window.soundSystem) {
      window.soundSystem.playMusic('playful');
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.active || this.paused) return;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerGameOver('Time ran out before solar power grid was installed!');
      }
      this.updateHUD();
    }, 1000);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Engineer';
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Hey ${playerName}! Drag solar panels onto the grey BARREN land slots. Do NOT place them on green FERTILE soil!`,
        'normal'
      );
    }

    this.renderBoard();
    this.updateHUD();
  }

  renderBoard() {
    const tray = document.getElementById('l1t3PanelTray');
    const grid = document.getElementById('l1t3Grid');
    if (!tray || !grid) return;

    // Render Tray Pieces
    tray.innerHTML = '';
    this.panels.forEach(panel => {
      if (panel.installedSlot) return; // Already on board

      const card = document.createElement('div');
      card.className = `solar-piece ${this.selectedPanelId === panel.id ? 'selected' : ''}`;
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-panel', panel.id);

      card.innerHTML = `
        <div class="solar-icon">
          <svg viewBox="0 0 60 40" width="70" height="46">
            <rect x="2" y="2" width="56" height="36" rx="4" fill="#023e8a" stroke="#00f0ff" stroke-width="2.5"/>
            <line x1="20" y1="2" x2="20" y2="38" stroke="#00f0ff" stroke-width="1.5"/>
            <line x1="38" y1="2" x2="38" y2="38" stroke="#00f0ff" stroke-width="1.5"/>
            <line x1="2" y1="14" x2="58" y2="14" stroke="#00f0ff" stroke-width="1.5"/>
            <line x1="2" y1="26" x2="58" y2="26" stroke="#00f0ff" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="solar-name">${panel.name}</div>
        <div class="solar-hint">Drag or Click</div>
      `;

      // Drag start
      card.ondragstart = (e) => {
        if (!this.active || this.paused) return;
        this.selectedPanelId = panel.id;
        e.dataTransfer.setData('text/plain', panel.id);
        if (window.soundSystem) window.soundSystem.playButtonClick();
      };

      // Click to select
      card.onclick = () => {
        if (!this.active || this.paused) return;
        this.selectedPanelId = this.selectedPanelId === panel.id ? null : panel.id;
        if (window.soundSystem) window.soundSystem.playButtonClick();
        this.renderBoard();
      };

      tray.appendChild(card);
    });

    // Render Grid Slots
    grid.innerHTML = '';
    this.slots.forEach(slot => {
      const tile = document.createElement('div');
      tile.className = `terrain-slot ${slot.type} ${slot.panelId ? 'occupied' : 'empty'}`;
      tile.setAttribute('data-slot', slot.id);

      if (slot.type === 'fertile') {
        tile.innerHTML = `
          <div class="slot-badge fertile">🌱 FERTILE SOIL</div>
          <div class="slot-desc">Bio-Dome Reserve<br><strong>NO SOLAR PANELS!</strong></div>
          <div class="fertile-plants-icon">🌿🌺🌾</div>
        `;
      } else {
        // Barren land
        if (slot.panelId) {
          tile.innerHTML = `
            <div class="slot-badge barren active">⚡ POWER ONLINE</div>
            <div class="installed-panel-graphic">
              <svg viewBox="0 0 70 45" width="80" height="52">
                <rect x="2" y="2" width="66" height="41" rx="4" fill="#0077b6" stroke="#ffd166" stroke-width="3"/>
                <line x1="24" y1="2" x2="24" y2="43" stroke="#caf0f8" stroke-width="1.8"/>
                <line x1="46" y1="2" x2="46" y2="43" stroke="#caf0f8" stroke-width="1.8"/>
                <line x1="2" y1="16" x2="68" y2="16" stroke="#caf0f8" stroke-width="1.8"/>
                <line x1="2" y1="29" x2="68" y2="29" stroke="#caf0f8" stroke-width="1.8"/>
              </svg>
            </div>
            <div class="slot-power-tag">100% SOLAR GEN</div>
          `;
        } else {
          tile.innerHTML = `
            <div class="slot-badge barren">⚡ BARREN LAND</div>
            <div class="slot-desc">Unused Regolith Rock<br><strong>PLACE PANEL HERE</strong></div>
            <div class="drop-target-box">➕ DROP SOLAR PIECE</div>
          `;
        }
      }

      // Drag and drop events
      tile.ondragover = (e) => {
        e.preventDefault();
        tile.classList.add('drag-hover');
      };

      tile.ondragleave = () => {
        tile.classList.remove('drag-hover');
      };

      tile.ondrop = (e) => {
        e.preventDefault();
        tile.classList.remove('drag-hover');
        const panelId = e.dataTransfer.getData('text/plain') || this.selectedPanelId;
        this.attemptPlacement(panelId, slot);
      };

      // Click to place if selected
      tile.onclick = () => {
        if (!this.active || this.paused) return;
        if (this.selectedPanelId) {
          this.attemptPlacement(this.selectedPanelId, slot);
        }
      };

      grid.appendChild(tile);
    });
  }

  attemptPlacement(panelId, slot) {
    if (!panelId || !slot) return;
    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Explorer';

    if (slot.type === 'fertile') {
      // FORBIDDEN PLACEMENT
      if (window.soundSystem) window.soundSystem.playFailure();
      if (window.robotBuddy) {
        window.robotBuddy.say(
          `Oops, ${playerName}! Fertile land is reserved for crops! Solar panels only work on rocky barren land!`,
          'worried'
        );
      }
      this.selectedPanelId = null;
      this.renderBoard();
      return;
    }

    if (slot.panelId) {
      // Already occupied
      return;
    }

    // SUCCESSFUL PLACEMENT ON BARREN LAND!
    const panel = this.panels.find(p => p.id === panelId);
    if (!panel) return;

    slot.panelId = panel.id;
    panel.installedSlot = slot.id;
    this.installedCount++;
    this.selectedPanelId = null;

    if (window.soundSystem) {
      window.soundSystem.playSnapPanel();
    }

    this.renderBoard();
    this.updateHUD();

    if (this.installedCount === 4) {
      this.triggerWin();
    } else {
      if (window.robotBuddy) {
        window.robotBuddy.say(
          `Great snap, ${playerName}! Panel ${this.installedCount} of 4 is generating clean power!`,
          'happy'
        );
      }
    }
  }

  updateHUD() {
    const powerPct = Math.round((this.installedCount / 4) * 100);
    const powerFill = document.getElementById('l1t3PowerFill');
    const powerVal = document.getElementById('l1t3PowerVal');
    const countVal = document.getElementById('l1t3CountVal');

    if (powerFill) powerFill.style.width = `${powerPct}%`;
    if (powerVal) powerVal.textContent = `${powerPct}%`;
    if (countVal) countVal.textContent = `${this.installedCount} / 4`;

    if (this.callbacks.onUpdateHUD) {
      this.callbacks.onUpdateHUD({
        timeLeft: this.timeLeft,
        installed: this.installedCount,
        total: 4,
        powerPct: powerPct
      });
    }
  }

  triggerWin() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Engineer';

    if (window.soundSystem) window.soundSystem.playVictory();
    if (window.showConfetti) window.showConfetti();

    if (window.robotBuddy) {
      window.robotBuddy.say(
        `WOOHOO, ${playerName}! All 4 solar arrays are installed! Level 1 Earth Workshop is 100% complete!`,
        'celebrate'
      );
    }

    setTimeout(() => {
      if (this.callbacks.onWin) {
        this.callbacks.onWin({
          timeTaken: 90 - this.timeLeft,
          panelsPlaced: 4
        });
      }
    }, 1400);
  }

  triggerGameOver(reason) {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (this.callbacks.onLose) {
      this.callbacks.onLose({
        reason: reason || 'Solar panel installation not completed in time.',
        taskName: 'Task 3: Solar Power Generation'
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

window.Task3SolarPower = Task3SolarPower;
