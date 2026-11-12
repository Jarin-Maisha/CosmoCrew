/**
 * Space Survival Level 2 - Task 2: Collect Essentials
 * Subway Surfers-inspired 3-lane Space Runner with pseudo-3D perspective,
 * cartoon astronaut animations, jump/slide mechanics, obstacles, collectibles,
 * floating score sparkles, and comprehensive keyboard + touch swipe controls.
 */

class Task2SpaceRunner {
  constructor(canvasId, callbacks) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.callbacks = callbacks || {};

    this.active = false;
    this.paused = false;
    this.animationFrame = null;
    this.lastTime = 0;
    this.timerInterval = null;

    // Viewport
    this.width = 0;
    this.height = 0;

    // Game state
    this.timeLeft = 75; // generous 75 seconds
    this.resources = {
      oxygen: 0,
      water: 0,
      shield: 0
    };
    this.targets = {
      oxygen: 5,
      water: 5,
      shield: 5
    };

    // Runner physics & motion
    this.speed = 1.0;
    this.distance = 0;

    // Astronaut player
    this.currentLane = 1; // 0: Left, 1: Center, 2: Right
    this.laneX = 1; // Lerped position
    this.isJumping = false;
    this.jumpY = 0;
    this.jumpVelocity = 0;
    this.isSliding = false;
    this.slideTimer = 0;
    this.runAnimPhase = 0;
    this.invulnerableTimer = 0;

    // Obstacles and Collectibles in track
    this.trackItems = [];
    this.spawnDistanceCounter = 0;

    // Visual particles & floating text
    this.particles = [];
    this.floatingTexts = [];
    this.screenShake = 0;

    // Input handlers
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.bindEvents();
  }

  bindEvents() {
    // Listen ONLY on window (single listener prevents duplicate firing)
    window.addEventListener('keydown', this.boundKeyDown);

    if (this.canvas) {
      // Direct click on left/right/top/bottom of canvas
      this.canvas.addEventListener('mousedown', (e) => {
        if (!this.active || this.paused) return;
        const rect = this.canvas.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width;
        const ny = (e.clientY - rect.top) / rect.height;

        if (ny < 0.28) {
          this.jump();
        } else if (ny > 0.78) {
          this.slide();
        } else if (nx < 0.38) {
          this.moveLeft();
        } else if (nx > 0.62) {
          this.moveRight();
        }
      });

      // Touch swipe detection
      this.canvas.addEventListener('touchstart', (e) => {
        if (!this.active || this.paused) return;
        const t = e.touches[0];
        this.touchStartX = t.clientX;
        this.touchStartY = t.clientY;
      }, { passive: true });

      this.canvas.addEventListener('touchend', (e) => {
        if (!this.active || this.paused) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - this.touchStartX;
        const dy = t.clientY - this.touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        const minSwipe = 25;
        if (Math.max(absX, absY) > minSwipe) {
          if (absX > absY) {
            // Horizontal swipe
            if (dx > 0) this.moveRight();
            else this.moveLeft();
          } else {
            // Vertical swipe
            if (dy < 0) this.jump();
            else this.slide();
          }
        }
      }, { passive: true });
    }

    // Bind on-screen virtual buttons if present
    const btnLeft = document.getElementById('touchBtnLeft');
    const btnRight = document.getElementById('touchBtnRight');
    const btnJump = document.getElementById('touchBtnJump');
    const btnSlide = document.getElementById('touchBtnSlide');

    if (btnLeft) btnLeft.onclick = (e) => { e.preventDefault(); this.moveLeft(); };
    if (btnRight) btnRight.onclick = (e) => { e.preventDefault(); this.moveRight(); };
    if (btnJump) btnJump.onclick = (e) => { e.preventDefault(); this.jump(); };
    if (btnSlide) btnSlide.onclick = (e) => { e.preventDefault(); this.slide(); };
  }

  handleKeyDown(e) {
    if (!this.active || this.paused) return;
    if (e.repeat) return; // PREVENT SKIPPING: ignores key-repeat so 1 press = 1 lane move

    const key = (e.key || '').toLowerCase();
    const code = e.code || '';

    if (key === 'arrowleft' || key === 'a' || code === 'KeyA' || code === 'ArrowLeft' || code === 'Numpad4') {
      e.preventDefault();
      this.moveLeft();
    } else if (key === 'arrowright' || key === 'd' || code === 'KeyD' || code === 'ArrowRight' || code === 'Numpad6') {
      e.preventDefault();
      this.moveRight();
    } else if (key === 'arrowup' || key === 'w' || key === ' ' || code === 'KeyW' || code === 'ArrowUp' || code === 'Space' || code === 'Numpad8') {
      e.preventDefault();
      this.jump();
    } else if (key === 'arrowdown' || key === 's' || code === 'KeyS' || code === 'ArrowDown' || code === 'Numpad2') {
      e.preventDefault();
      this.slide();
    }
  }

  moveLeft() {
    if (this.currentLane > 0) {
      this.currentLane--;
      if (window.soundSystem) window.soundSystem.playButtonClick();
    }
  }

  moveRight() {
    if (this.currentLane < 2) {
      this.currentLane++;
      if (window.soundSystem) window.soundSystem.playButtonClick();
    }
  }

  jump() {
    if (!this.isJumping && !this.isSliding) {
      this.isJumping = true;
      this.jumpVelocity = 540; // Higher, cleaner jump arc
      if (window.soundSystem) window.soundSystem.playJump();
    }
  }

  slide() {
    if (!this.isSliding && !this.isJumping) {
      this.isSliding = true;
      this.slideTimer = 0.65; // slide duration in seconds
      if (window.soundSystem) window.soundSystem.playSlide();
    }
  }

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  start() {
    this.resize();
    this.active = true;
    this.paused = false;
    this.timeLeft = 75;
    this.resources = { oxygen: 0, water: 0, shield: 0 };
    this.currentLane = 1;
    this.laneX = 1;
    this.isJumping = false;
    this.jumpY = 0;
    this.isSliding = false;
    this.slideTimer = 0;
    this.invulnerableTimer = 0;
    this.trackItems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnDistanceCounter = 0;
    this.distance = 0;

    // Sound
    if (window.soundSystem) {
      window.soundSystem.playMusic('runner');
    }

    // Timer countdown
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.active || this.paused) return;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerGameOver('Time ran out! Failed to collect critical survival essentials.');
      }
      this.updateHUD();
    }, 1000);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Runner';
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Run ${playerName}! Arrow keys or A/D to steer, Up/Space to JUMP red lasers, Down to SLIDE yellow gantries! Gather 5 O₂, 5 Water, 5 Shields!`,
        'excited'
      );
    }

    this.lastTime = performance.now();
    this.loop();
    this.updateHUD();
  }

  updateHUD() {
    if (this.callbacks.onUpdateHUD) {
      this.callbacks.onUpdateHUD({
        timeLeft: this.timeLeft,
        oxygen: this.resources.oxygen,
        water: this.resources.water,
        shield: this.resources.shield,
        targets: this.targets
      });
    }
  }

  triggerWin() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (window.soundSystem) window.soundSystem.stopMusic();

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Runner';
    if (window.soundSystem) window.soundSystem.playVictory();
    if (window.showConfetti) window.showConfetti();
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Incredible sprint, ${playerName}! All 15 survival items collected from the lunar highway!`,
        'celebrate'
      );
    }

    setTimeout(() => {
      if (this.callbacks.onWin) {
        this.callbacks.onWin({
          timeTaken: 75 - this.timeLeft,
          collected: this.resources
        });
      }
    }, 1200);
  }

  triggerGameOver(reason) {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (window.soundSystem) window.soundSystem.stopMusic();

    if (this.callbacks.onLose) {
      this.callbacks.onLose({
        reason: reason || 'Oxygen/energy depleted before gathering essentials.',
        taskName: 'Task 2: Collect Essentials'
      });
    }
  }

  stop() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (window.soundSystem) window.soundSystem.stopMusic();
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
  }

  loop(timestamp = performance.now()) {
    if (!this.active) return;
    this.animationFrame = requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (!this.paused) {
      this.update(dt);
    }
    this.render();
  }

  update(dt) {
    // Forward motion
    this.distance += dt * 38;
    this.runAnimPhase += dt * 14;

    // Smooth lane interpolation
    this.laneX += (this.currentLane - this.laneX) * 22 * dt;
    if (Math.abs(this.currentLane - this.laneX) < 0.01) {
      this.laneX = this.currentLane;
    }

    // Jump physics (frame-rate independent)
    if (this.isJumping) {
      this.jumpY += this.jumpVelocity * dt;
      this.jumpVelocity -= 1400 * dt; // gravity
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.isJumping = false;
      }
    }

    // Slide duration
    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // Invulnerability recovery
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // Spawn track items (collectibles and obstacles)
    this.spawnDistanceCounter += dt * 38;
    if (this.spawnDistanceCounter > 16) {
      this.spawnDistanceCounter = 0;
      this.spawnTrackPattern();
    }

    // Update track items (z-distance moving from 100 towards 0)
    for (let i = this.trackItems.length - 1; i >= 0; i--) {
      const item = this.trackItems[i];
      item.z -= dt * 22; // approaching player

      // Collision check when item reaches player (z between 5 and 18)
      if (item.z > 4 && item.z < 18 && !item.hit) {
        const itemLane = item.lane;
        // Check if in same lane (within 0.45 tolerance)
        if (Math.abs(this.laneX - itemLane) < 0.55) {
          this.handlePlayerCollision(item);
        }
      }

      // Remove items passed behind player
      if (item.z <= 0) {
        this.trackItems.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 45;
      ft.life -= dt * 1.5;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update particles (sparkles, thruster trails)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt * 1.8;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnTrackPattern() {
    const lanes = [0, 1, 2];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];

    // Decide whether to spawn a collectible or an obstacle
    // Priority: spawn needed collectibles
    const needO2 = this.resources.oxygen < this.targets.oxygen;
    const needWater = this.resources.water < this.targets.water;
    const needShield = this.resources.shield < this.targets.shield;

    const neededTypes = [];
    if (needO2) neededTypes.push('oxygen');
    if (needWater) neededTypes.push('water');
    if (needShield) neededTypes.push('shield');

    const shouldSpawnCollectible = neededTypes.length > 0 && Math.random() < 0.65;

    if (shouldSpawnCollectible) {
      const type = neededTypes[Math.floor(Math.random() * neededTypes.length)];
      this.trackItems.push({
        id: Math.random(),
        isCollectible: true,
        type: type,
        lane: lane,
        z: 100, // distant horizon
        hit: false
      });
    } else {
      // Spawn obstacle
      const obstacleTypes = ['low', 'high', 'barrier'];
      const obsType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      this.trackItems.push({
        id: Math.random(),
        isCollectible: false,
        type: obsType,
        lane: lane,
        z: 100,
        hit: false
      });
    }
  }

  handlePlayerCollision(item) {
    if (item.isCollectible) {
      // Pick up resource!
      item.hit = true;
      this.resources[item.type]++;
      if (window.soundSystem) {
        window.soundSystem.playCollect(item.type);
      }

      // Floating text effect
      const label = item.type === 'oxygen' ? '+1 OXYGEN' : (item.type === 'water' ? '+1 WATER ICE' : '+1 SHIELDING');
      const color = item.type === 'oxygen' ? '#00f0ff' : (item.type === 'water' ? '#64dfdf' : '#ffb703');
      this.addFloatingText(label, color);

      // Collect sparkle particles
      this.createCollectSparks(item.lane, color);

      this.updateHUD();

      // Check win condition
      if (
        this.resources.oxygen >= this.targets.oxygen &&
        this.resources.water >= this.targets.water &&
        this.resources.shield >= this.targets.shield
      ) {
        this.triggerWin();
      }
    } else {
      // Obstacle collision!
      if (this.invulnerableTimer > 0) return; // currently invulnerable

      let dodged = false;
      if (item.type === 'low' && this.isJumping && this.jumpY > 20) {
        dodged = true; // successfully jumped over!
      } else if (item.type === 'high' && this.isSliding) {
        dodged = true; // successfully slided under!
      }

      if (!dodged) {
        item.hit = true;
        this.screenShake = 12;
        this.invulnerableTimer = 1.0;
        if (window.soundSystem) {
          window.soundSystem.playCollision();
        }

        // Small time penalty for hitting asteroid/barrier
        this.timeLeft = Math.max(1, this.timeLeft - 4);
        this.addFloatingText('-4s CRASH!', '#ff2a5f');
        this.updateHUD();
      }
    }
  }

  addFloatingText(text, color) {
    const pX = this.getScreenCoords(this.laneX, 10).x;
    const pY = this.getScreenCoords(this.laneX, 10).y - 60;
    this.floatingTexts.push({
      text: text,
      x: pX,
      y: pY,
      color: color,
      life: 1.0
    });
  }

  createCollectSparks(lane, color) {
    const coords = this.getScreenCoords(lane, 12);
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 5;
      this.particles.push({
        x: coords.x,
        y: coords.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: color,
        size: 3 + Math.random() * 3,
        life: 1.0
      });
    }
  }

  // Perspective Projection helper
  getScreenCoords(lane, z) {
    // Horizon center
    const hx = this.width / 2;
    const hy = this.height * 0.32;

    // Perspective depth t: 0 (horizon) to 1 (screen bottom)
    const t = Math.max(0, Math.min(1, 1 - (z / 100)));
    const scale = 0.15 + t * 0.85;

    // Track spread width
    const trackWidth = this.width * 0.75 * scale;
    const laneWidth = trackWidth / 3;

    const screenX = hx + (lane - 1) * laneWidth;
    const screenY = hy + t * (this.height * 0.65);

    return { x: screenX, y: screenY, scale: scale, laneWidth: laneWidth };
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Space & Starry Horizon
    this.drawSpaceEnvironment(ctx, w, h);

    // 2. Draw 3-Lane Floating Cyber Runway
    this.drawRunway(ctx, w, h);

    // 3. Draw Track Items (Obstacles & Collectibles sorted from horizon to front)
    this.trackItems.sort((a, b) => b.z - a.z);
    this.trackItems.forEach((item) => this.drawTrackItem(ctx, item));

    // 4. Draw Cartoon Astronaut Player
    this.drawAstronaut(ctx);

    // 5. Draw Particles & Sparkles
    this.drawParticles(ctx);

    // 6. Draw Floating Score Text
    this.drawFloatingTexts(ctx);

    ctx.restore();
  }

  drawSpaceEnvironment(ctx, w, h) {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    skyGrad.addColorStop(0, '#040714');
    skyGrad.addColorStop(1, '#0c1533');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.4);

    // Glowing Moon / Planet on horizon
    const mx = w * 0.25;
    const my = h * 0.18;
    ctx.beginPath();
    ctx.arc(mx, my, 45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffeedd';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Distant futuristic orbital station silhouette
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(w * 0.65, h * 0.15, 60, 6);
    ctx.fillRect(w * 0.68, h * 0.12, 6, 20);
    ctx.beginPath();
    ctx.arc(w * 0.68 + 3, h * 0.15 + 3, 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawRunway(ctx, w, h) {
    const hy = h * 0.32;
    const hx = w / 2;

    // Horizon line
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hy);
    ctx.lineTo(w, hy);
    ctx.stroke();

    // Runway polygon (wide bottom trapezoid)
    const bW = w * 0.85;
    const tW = w * 0.12;

    ctx.beginPath();
    ctx.moveTo(hx - tW, hy);
    ctx.lineTo(hx + tW, hy);
    ctx.lineTo(hx + bW / 2, h);
    ctx.lineTo(hx - bW / 2, h);
    ctx.closePath();

    const runGrad = ctx.createLinearGradient(0, hy, 0, h);
    runGrad.addColorStop(0, '#0a1026');
    runGrad.addColorStop(1, '#111e47');
    ctx.fillStyle = runGrad;
    ctx.fill();

    // Outer neon glowing borders
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 3 Lanes Dividers (2 dashed inner lines radiating from horizon)
    const lanes = [-0.5, 0.5];
    ctx.setLineDash([18, 14]);
    ctx.lineDashOffset = -this.distance % 32;
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
    ctx.lineWidth = 2.5;

    lanes.forEach((pos) => {
      ctx.beginPath();
      ctx.moveTo(hx + pos * (tW * 0.65), hy);
      ctx.lineTo(hx + pos * (bW * 0.33), h);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Moving horizontal grid lines (for forward speed sensation)
    const gridCount = 9;
    for (let i = 0; i < gridCount; i++) {
      const offset = ((this.distance * 1.5 + i * 20) % 100) / 100;
      const gy = hy + Math.pow(offset, 1.8) * (h - hy);
      const gw = tW + offset * (bW / 2 - tW);

      ctx.beginPath();
      ctx.moveTo(hx - gw, gy);
      ctx.lineTo(hx + gw, gy);
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + offset * 0.3})`;
      ctx.lineWidth = 1 + offset * 2;
      ctx.stroke();
    }
  }

  drawTrackItem(ctx, item) {
    const coords = this.getScreenCoords(item.lane, item.z);
    const x = coords.x;
    const y = coords.y;
    const s = coords.scale;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);

    if (item.isCollectible) {
      // Floating hover bobbing
      const bob = Math.sin(this.distance * 0.15 + item.id * 10) * 8;
      ctx.translate(0, -35 + bob);

      if (item.type === 'oxygen') {
        // Oxygen Tank: Blue glowing capsule with O2 badge
        ctx.fillStyle = '#00b4d8';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        this.drawRoundedRect(ctx, -14, -22, 28, 44, 12);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Cap & handle
        ctx.fillStyle = '#caf0f8';
        ctx.fillRect(-6, -28, 12, 6);

        // O2 label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('O₂', 0, 4);

      } else if (item.type === 'water') {
        // Water / Ice Crystal: Sparkling aqua faceted diamond
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(18, 0);
        ctx.lineTo(0, 25);
        ctx.lineTo(-18, 0);
        ctx.closePath();
        ctx.fillStyle = '#48cae4';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Water drop icon in center
        ctx.beginPath();
        ctx.arc(0, 2, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

      } else if (item.type === 'shield') {
        // Radiation Shielding: Golden Hexagonal Power Core
        ctx.shadowColor = '#ffb703';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const hx = Math.cos(a) * 22;
          const hy = Math.sin(a) * 22;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffb703';
        ctx.fill();
        ctx.strokeStyle = '#fff3b0';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Radiation icon
        ctx.fillStyle = '#030816';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }

    } else {
      // Large High-Visibility Obstacle
      if (item.type === 'low') {
        // Massive Laser Barrier (MUST JUMP)
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 18;

        // Large Industrial Pylons
        ctx.fillStyle = '#334155';
        ctx.fillRect(-52, -36, 16, 36);
        ctx.fillRect(36, -36, 16, 36);
        ctx.strokeStyle = '#ff2a5f';
        ctx.lineWidth = 3;
        ctx.strokeRect(-52, -36, 16, 36);
        ctx.strokeRect(36, -36, 16, 36);

        // Pylon warning beacons
        ctx.fillStyle = '#ff2a5f';
        ctx.beginPath();
        ctx.arc(-44, -38, 5, 0, Math.PI * 2);
        ctx.arc(44, -38, 5, 0, Math.PI * 2);
        ctx.fill();

        // Thick High-Voltage Red Laser Beams
        ctx.strokeStyle = '#ff2a5f';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-42, -26);
        ctx.lineTo(42, -26);
        ctx.moveTo(-42, -12);
        ctx.lineTo(42, -12);
        ctx.stroke();

        // White core of laser
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-42, -26);
        ctx.lineTo(42, -26);
        ctx.moveTo(-42, -12);
        ctx.lineTo(42, -12);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // High-contrast Jump Sign Banner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(-44, -58, 88, 18);
        ctx.strokeStyle = '#ffc837';
        ctx.lineWidth = 2;
        ctx.strokeRect(-44, -58, 88, 18);

        ctx.fillStyle = '#ffc837';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲ JUMP OVER ▲', 0, -45);

      } else if (item.type === 'high') {
        // Massive Suspended Overhead Gantry (MUST SLIDE)
        ctx.shadowColor = '#ffb703';
        ctx.shadowBlur = 20;

        // Large Gantry Truss
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-62, -108, 124, 34);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(-62, -108, 124, 34);
        ctx.shadowBlur = 0;

        // Neon Yellow Hazard Chevrons across gantry
        ctx.fillStyle = '#ffb703';
        for (let c = -54; c <= 44; c += 18) {
          ctx.beginPath();
          ctx.moveTo(c, -106);
          ctx.lineTo(c + 10, -106);
          ctx.lineTo(c + 4, -76);
          ctx.lineTo(c - 6, -76);
          ctx.closePath();
          ctx.fill();
        }

        // Hanging downward lasers
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-45, -74);
        ctx.lineTo(-45, -55);
        ctx.moveTo(45, -74);
        ctx.lineTo(45, -55);
        ctx.stroke();

        // High-contrast Slide Sign Banner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(-48, -130, 96, 18);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.strokeRect(-48, -130, 96, 18);

        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼ SLIDE UNDER ▼', 0, -117);

      } else {
        // Massive Giant Space Asteroid Barricade (MUST DODGE)
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 22;

        // Big outer rock
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(0, -42, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff2a5f';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Crater textures
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(-14, -50, 12, 0, Math.PI * 2);
        ctx.arc(16, -34, 14, 0, Math.PI * 2);
        ctx.arc(-4, -22, 9, 0, Math.PI * 2);
        ctx.fill();

        // Flashing Warning Strobe on top
        const strobe = Math.floor(Date.now() / 150) % 2 === 0;
        ctx.fillStyle = strobe ? '#ff2a5f' : '#ffc837';
        ctx.beginPath();
        ctx.arc(0, -90, 7, 0, Math.PI * 2);
        ctx.fill();

        // High-contrast Dodge Banner
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(-45, -112, 90, 18);
        ctx.strokeStyle = '#ff2a5f';
        ctx.lineWidth = 2;
        ctx.strokeRect(-45, -112, 90, 18);

        ctx.fillStyle = '#ff2a5f';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('◀ CHANGE LANE ▶', 0, -99);
      }
    }

    ctx.restore();
  }

  drawAstronaut(ctx) {
    const coords = this.getScreenCoords(this.laneX, 10);
    const x = coords.x;
    let y = coords.y - this.jumpY;

    ctx.save();
    ctx.translate(x, y);

    // Invulnerability blink
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shadow on ground
    ctx.save();
    ctx.beginPath();
    const shadowScale = Math.max(0.3, 1 - (this.jumpY / 120));
    ctx.ellipse(0, 0, 22 * shadowScale, 8 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();
    ctx.restore();

    if (this.isSliding) {
      // Sliding posture (ducking horizontally)
      this.drawSlidingAstronaut(ctx);
    } else {
      // Normal running or jumping posture
      this.drawRunningAstronaut(ctx);
    }

    ctx.restore();
  }

  drawRunningAstronaut(ctx) {
    const legPhase = Math.sin(this.runAnimPhase);
    const armPhase = Math.cos(this.runAnimPhase);

    // Jetpack thrusters fire blue flames behind back
    ctx.save();
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    const flameH = 10 + Math.random() * 8;
    ctx.fillRect(-12, -28, 5, flameH);
    ctx.fillRect(7, -28, 5, flameH);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Backpack
    ctx.fillStyle = '#64748b';
    this.drawRoundedRect(ctx, -14, -54, 28, 30, 6);
    ctx.fill();

    // Legs
    const leftLegY = this.isJumping ? 6 : legPhase * 12;
    const rightLegY = this.isJumping ? 6 : -legPhase * 12;

    ctx.fillStyle = '#e2e8f0';
    // Left Leg & Boot
    ctx.fillRect(-11, -24, 7, 18 + leftLegY);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-13, -8 + leftLegY, 11, 8);

    // Right Leg & Boot
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(4, -24, 7, 18 + rightLegY);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(2, -8 + rightLegY, 11, 8);

    // Torso (Space Suit)
    ctx.fillStyle = '#f8fafc';
    this.drawRoundedRect(ctx, -13, -56, 26, 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chest badge / NASA insignia
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(0, -42, 6, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-18, -50 + armPhase * 6, 6, 18);
    ctx.fillRect(12, -50 - armPhase * 6, 6, 18);

    // Helmet
    ctx.beginPath();
    ctx.arc(0, -68, 17, 0, Math.PI * 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    const profile = window.playerProfile || { avatarId: 'cat', color: '#ff70a6' };
    ctx.strokeStyle = profile.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Cute Avatar Ears based on chosen character
    if (profile.avatarId === 'cat') {
      ctx.fillStyle = profile.color;
      ctx.beginPath();
      ctx.moveTo(-13, -79);
      ctx.lineTo(-7, -91);
      ctx.lineTo(-1, -82);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -79);
      ctx.lineTo(7, -91);
      ctx.lineTo(1, -82);
      ctx.fill();
    } else if (profile.avatarId === 'bear') {
      ctx.fillStyle = profile.color;
      ctx.beginPath();
      ctx.arc(-13, -82, 6, 0, Math.PI * 2);
      ctx.arc(13, -82, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (profile.avatarId === 'bunny') {
      ctx.fillStyle = profile.color;
      ctx.beginPath();
      ctx.ellipse(-8, -90, 5, 13, -0.12, 0, Math.PI * 2);
      ctx.ellipse(8, -90, 5, 13, 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (profile.avatarId === 'fox') {
      ctx.fillStyle = profile.color;
      ctx.beginPath();
      ctx.moveTo(-14, -79);
      ctx.lineTo(-8, -92);
      ctx.lineTo(-2, -82);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -79);
      ctx.lineTo(8, -92);
      ctx.lineTo(2, -82);
      ctx.fill();
    }

    // Visor (Shiny gold-cyan reflective mirror glass)
    ctx.beginPath();
    ctx.ellipse(0, -68, 12, 9, 0, 0, Math.PI * 2);
    const visorGrad = ctx.createLinearGradient(-10, -75, 10, -60);
    visorGrad.addColorStop(0, '#00f0ff');
    visorGrad.addColorStop(0.5, '#0284c7');
    visorGrad.addColorStop(1, '#ffc837');
    ctx.fillStyle = visorGrad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Visor reflection glint
    ctx.beginPath();
    ctx.arc(-4, -71, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  drawSlidingAstronaut(ctx) {
    // Jetpack sparks on the floor
    ctx.save();
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillRect(-25, -12, 12, 6);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Sliding body horizontal capsule
    ctx.fillStyle = '#f8fafc';
    this.drawRoundedRect(ctx, -26, -18, 52, 16, 8);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Helmet at front
    ctx.beginPath();
    ctx.arc(20, -10, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();

    // Visor
    ctx.beginPath();
    ctx.ellipse(24, -10, 8, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.fill();
  }

  drawParticles(ctx) {
    for (let p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  drawFloatingTexts(ctx) {
    ctx.save();
    for (let ft of this.floatingTexts) {
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

window.Task2SpaceRunner = Task2SpaceRunner;
