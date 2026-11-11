/**
 * Space Survival Level 2 - Procedural Web Audio API Sound System
 * High quality synthesizer for ambient music, urgent alarms, energetic runner beats, and sci-fi SFX.
 * Zero external audio file dependencies. Guaranteed 100% offline and cross-browser reliability.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.masterGain = null;

    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.volume = 0.7;

    this.currentTrack = null;
    this.musicTimer = null;
    this.leakNode = null;
    this.leakGain = null;

    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Music Gain
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.65 : 0, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime, 0.05);
    }
    return this.musicEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.65 : 0, this.ctx.currentTime, 0.05);
    }
    return this.sfxEnabled;
  }

  /* -------------------------------------------------------------
     MUSIC SYNTHESIZERS
     ------------------------------------------------------------- */

  playMusic(trackName) {
    this.ensureContext();
    if (!this.ctx) return;
    if (this.currentTrack === trackName) return;

    this.stopMusic();
    this.currentTrack = trackName;

    if (trackName === 'space') {
      this.startAmbientSpaceMusic();
    } else if (trackName === 'runner') {
      this.startRunnerMusic();
    } else if (trackName === 'emergency') {
      this.startEmergencyMusic();
    }
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.currentTrack = null;
  }

  // Track 1: Atmospheric Space Synth (Pads & Echoing Cosmic Chimes)
  startAmbientSpaceMusic() {
    const chords = [
      [220, 261.63, 329.63, 392.0], // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [130.81, 196.0, 261.63, 329.63], // Cmaj
      [196.0, 246.94, 293.66, 349.23]  // G7
    ];
    let step = 0;

    const playChord = () => {
      if (!this.ctx || this.currentTrack !== 'space') return;
      const now = this.ctx.currentTime;
      const notes = chords[step % chords.length];
      step++;

      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800 + i * 200, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.8 + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now + i * 0.15);
        osc.stop(now + 4.0);
      });
    };

    playChord();
    this.musicTimer = setInterval(playChord, 3600);
  }

  // Track 2: High Energy Cyber Runner (130 BPM Pulse Synth & Driving Bass)
  startRunnerMusic() {
    let beat = 0;
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const arps = [440, 523.25, 659.25, 880, 659.25, 523.25, 587.33, 440];

    const tick = () => {
      if (!this.ctx || this.currentTrack !== 'runner') return;
      const now = this.ctx.currentTime;

      // Bass note on every beat
      const bassFreq = bassline[beat % bassline.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq / 2, now);

      bassGain.gain.setValueAtTime(0.12, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(now);
      bassOsc.stop(now + 0.24);

      // Hi-hat tick
      this.playSynthHat(now);

      // Arpeggiated melody note
      if (beat % 2 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(arps[(beat / 2) % arps.length], now);

        leadGain.gain.setValueAtTime(0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);
        leadOsc.start(now);
        leadOsc.stop(now + 0.38);
      }

      beat++;
    };

    this.musicTimer = setInterval(tick, 230); // ~130 BPM
  }

  playSynthHat(time) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(time);
  }

  // Track 3: Urgent Emergency Siren Beat (Tense Red Alert Pulsing)
  startEmergencyMusic() {
    let pulse = 0;

    const alertBeat = () => {
      if (!this.ctx || this.currentTrack !== 'emergency') return;
      const now = this.ctx.currentTime;

      // Pulsing siren synth
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      const freq1 = pulse % 2 === 0 ? 349.23 : 329.63; // F4 / E4 siren oscillation
      osc.frequency.setValueAtTime(freq1, now);
      osc.frequency.exponentialRampToValueAtTime(freq1 * 1.1, now + 0.28);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.32);

      // Low tension sub pulse
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(55, now);
      subGain.gain.setValueAtTime(0.12, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      sub.connect(subGain);
      subGain.connect(this.musicGain);
      sub.start(now);
      sub.stop(now + 0.37);

      pulse++;
    };

    this.musicTimer = setInterval(alertBeat, 400);
  }

  /* -------------------------------------------------------------
     SOUND EFFECTS (SFX)
     ------------------------------------------------------------- */

  // Continuous Air Leak Hiss (Dynamic Volume)
  playAirLeakHiss(intensity = 0.5) {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    if (this.leakNode) {
      if (this.leakGain) {
        this.leakGain.gain.setTargetAtTime(0.15 * intensity, this.ctx.currentTime, 0.1);
      }
      return;
    }

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15 * intensity, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
    this.leakNode = noise;
    this.leakGain = gain;
  }

  stopAirLeakHiss() {
    if (this.leakNode) {
      try {
        this.leakNode.stop();
        this.leakNode.disconnect();
      } catch (e) {
        // ignore
      }
      this.leakNode = null;
      this.leakGain = null;
    }
  }

  // Repair Sound: Laser welding sizzle + pneumatic lock + confirmation beep
  playRepair() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    // Laser welding sizzle (short filtered noise)
    const bufSize = this.ctx.sampleRate * 0.15;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.setValueAtTime(2800, now);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.12, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);

    // Mechanical lock chime
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.25);

    oscGain.gain.setValueAtTime(0.001, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.18, now + 0.15);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now + 0.1);
    osc.stop(now + 0.37);
  }

  // Jumping Sound (Springy upward pitch sweep)
  playJump() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Sliding Sound (Air whoosh sweep)
  playSlide() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const bufSize = this.ctx.sampleRate * 0.25;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.linearRampToValueAtTime(300, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
  }

  // Collecting Sound (Bright Crystal Chime chord based on resource)
  playCollect(type = 'oxygen') {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    let baseFreq = 659.25; // E5
    if (type === 'water') baseFreq = 783.99; // G5
    if (type === 'shield') baseFreq = 987.77; // B5

    [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.16, now + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.35);
    });
  }

  // Collision Sound (Low impact thump + metallic resonance)
  playCollision() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);

    // Crunch noise
    const bufSize = this.ctx.sampleRate * 0.12;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.7;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.15, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.connect(nGain);
    nGain.connect(this.sfxGain);
    noise.start(now);
  }

  // Electrical Malfunction Buzz & Spark
  playMalfunction() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.1);
    osc.frequency.linearRampToValueAtTime(70, now + 0.25);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Wire Connected Click + Harmonic confirmation
  playWireConnect() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.66, now + 0.08); // A5 -> D6

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // Generic Button Click / UI Beep
  playButtonClick() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Simon Says Keypad Sequence Note
  playSequenceNote(idx = 0) {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const scale = [329.63, 392.0, 493.88, 587.33, 659.25]; // E4, G4, B4, D5, E5
    const freq = scale[idx % scale.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  // Power Slider adjust tick
  playSliderTick(freq = 400) {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Triumphant Fanfare (Task Victory & Game Complete)
  playVictory() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.12 }, // C5
      { f: 659.25, t: 0.12, d: 0.12 }, // E5
      { f: 783.99, t: 0.24, d: 0.15 }, // G5
      { f: 1046.5, t: 0.39, d: 0.45 }  // C6
    ];

    notes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.22, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    });
  }

  // Defeat / Failure Sound (Sad descending tones)
  playFailure() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 392.0, t: 0.0 },
      { f: 369.99, t: 0.2 },
      { f: 349.23, t: 0.4 },
      { f: 311.13, t: 0.65 }
    ];

    notes.forEach((n, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.14, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + n.t);
      osc.stop(now + n.t + 0.25);
    });
  }
}

// Singleton global instance
window.soundSystem = new SoundSystem();
