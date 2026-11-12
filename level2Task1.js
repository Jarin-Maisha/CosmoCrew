/**
 * Space Survival Level 2 - Task 1: Fix Air Leak
 * Features dynamic hull breaches, particle-based escaping air vapor, click-to-repair
 * mechanics, animated sealing patches, pressure drain simulation, and warning alarms.
 */

class Task1AirLeak {
  constructor(canvasId, callbacks) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.callbacks = callbacks || {}; // onWin, onLose, onUpdateHUD

    this.active = false;
    this.paused = false;
    this.animationFrame = null;

    // Game state
    this.pressure = 100.0;
    this.timeLeft = 75;
    this.totalLeaks = 6;
    this.leaks = [];
    this.particles = [];
    this.repairEffects = [];
    this.lastTime = 0;
    this.timerInterval = null;

    // Viewport & Scale
    this.width = 0;
    this.height = 0;

    // Controllable Astronaut Player
    this.astronaut = {
      x: 300,
      y: 300,
      vx: 0,
      vy: 0,
      speed: 340,
      facing: 1,
      targetAngle: 0,
      currentAngle: 0
    };

    // Keyboard state
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false
    };

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    if (!this.canvas) return;
    this.canvas.style.cursor = 'crosshair';
    this.canvas.style.touchAction = 'none';

    const handlePointer = (e) => {
      if (!this.active || this.paused) return;
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : (e.changedTouches ? e.changedTouches[0].clientX : e.clientX);
      const clientY = e.touches ? e.touches[0].clientY : (e.changedTouches ? e.changedTouches[0].clientY : e.clientY);

      // EXACT CSS Pixel coordinates matching canvas scaling
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Fly astronaut toward click location
      this.astronaut.x = x;
      this.astronaut.y = y;

      this.handleClick(x, y);
    };

    // Pointer events support mouse, pen, and touch with one consistent path.
    this.canvas.addEventListener('pointerdown', handlePointer);
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // avoid firing a second repair after right-click
    });
  }

  handleKeyDown(e) {
    if (!this.active || this.paused) return;
    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';

    if (key === 'arrowleft' || key === 'a' || code === 'KeyA' || code === 'ArrowLeft') {
      e.preventDefault();
      this.keys.left = true;
    } else if (key === 'arrowright' || key === 'd' || code === 'KeyD' || code === 'ArrowRight') {
      e.preventDefault();
      this.keys.right = true;
    } else if (key === 'arrowup' || key === 'w' || code === 'KeyW' || code === 'ArrowUp') {
      e.preventDefault();
      this.keys.up = true;
    } else if (key === 'arrowdown' || key === 's' || code === 'KeyS' || code === 'ArrowDown') {
      e.preventDefault();
      this.keys.down = true;
    } else if (key === ' ' || key === 'e' || key === 'enter' || code === 'Space' || code === 'KeyE') {
      e.preventDefault();
      this.sealNearestLeak();
    }
  }

  handleKeyUp(e) {
    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';

    if (key === 'arrowleft' || key === 'a' || code === 'KeyA' || code === 'ArrowLeft') {
      this.keys.left = false;
    } else if (key === 'arrowright' || key === 'd' || code === 'KeyD' || code === 'ArrowRight') {
      this.keys.right = false;
    } else if (key === 'arrowup' || key === 'w' || code === 'KeyW' || code === 'ArrowUp') {
      this.keys.up = false;
    } else if (key === 'arrowdown' || key === 's' || code === 'KeyS' || code === 'ArrowDown') {
      this.keys.down = false;
    }
  }

  sealNearestLeak() {
    let nearest = null;
    let minDist = 110; // welding range
    for (let leak of this.leaks) {
      if (leak.sealed) continue;
      const d = Math.hypot(leak.x - this.astronaut.x, leak.y - this.astronaut.y);
      if (d < minDist) {
        minDist = d;
        nearest = leak;
      }
    }

    if (nearest) {
      this.handleClick(nearest.x, nearest.y);
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
    this.pressure = 100.0;
    this.timeLeft = 75;
    this.particles = [];
    this.repairEffects = [];

    // Create 6 well-distributed leaks across the spaceship cockpit & window
    this.initLeaks();

    // Sound
    if (window.soundSystem) {
      window.soundSystem.playMusic('emergency');
      window.soundSystem.playAirLeakHiss(1.0);
    }

    // Timer countdown
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.active || this.paused) return;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerGameOver('Time ran out! Spacecraft cabin de-pressurized.');
      }
      this.updateHUD();
    }, 1000);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Cadet';
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Emergency, ${playerName}! Micro-meteoroids punctured the window! Click on cracks or fly near them to weld and seal before air runs out!`,
        'worried'
      );
    }

    this.lastTime = performance.now();
    this.loop();
    this.updateHUD();
  }

  initLeaks() {
    this.leaks = [];
    const minPadding = 80;
    const availableW = Math.max(300, this.width - minPadding * 2);
    const availableH = Math.max(200, this.height - 180);

    // Predefined relative positions across cockpit structure
    const relativePos = [
      { rx: 0.22, ry: 0.32, angle: -0.6 },
      { rx: 0.78, ry: 0.28, angle: 0.8 },
      { rx: 0.50, ry: 0.22, angle: -1.2 },
      { rx: 0.32, ry: 0.65, angle: 0.4 },
      { rx: 0.70, ry: 0.72, angle: -0.3 },
      { rx: 0.52, ry: 0.52, angle: 1.5 }
    ];

    for (let i = 0; i < this.totalLeaks; i++) {
      const p = relativePos[i % relativePos.length];
      const x = minPadding + p.rx * availableW;
      const y = 90 + p.ry * availableH;

      this.leaks.push({
        id: i,
        x: x,
        y: y,
        radius: 48, // Generous hit area
        crackAngle: p.angle,
        sealed: false,
        sealProgress: 0,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  handleClick(x, y) {
    let hit = false;
    for (let leak of this.leaks) {
      if (leak.sealed) continue;
      const dist = Math.hypot(leak.x - x, leak.y - y);
      if (dist <= leak.radius + 35) {
        // Successfully clicked leak
        leak.sealed = true;
        hit = true;

        if (window.soundSystem) {
          window.soundSystem.playRepair();
        }

        // Spawn repair effect & welding spark burst
        this.createRepairEffect(leak.x, leak.y);

        // Check win condition
        const remaining = this.getRemainingLeaks();
        if (remaining === 0) {
          this.triggerWin();
        } else {
          // Adjust sound hiss intensity according to remaining leaks
          if (window.soundSystem) {
            window.soundSystem.playAirLeakHiss(remaining / this.totalLeaks);
          }
        }
        break;
      }
    }
    this.updateHUD();
  }

  createRepairEffect(x, y) {
    // Spark particles
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.repairEffects.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: Math.random() > 0.4 ? '#00f0ff' : '#ffc837',
        size: 2 + Math.random() * 3
      });
    }
  }

  getRemainingLeaks() {
    return this.leaks.filter(l => !l.sealed).length;
  }

  updateHUD() {
    const remaining = this.getRemainingLeaks();
    if (this.callbacks.onUpdateHUD) {
      this.callbacks.onUpdateHUD({
        pressure: Math.round(this.pressure),
        timeLeft: this.timeLeft,
        leaksRemaining: remaining,
        totalLeaks: this.totalLeaks
      });
    }
  }

  triggerWin() {
    this.stopAudio();
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Cadet';
    if (window.soundSystem) window.soundSystem.playVictory();
    if (window.showConfetti) window.showConfetti();
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Awesome reflexes, ${playerName}! All 6 breaches sealed airtight! Cabin pressure stabilized!`,
        'celebrate'
      );
    }

    setTimeout(() => {
      if (this.callbacks.onWin) {
        this.callbacks.onWin({
          pressureRemaining: Math.round(this.pressure),
          timeTaken: 75 - this.timeLeft
        });
      }
    }, 1200);
  }

  triggerGameOver(reason) {
    this.stopAudio();
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (this.callbacks.onLose) {
      this.callbacks.onLose({
        reason: reason || 'Spacecraft air pressure depleted!',
        taskName: 'Task 1: Fix Air Leak'
      });
    }
  }

  stopAudio() {
    if (window.soundSystem) {
      window.soundSystem.stopAirLeakHiss();
      window.soundSystem.stopMusic();
    }
  }

  stop() {
    this.active = false;
    this.stopAudio();
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }

  pause() {
    this.paused = true;
    if (window.soundSystem) {
      window.soundSystem.stopAirLeakHiss();
    }
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
    const remaining = this.getRemainingLeaks();
    if (remaining > 0 && window.soundSystem) {
      window.soundSystem.playAirLeakHiss(remaining / this.totalLeaks);
    }
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
    const unsealedCount = this.getRemainingLeaks();

    // Pressure depletes based on active leaks (gentler drain)
    if (unsealedCount > 0) {
      const drainRate = 0.55 * unsealedCount; // e.g. 6 leaks = 3.3%/s
      this.pressure -= drainRate * dt;
      if (this.pressure <= 0) {
        this.pressure = 0;
        this.updateHUD();
        this.triggerGameOver('Cabin air pressure reached 0%! Spacecraft depressurized.');
        return;
      }
    }

    // Spawn air vapor particles from active leaks
    this.leaks.forEach((leak) => {
      leak.pulsePhase += dt * 4;
      if (!leak.sealed) {
        // Spawn 3-5 air particles per frame per leak
        for (let i = 0; i < 4; i++) {
          const spread = (Math.random() - 0.5) * 0.8;
          const angle = leak.crackAngle + spread;
          const speed = 4 + Math.random() * 8;
          this.particles.push({
            x: leak.x,
            y: leak.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4,
            alpha: 0.85,
            decay: 0.02 + Math.random() * 0.03,
            color: Math.random() > 0.3 ? 'rgba(200, 245, 255,' : 'rgba(0, 240, 255,'
          });
        }
      } else {
        if (leak.sealProgress < 1) {
          leak.sealProgress = Math.min(1, leak.sealProgress + dt * 4);
        }
      }
    });

    // Update air particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.size += dt * 3;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update astronaut position with keyboard input
    let moveX = 0;
    let moveY = 0;
    if (this.keys.left) moveX -= 1;
    if (this.keys.right) moveX += 1;
    if (this.keys.up) moveY -= 1;
    if (this.keys.down) moveY += 1;

    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    if (moveX !== 0 || moveY !== 0) {
      this.astronaut.x += moveX * this.astronaut.speed * dt;
      this.astronaut.y += moveY * this.astronaut.speed * dt;
      if (moveX !== 0) this.astronaut.facing = moveX > 0 ? 1 : -1;

      // Spawn jetpack thruster particles behind astronaut
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: this.astronaut.x - this.astronaut.facing * 16,
          y: this.astronaut.y + (Math.random() - 0.5) * 8,
          vx: -moveX * 3 + (Math.random() - 0.5) * 2,
          vy: -moveY * 3 + (Math.random() - 0.5) * 2,
          size: 2 + Math.random() * 3,
          alpha: 0.8,
          decay: 0.04,
          color: 'rgba(0, 240, 255,'
        });
      }
    }

    // Keep astronaut within screen bounds
    const pad = 40;
    this.astronaut.x = Math.max(pad, Math.min(this.width - pad, this.astronaut.x));
    this.astronaut.y = Math.max(70, Math.min(this.height - 70, this.astronaut.y));

    // Update repair spark effects
    for (let i = this.repairEffects.length - 1; i >= 0; i--) {
      const sp = this.repairEffects[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 2.5 * dt; // slight gravity for sparks
      sp.life -= dt * 2.2;
      if (sp.life <= 0) {
        this.repairEffects.splice(i, 1);
      }
    }

    this.updateHUD();
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw Spaceship Cockpit Viewport & Space Background
    this.drawCockpitBackground(ctx, w, h);

    // 2. Draw Escaping Air Vapor Particles
    this.drawParticles(ctx);

    // 3. Draw Hull Cracks, Leaks & Sealing Patches
    this.drawLeaks(ctx);

    // 4. Draw Astronaut Player Character
    this.drawAstronaut(ctx);

    // 5. Draw Repair Spark Particles
    this.drawRepairSparks(ctx);

    // 6. Draw Cockpit Frame & Crossbeams (Foreground Overlay)
    this.drawCockpitFrame(ctx, w, h);

    // 7. Draw Controls reminder on canvas
    this.drawControlsHint(ctx, w, h);
  }

  drawControlsHint(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(11, 18, 38, 0.75)';
    ctx.fillRect(w / 2 - 190, h - 35, 380, 24);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.strokeRect(w / 2 - 190, h - 35, 380, 24);

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.textAlign = 'center';
    ctx.fillText('MOVE: [W A S D / ◀ ▶ ▲ ▼] • SEAL: [SPACE / E / CLICK]', w / 2, h - 19);
    ctx.restore();
  }

  drawAstronaut(ctx) {
    const a = this.astronaut;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(a.facing, 1);

    // Jetpack flames
    if (this.keys.left || this.keys.right || this.keys.up || this.keys.down) {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(-22, -6, 10, 12);
      ctx.shadowBlur = 0;
    }

    // Backpack
    ctx.fillStyle = '#475569';
    ctx.fillRect(-18, -16, 8, 26);

    // Body
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-10, -16, 20, 28);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -16, 20, 28);

    // Helmet
    ctx.beginPath();
    ctx.arc(0, -24, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Visor
    ctx.beginPath();
    ctx.ellipse(4, -24, 8, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Laser welding torch in hand
    ctx.strokeStyle = '#ffc837';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(18, 6);
    ctx.stroke();

    ctx.restore();
  }

  drawCockpitBackground(ctx, w, h) {
    // Deep cosmic space through panoramic window
    const grad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, '#0d1838');
    grad.addColorStop(0.5, '#070d22');
    grad.addColorStop(1, '#02050e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Distant Blue Gas Giant Planet
    ctx.save();
    ctx.beginPath();
    const planetX = w * 0.75;
    const planetY = h * 0.35;
    const planetR = Math.min(w, h) * 0.22;
    ctx.arc(planetX, planetY, planetR, 0, Math.PI * 2);
    const planetGrad = ctx.createLinearGradient(planetX - planetR, planetY - planetR, planetX + planetR, planetY + planetR);
    planetGrad.addColorStop(0, '#00b4d8');
    planetGrad.addColorStop(0.5, '#03045e');
    planetGrad.addColorStop(1, '#000814');
    ctx.fillStyle = planetGrad;
    ctx.fill();

    // Planet atmosphere glow
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Planet ring
    ctx.beginPath();
    ctx.ellipse(planetX, planetY, planetR * 1.6, planetR * 0.4, -0.35, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 200, 100, 0.4)';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();
  }

  drawCockpitFrame(ctx, w, h) {
    ctx.save();

    // Top cockpit beam
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 35);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, 35);

    // Bottom instrument console shelf
    const consoleH = 65;
    const consoleGrad = ctx.createLinearGradient(0, h - consoleH, 0, h);
    consoleGrad.addColorStop(0, '#111a33');
    consoleGrad.addColorStop(1, '#080d1d');
    ctx.fillStyle = consoleGrad;
    ctx.fillRect(0, h - consoleH, w, consoleH);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - consoleH);
    ctx.lineTo(w, h - consoleH);
    ctx.stroke();

    // Console dials & flashing indicators
    const dialCount = Math.floor(w / 110);
    for (let i = 0; i < dialCount; i++) {
      const dx = 50 + i * 110;
      const dy = h - 32;

      // Small screen
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(dx - 35, dy - 18, 70, 36);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.strokeRect(dx - 35, dy - 18, 70, 36);

      // Blinking status LED
      const ledColor = (Math.floor(Date.now() / 400) + i) % 3 === 0 ? '#ff2a5f' : '#00ff88';
      ctx.beginPath();
      ctx.arc(dx + 24, dy - 8, 3, 0, Math.PI * 2);
      ctx.fillStyle = ledColor;
      ctx.fill();

      // Tiny waveform lines
      ctx.beginPath();
      ctx.moveTo(dx - 30, dy + 6);
      ctx.lineTo(dx - 15, dy - 2);
      ctx.lineTo(dx, dy + 8);
      ctx.lineTo(dx + 15, dy - 6);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Panoramic window pillars (structural angled struts)
    ctx.fillStyle = '#0b1224';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 3;

    // Left strut
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.12, 0);
    ctx.lineTo(w * 0.05, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right strut
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w * 0.88, 0);
    ctx.lineTo(w * 0.95, h);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    for (let p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
      ctx.fill();
    }
    ctx.restore();
  }

  drawLeaks(ctx) {
    ctx.save();
    this.leaks.forEach((leak) => {
      if (!leak.sealed) {
        // Active Leak Warning Ring (Pulsating)
        const pulse = 1 + Math.sin(leak.pulsePhase) * 0.25;
        ctx.beginPath();
        ctx.arc(leak.x, leak.y, leak.radius * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 42, 95, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target crosshair
        ctx.beginPath();
        ctx.moveTo(leak.x - leak.radius - 8, leak.y);
        ctx.lineTo(leak.x + leak.radius + 8, leak.y);
        ctx.moveTo(leak.x, leak.y - leak.radius - 8);
        ctx.lineTo(leak.x, leak.y + leak.radius + 8);
        ctx.strokeStyle = 'rgba(255, 42, 95, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Jagged Hull Crack
        ctx.beginPath();
        ctx.moveTo(leak.x - 22, leak.y + 8);
        ctx.lineTo(leak.x - 8, leak.y - 12);
        ctx.lineTo(leak.x + 4, leak.y + 6);
        ctx.lineTo(leak.x + 20, leak.y - 14);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Glowing core of the breach
        ctx.beginPath();
        ctx.arc(leak.x, leak.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ff2a5f';
        ctx.shadowColor = '#ff2a5f';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;

        // "CLICK TO SEAL" prompt badge
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#ffc837';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK TO SEAL', leak.x, leak.y + leak.radius + 20);

      } else {
        // Sealed Breach: High-Tech Hexagonal Nano-Composite Patch
        const pScale = leak.sealProgress;
        ctx.save();
        ctx.translate(leak.x, leak.y);
        ctx.scale(pScale, pScale);

        // Hexagon patch background
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          const hx = Math.cos(a) * 28;
          const hy = Math.sin(a) * 28;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Rivets & carbon weave lines
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        ctx.fill();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Green Checkmark icon
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-1, 4);
        ctx.lineTo(6, -4);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.restore();
      }
    });
    ctx.restore();
  }

  drawRepairSparks(ctx) {
    ctx.save();
    for (let sp of this.repairEffects) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fillStyle = sp.color;
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.restore();
  }
}

window.Task1AirLeak = Task1AirLeak;
