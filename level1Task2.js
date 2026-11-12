/**
 * CosmoCrew - Level 1, Task 2: Lunar Crop Production
 * Player controls their chosen avatar to plant seeds, water crops, watch them grow,
 * and harvest delicious cosmic food for the space colony.
 */

class Task2LunarCrops {
  constructor(canvasId, callbacks) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.callbacks = callbacks || {};

    this.active = false;
    this.paused = false;
    this.animationFrame = null;
    this.lastTime = 0;
    this.timerInterval = null;

    this.width = 0;
    this.height = 0;
    this.timeLeft = 90;

    // Phases: 'plant', 'water', 'grow', 'harvest', 'complete'
    this.phase = 'plant';
    this.growTimer = 0;
    this.growDuration = 3.5; // seconds to grow

    // Avatar state
    this.avatar = {
      x: 100,
      y: 250,
      vx: 0,
      vy: 0,
      speed: 260,
      facing: 1,
      walkPhase: 0
    };

    // Keyboard inputs
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      action: false
    };

    // 4 Fertile Crop Beds
    this.beds = [];
    this.particles = [];
    this.floatingTexts = [];

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    // On-screen touch/mouse action button
    const actionBtn = document.getElementById('l1t2ActionBtn');
    if (actionBtn) {
      actionBtn.onclick = () => {
        if (!this.active || this.paused) return;
        this.performAction();
      };
    }
  }

  handleKeyDown(e) {
    if (!this.active || this.paused) return;
    const key = (e.key || '').toLowerCase();
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
      this.performAction();
    }
  }

  handleKeyUp(e) {
    const key = (e.key || '').toLowerCase();
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

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.width = parent.clientWidth || 800;
    this.height = Math.max(460, parent.clientHeight || 500);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }
  }

  initBeds() {
    this.beds = [];
    const bedW = 140;
    const bedH = 95;

    // Arrange 4 farm beds evenly in 2x2 grid inside greenhouse
    const centerX = this.width / 2;
    const centerY = this.height / 2 + 10;
    const offsetX = Math.min(180, this.width * 0.22);
    const offsetY = Math.min(105, this.height * 0.22);

    const positions = [
      { x: centerX - offsetX - bedW / 2, y: centerY - offsetY - bedH / 2, cropName: 'Star Fruit' },
      { x: centerX + offsetX - bedW / 2, y: centerY - offsetY - bedH / 2, cropName: 'Cosmic Melon' },
      { x: centerX - offsetX - bedW / 2, y: centerY + offsetY - bedH / 2, cropName: 'Space Berries' },
      { x: centerX + offsetX - bedW / 2, y: centerY + offsetY - bedH / 2, cropName: 'Solar Carrot' }
    ];

    positions.forEach((p, idx) => {
      this.beds.push({
        id: idx,
        x: p.x,
        y: p.y,
        w: bedW,
        h: bedH,
        cropName: p.cropName,
        status: 'empty', // 'empty' -> 'planted' -> 'watered' -> 'ripe' -> 'harvested'
        growProgress: 0,
        sparkleTimer: Math.random() * Math.PI
      });
    });
  }

  start() {
    this.resize();
    this.active = true;
    this.paused = false;
    this.timeLeft = 90;
    this.phase = 'plant';
    this.growTimer = 0;
    this.particles = [];
    this.floatingTexts = [];

    this.avatar.x = this.width * 0.15;
    this.avatar.y = this.height * 0.5;

    this.initBeds();

    if (window.soundSystem) {
      window.soundSystem.playMusic('playful');
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (!this.active || this.paused) return;
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.triggerGameOver('Time ran out before crops were harvested!');
      }
      this.updateHUD();
    }, 1000);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Gardener';
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Move with Arrow Keys or WASD, ${playerName}! Walk over each soil bed and press Spacebar to drop seeds!`,
        'normal'
      );
    }

    this.lastTime = performance.now();
    this.loop();
    this.updateHUD();
  }

  getNearestBed() {
    let nearest = null;
    let minDist = 110;
    const ax = this.avatar.x;
    const ay = this.avatar.y;

    for (let bed of this.beds) {
      const bx = bed.x + bed.w / 2;
      const by = bed.y + bed.h / 2;
      const dist = Math.hypot(bx - ax, by - ay);
      if (dist < minDist) {
        minDist = dist;
        nearest = bed;
      }
    }
    return nearest;
  }

  performAction() {
    const bed = this.getNearestBed();
    if (!bed) return;

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Gardener';

    if (this.phase === 'plant' && bed.status === 'empty') {
      bed.status = 'planted';
      if (window.soundSystem) window.soundSystem.playSeedPlant();
      this.createSeedParticles(bed.x + bed.w / 2, bed.y + bed.h / 2);
      this.addFloatingText('Seeds Planted! 🌱', bed.x + bed.w / 2, bed.y - 10, '#00f0ff');

      const planted = this.beds.filter(b => b.status === 'planted').length;
      if (planted === this.beds.length) {
        this.phase = 'water';
        if (window.soundSystem) window.soundSystem.playOxygenSafe();
        if (window.robotBuddy) {
          window.robotBuddy.say(
            `Terrific, ${playerName}! All seeds planted! Now walk to each bed and press Spacebar to water them!`,
            'happy'
          );
        }
      }
    } else if (this.phase === 'water' && bed.status === 'planted') {
      bed.status = 'watered';
      if (window.soundSystem) window.soundSystem.playWatering();
      this.createWaterParticles(bed.x + bed.w / 2, bed.y + bed.h / 2);
      this.addFloatingText('Watered! 💧', bed.x + bed.w / 2, bed.y - 10, '#48cae4');

      const watered = this.beds.filter(b => b.status === 'watered').length;
      if (watered === this.beds.length) {
        this.phase = 'grow';
        this.growTimer = 0;
        if (window.soundSystem) window.soundSystem.playPlantGrow();
        if (window.robotBuddy) {
          window.robotBuddy.say(
            `Look at that, ${playerName}! The cosmic seeds are absorbing lunar nutrients and sprouting!`,
            'excited'
          );
        }
      }
    } else if (this.phase === 'harvest' && bed.status === 'ripe') {
      bed.status = 'harvested';
      if (window.soundSystem) window.soundSystem.playCropHarvest();
      this.createHarvestParticles(bed.x + bed.w / 2, bed.y + bed.h / 2);
      this.addFloatingText(`+1 ${bed.cropName}! ✨`, bed.x + bed.w / 2, bed.y - 10, '#ffd166');

      const harvested = this.beds.filter(b => b.status === 'harvested').length;
      if (harvested === this.beds.length) {
        this.phase = 'complete';
        this.triggerWin();
      }
    }

    this.updateHUD();
  }

  createSeedParticles(x, y) {
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2.5 + Math.random() * 2,
        color: '#ffbe0b',
        life: 0.8
      });
    }
  }

  createWaterParticles(x, y) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 1,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#00f0ff' : '#caf0f8',
        life: 0.9
      });
    }
  }

  createHarvestParticles(x, y) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 6;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 2,
        size: 3 + Math.random() * 4,
        color: ['#ffd166', '#ff70a6', '#06d6a0', '#00f0ff'][Math.floor(Math.random() * 4)],
        life: 1.0
      });
    }
  }

  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      color: color || '#ffffff',
      life: 1.0
    });
  }

  loop() {
    if (!this.active) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (!this.paused) {
      this.update(dt);
      this.render();
    }

    this.animationFrame = requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    // Avatar movement
    let dx = 0;
    let dy = 0;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    if (dx !== 0) this.avatar.facing = dx > 0 ? 1 : -1;

    this.avatar.x += dx * this.avatar.speed * dt;
    this.avatar.y += dy * this.avatar.speed * dt;

    if (dx !== 0 || dy !== 0) {
      this.avatar.walkPhase += dt * 10;
    }

    // Screen bounds
    const pad = 40;
    this.avatar.x = Math.max(pad, Math.min(this.width - pad, this.avatar.x));
    this.avatar.y = Math.max(90, Math.min(this.height - 50, this.avatar.y));

    // Phase: GROWING
    if (this.phase === 'grow') {
      this.growTimer += dt;
      const p = Math.min(1.0, this.growTimer / this.growDuration);
      this.beds.forEach(bed => {
        bed.growProgress = p;
      });

      if (this.growTimer >= this.growDuration) {
        this.phase = 'harvest';
        this.beds.forEach(bed => {
          bed.status = 'ripe';
        });

        const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Gardener';
        if (window.soundSystem) window.soundSystem.playVictory();
        if (window.robotBuddy) {
          window.robotBuddy.say(
            `Hooray! The cosmic crops are ripe and shining! Press Spacebar near each bed to harvest them, ${playerName}!`,
            'celebrate'
          );
        }
        this.updateHUD();
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= dt * 1.5;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 35;
      ft.life -= dt * 1.2;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Bio-Dome Background (Stars, Earth in sky, greenhouse glass ribs)
    this.drawBioDomeBackground(ctx, w, h);

    // 2. Crop Beds (Soil, Plants, Fruit, Moisture)
    this.beds.forEach(bed => this.drawCropBed(ctx, bed));

    // 3. Avatar Player
    this.drawAvatar(ctx);

    // 4. Action Prompt over nearest bed
    this.drawActionPrompt(ctx);

    // 5. Particles & Floating Text
    this.drawEffects(ctx);
  }

  drawBioDomeBackground(ctx, w, h) {
    // Sky gradient through dome
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#060a20');
    sky.addColorStop(0.55, '#101b42');
    sky.addColorStop(1, '#1b2d60');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Distant Earth in sky
    ctx.save();
    const earthX = w * 0.82;
    const earthY = h * 0.22;
    const earthR = Math.min(w, h) * 0.14;
    const earthGrad = ctx.createRadialGradient(earthX - 10, earthY - 10, 5, earthX, earthY, earthR);
    earthGrad.addColorStop(0, '#00b4d8');
    earthGrad.addColorStop(0.6, '#0077b6');
    earthGrad.addColorStop(1, '#03045e');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.arc(earthX, earthY, earthR, 0, Math.PI * 2);
    ctx.fill();

    // Atmosphere halo
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Dome glass ribs (arches)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h + 100, Math.max(w, h) * 0.65, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w / 2, h + 100, Math.max(w, h) * 0.85, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Greenhouse floor
    const floorGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    floorGrad.addColorStop(0, 'rgba(20, 35, 60, 0.85)');
    floorGrad.addColorStop(1, 'rgba(10, 20, 40, 0.98)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // Pathway grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1.5;
    for (let x = 40; x < w; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.55);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCropBed(ctx, bed) {
    ctx.save();
    // Bed wooden / high-tech border
    ctx.fillStyle = bed.status === 'watered' || bed.status === 'ripe' ? '#2d1b10' : '#422a1d';
    this.drawRoundedRect(ctx, bed.x, bed.y, bed.w, bed.h, 12);
    ctx.fill();

    ctx.strokeStyle = bed.status === 'ripe' ? '#ffd166' : (bed.status === 'watered' ? '#00f0ff' : '#06d6a0');
    ctx.lineWidth = bed.status === 'ripe' ? 3.5 : 2.5;
    ctx.stroke();

    // Soil interior
    const soilX = bed.x + 8;
    const soilY = bed.y + 8;
    const soilW = bed.w - 16;
    const soilH = bed.h - 16;
    ctx.fillStyle = bed.status === 'watered' || bed.status === 'ripe' ? '#1c100a' : '#2b1910';
    this.drawRoundedRect(ctx, soilX, soilY, soilW, soilH, 8);
    ctx.fill();

    // Soil furrow lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const fy = soilY + (soilH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(soilX + 10, fy);
      ctx.lineTo(soilX + soilW - 10, fy);
      ctx.stroke();
    }

    // Bed content based on status
    const cx = bed.x + bed.w / 2;
    const cy = bed.y + bed.h / 2;

    if (bed.status === 'empty') {
      // Empty fertilised soil sparkles
      ctx.fillStyle = '#06d6a0';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FERTILE SOIL', cx, cy + 4);
    } else if (bed.status === 'planted') {
      // Seeds in soil
      ctx.fillStyle = '#ffd166';
      [-30, 0, 30].forEach(ox => {
        ctx.beginPath();
        ctx.arc(cx + ox, cy, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#caf0f8';
      ctx.textAlign = 'center';
      ctx.fillText('NEEDS WATER 💧', cx, cy + 22);
    } else if (bed.status === 'watered') {
      // Moisture sparkle droplets
      ctx.fillStyle = '#00f0ff';
      [-30, 0, 30].forEach(ox => {
        ctx.beginPath();
        ctx.arc(cx + ox, cy - 2, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#06d6a0';
      ctx.textAlign = 'center';
      ctx.fillText('SPROUTING... 🌱', cx, cy + 22);
    } else if (bed.status === 'ripe') {
      // Lush fully grown cosmic crops!
      this.drawRipeCrops(ctx, bed, cx, cy);
    } else if (bed.status === 'harvested') {
      // Cute empty basket marker
      ctx.fillStyle = '#06d6a0';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HARVESTED! ✓', cx, cy + 4);
    }

    // Growing animation interpolation
    if (this.phase === 'grow' && bed.growProgress > 0) {
      this.drawGrowingPlants(ctx, bed, cx, cy);
    }

    ctx.restore();
  }

  drawGrowingPlants(ctx, bed, cx, cy) {
    const p = bed.growProgress;
    ctx.save();
    [-32, 0, 32].forEach(ox => {
      const stemH = 28 * p;
      // Green stem
      ctx.strokeStyle = '#06d6a0';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + 12);
      ctx.lineTo(cx + ox, cy + 12 - stemH);
      ctx.stroke();

      // Leaves
      if (p > 0.3) {
        ctx.fillStyle = '#38b000';
        ctx.beginPath();
        ctx.ellipse(cx + ox - 8, cy + 12 - stemH * 0.6, 7 * p, 4 * p, -0.4, 0, Math.PI * 2);
        ctx.ellipse(cx + ox + 8, cy + 12 - stemH * 0.6, 7 * p, 4 * p, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Emerging fruit
      if (p > 0.7) {
        const fp = (p - 0.7) / 0.3;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx + ox, cy + 12 - stemH, 9 * fp, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  drawRipeCrops(ctx, bed, cx, cy) {
    ctx.save();
    [-32, 0, 32].forEach((ox, i) => {
      // Stems & Leaves
      ctx.strokeStyle = '#06d6a0';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + 12);
      ctx.lineTo(cx + ox, cy - 14);
      ctx.stroke();

      ctx.fillStyle = '#38b000';
      ctx.beginPath();
      ctx.ellipse(cx + ox - 9, cy - 4, 8, 4, -0.3, 0, Math.PI * 2);
      ctx.ellipse(cx + ox + 9, cy - 4, 8, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Large Glowing Cosmic Fruits!
      const bob = Math.sin(Date.now() / 250 + i) * 3;
      ctx.shadowColor = '#ffd166';
      ctx.shadowBlur = 12;

      if (bed.cropName === 'Star Fruit') {
        // Golden Star Fruit
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx + ox, cy - 16 + bob, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + ox - 3, cy - 19 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (bed.cropName === 'Cosmic Melon') {
        // Striped Mint Space Melon
        ctx.fillStyle = '#06d6a0';
        ctx.beginPath();
        ctx.arc(cx + ox, cy - 16 + bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (bed.cropName === 'Space Berries') {
        // Glowing Pink Cosmic Berries
        ctx.fillStyle = '#ff70a6';
        ctx.beginPath();
        ctx.arc(cx + ox - 4, cy - 14 + bob, 7, 0, Math.PI * 2);
        ctx.arc(cx + ox + 4, cy - 14 + bob, 7, 0, Math.PI * 2);
        ctx.arc(cx + ox, cy - 20 + bob, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glowing Solar Carrot
        ctx.fillStyle = '#ff9770';
        ctx.beginPath();
        ctx.moveTo(cx + ox, cy - 6 + bob);
        ctx.lineTo(cx + ox - 8, cy - 24 + bob);
        ctx.lineTo(cx + ox + 8, cy - 24 + bob);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    });

    // Bed Label
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.fillText(`${bed.cropName} (READY!)`, cx, cy + 24);
    ctx.restore();
  }

  drawAvatar(ctx) {
    const a = this.avatar;
    const profile = window.playerProfile || {
      avatarId: 'cat',
      avatarName: 'Cadet',
      color: '#ff70a6',
      accent: '#ff9770'
    };

    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.scale(a.facing, 1);

    const legBob = Math.sin(a.walkPhase) * 6;

    // Shadow on ground
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();

    // Backpack / Oxygen Tank
    ctx.fillStyle = '#64748b';
    this.drawRoundedRect(ctx, -18, -14, 10, 26, 4);
    ctx.fill();

    // Space Suit Body
    ctx.fillStyle = '#f8fafc';
    this.drawRoundedRect(ctx, -10, -14, 20, 26, 6);
    ctx.fill();
    ctx.strokeStyle = profile.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Suit Chest Patch / Badge
    ctx.fillStyle = profile.color;
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Boots
    ctx.fillStyle = profile.color;
    ctx.fillRect(-9, 12 + legBob, 8, 8);
    ctx.fillRect(1, 12 - legBob, 8, 8);

    // Helmet
    ctx.beginPath();
    ctx.arc(0, -25, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = profile.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Avatar Cute Ears based on chosen character!
    if (profile.avatarId === 'cat') {
      // Kitty Ears
      ctx.fillStyle = profile.color;
      ctx.beginPath();
      ctx.moveTo(-13, -34);
      ctx.lineTo(-6, -45);
      ctx.lineTo(0, -38);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(13, -34);
      ctx.lineTo(6, -45);
      ctx.lineTo(0, -38);
      ctx.fill();
    } else if (profile.avatarId === 'bear') {
      // Bear Round Ears
      ctx.fillStyle = profile.color;
      ctx.beginPath();
      ctx.arc(-13, -38, 6, 0, Math.PI * 2);
      ctx.arc(13, -38, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (profile.avatarId === 'bunny') {
      // Bunny Long Ears
      ctx.fillStyle = profile.color;
      ctx.beginPath();
      ctx.ellipse(-8, -45, 5, 12, -0.15, 0, Math.PI * 2);
      ctx.ellipse(8, -45, 5, 12, 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (profile.avatarId === 'fox') {
      // Fox pointy ears
      ctx.fillStyle = '#ff70a6';
      ctx.beginPath();
      ctx.moveTo(-14, -33);
      ctx.lineTo(-9, -46);
      ctx.lineTo(-2, -37);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -33);
      ctx.lineTo(9, -46);
      ctx.lineTo(2, -37);
      ctx.fill();
    }

    // Visor
    ctx.beginPath();
    ctx.ellipse(4, -25, 10, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tool in hand based on phase
    if (this.phase === 'plant') {
      // Seed Pouch
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(8, 0, 8, 10);
    } else if (this.phase === 'water') {
      // Watering Can
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(8, -2, 10, 8);
      ctx.fillRect(16, 2, 6, 3);
    } else if (this.phase === 'harvest') {
      // Harvest Basket
      ctx.fillStyle = '#ffbe0b';
      ctx.fillRect(6, 2, 12, 10);
    }

    ctx.restore();
  }

  drawActionPrompt(ctx) {
    const bed = this.getNearestBed();
    if (!bed) return;

    let actionText = '';
    let actionColor = '#00f0ff';

    if (this.phase === 'plant' && bed.status === 'empty') {
      actionText = 'PRESS [SPACE] TO PLANT SEEDS 🌱';
      actionColor = '#06d6a0';
    } else if (this.phase === 'water' && bed.status === 'planted') {
      actionText = 'PRESS [SPACE] TO WATER 💧';
      actionColor = '#00f0ff';
    } else if (this.phase === 'harvest' && bed.status === 'ripe') {
      actionText = 'PRESS [SPACE] TO HARVEST! ✨';
      actionColor = '#ffd166';
    }

    if (actionText) {
      ctx.save();
      const px = this.avatar.x;
      const py = this.avatar.y - 55;

      ctx.fillStyle = 'rgba(11, 16, 38, 0.9)';
      const textW = ctx.measureText(actionText).width + 24;
      this.drawRoundedRect(ctx, px - textW / 2, py - 14, textW, 28, 14);
      ctx.fill();
      ctx.strokeStyle = actionColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = actionColor;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(actionText, px, py + 4);
      ctx.restore();
    }
  }

  drawEffects(ctx) {
    // Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Floating texts
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  updateHUD() {
    const planted = this.beds.filter(b => b.status === 'planted' || b.status === 'watered' || b.status === 'ripe' || b.status === 'harvested').length;
    const watered = this.beds.filter(b => b.status === 'watered' || b.status === 'ripe' || b.status === 'harvested').length;
    const harvested = this.beds.filter(b => b.status === 'harvested').length;

    if (this.callbacks.onUpdateHUD) {
      this.callbacks.onUpdateHUD({
        timeLeft: this.timeLeft,
        phase: this.phase,
        planted: planted,
        watered: watered,
        harvested: harvested,
        total: this.beds.length
      });
    }

    // Update Action Button on screen
    const btn = document.getElementById('l1t2ActionBtn');
    if (btn) {
      if (this.phase === 'plant') {
        btn.textContent = '🌱 Plant Seeds';
      } else if (this.phase === 'water') {
        btn.textContent = '💧 Water Crops';
      } else if (this.phase === 'harvest') {
        btn.textContent = '🌾 Harvest Crops';
      } else {
        btn.textContent = '⏳ Growing...';
      }
    }
  }

  triggerWin() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const playerName = (window.playerProfile && window.playerProfile.avatarName) || 'Gardener';

    if (window.soundSystem) window.soundSystem.playVictory();
    if (window.robotBuddy) {
      window.robotBuddy.say(
        `Spectacular job, ${playerName}! 4 healthy cosmic crops harvested for our space crew! Level 1 Task 2 Complete!`,
        'celebrate'
      );
    }
    if (window.showConfetti) window.showConfetti();

    setTimeout(() => {
      if (this.callbacks.onWin) {
        this.callbacks.onWin({
          timeTaken: 90 - this.timeLeft,
          crops: 4
        });
      }
    }, 1200);
  }

  triggerGameOver(reason) {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (this.callbacks.onLose) {
      this.callbacks.onLose({
        reason: reason || 'Failed to complete crop cycle in time.',
        taskName: 'Task 2: Lunar Crop Production'
      });
    }
  }

  stop() {
    this.active = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
  }
}

window.Task2LunarCrops = Task2LunarCrops;
