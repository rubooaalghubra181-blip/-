class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private bgAudio: HTMLAudioElement | null = null;

  private init() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        console.warn("Web Audio API is not supported in this browser.", e);
      }
    }
    // Resume context if suspended (browser security autoplay policies)
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Ignore audio glitches
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major chord arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.08, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    } catch (e) { }
  }

  playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Dramatic, low minor/dissonant sound
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(146.83, now); // D3
      osc1.frequency.linearRampToValueAtTime(110.00, now + 0.6); // A2

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(155.56, now); // D#3 (dissonant semitone)
      osc2.frequency.linearRampToValueAtTime(116.54, now + 0.6); // A#2

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) { }
  }

  playChime() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.25); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.3);
    } catch (e) { }
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const chords = [
        [261.63, 329.63, 392.00], // C4, E4, G4
        [293.66, 349.23, 440.00], // D4, F4, A4
        [329.63, 392.00, 523.25], // E4, G4, C5
        [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 triumphant
      ];

      chords.forEach((notes, chordIdx) => {
        notes.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + chordIdx * 0.25);
          gain.gain.setValueAtTime(0.06, now + chordIdx * 0.25);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + chordIdx * 0.25 + 0.8);
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(now + chordIdx * 0.25);
          osc.stop(now + chordIdx * 0.25 + 0.8);
        });
      });
    } catch (e) { }
  }

  private bgMusicInterval: any = null;

  playIntroTheme() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    this.stopBackgroundMusic(); // clear any running music
    
    try {
      const now = this.ctx.currentTime;
      
      // Play a low atmospheric rumble
      const rumbleOsc = this.ctx.createOscillator();
      const rumbleGain = this.ctx.createGain();
      rumbleOsc.type = 'sawtooth';
      rumbleOsc.frequency.setValueAtTime(55.00, now); // A1
      rumbleOsc.frequency.linearRampToValueAtTime(49.00, now + 5); // G1
      rumbleGain.gain.setValueAtTime(0.03, now);
      rumbleGain.gain.linearRampToValueAtTime(0.03, now + 4);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
      rumbleOsc.connect(rumbleGain);
      rumbleGain.connect(this.ctx.destination);
      rumbleOsc.start(now);
      rumbleOsc.stop(now + 5.5);

      // Frequencies: G2(98), D3(146.8), Bb3(233), D4(293.7), F4(349.2) - Classic tension pad
      const chords = [98.00, 146.83, 233.08, 293.66, 349.23];
      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.02, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + 4.5);
      });

      // The legendary "Who Wants to Be a Millionaire" tension theme melody!
      const melody = [
        { note: 392.00, time: 0.5, dur: 0.3 }, // G4
        { note: 466.16, time: 0.8, dur: 0.3 }, // Bb4
        { note: 440.00, time: 1.1, dur: 0.3 }, // A4
        { note: 392.00, time: 1.4, dur: 0.4 }, // G4
        { note: 587.33, time: 1.8, dur: 0.8 }, // D5 (high, dramatic strike)
        // Tension resolve:
        { note: 523.25, time: 2.6, dur: 0.4 }, // C5
        { note: 466.16, time: 3.0, dur: 0.4 }, // Bb4
        { note: 440.00, time: 3.4, dur: 1.2 }  // A4 (long resolving note)
      ];

      melody.forEach((item) => {
        const mOsc1 = this.ctx!.createOscillator();
        const mOsc2 = this.ctx!.createOscillator();
        const mGain = this.ctx!.createGain();
        
        mOsc1.type = 'sine';
        mOsc1.frequency.setValueAtTime(item.note, now + item.time);
        
        mOsc2.type = 'triangle';
        mOsc2.frequency.setValueAtTime(item.note * 0.995, now + item.time); // subtle detune for warmth
        
        mGain.gain.setValueAtTime(0.05, now + item.time);
        mGain.gain.exponentialRampToValueAtTime(0.0001, now + item.time + item.dur);
        
        mOsc1.connect(mGain);
        mOsc2.connect(mGain);
        mGain.connect(this.ctx!.destination);
        
        mOsc1.start(now + item.time);
        mOsc2.start(now + item.time);
        mOsc1.stop(now + item.time + item.dur);
        mOsc2.stop(now + item.time + item.dur);
      });
    } catch (e) { }
  }

  startBackgroundMusic() {
    if (!this.enabled) return;
    this.init();
    this.stopBackgroundMusic(); // clear any running loop or audio
    
    try {
      // Try to play the real audio file thinking.mp3 from the public folder
      this.bgAudio = new Audio("/sounds/thinking.mp3");
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.35;
      
      const playPromise = this.bgAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log("Playing real background music: /sounds/thinking.mp3");
        }).catch((err) => {
          // Fallback to synthetic if play fails (e.g. no user gesture or file not found)
          console.log("Fallback to synthetic background music because of play error:", err);
          this.startSyntheticHeartbeat();
        });
      }
    } catch (e) {
      console.log("Fallback to synthetic background music because of error:", e);
      this.startSyntheticHeartbeat();
    }
  }

  private startSyntheticHeartbeat() {
    let beatCount = 0;
    
    // Heartbeat & Tension bass track loop
    this.bgMusicInterval = setInterval(() => {
      if (!this.enabled || !this.ctx) return;
      
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      
      try {
        const now = this.ctx.currentTime;
        
        // Double heartbeat low tension pulses
        const isAltBeat = beatCount % 4 === 0;
        const freq = isAltBeat ? 55.00 : 49.00; // A1 or G1 (Hz)
        
        // Pulse 1
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);
        gain1.gain.setValueAtTime(0.06, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);
        
        // Pulse 2 (double beat heartbeat)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq, now + 0.22);
        gain2.gain.setValueAtTime(0.04, now + 0.22);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.57);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.57);

        // Every 8 beats, play the rising tension synth chord
        if (beatCount % 8 === 0) {
          const mFreqs = [196.00, 207.65, 196.00, 174.61]; // G3, Ab3, G3, F3
          mFreqs.forEach((mFreq, idx) => {
            const mOsc = this.ctx!.createOscillator();
            const mGain = this.ctx!.createGain();
            mOsc.type = 'sine';
            mOsc.frequency.setValueAtTime(mFreq, now + idx * 0.3);
            mGain.gain.setValueAtTime(0.015, now + idx * 0.3);
            mGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.3 + 0.55);
            mOsc.connect(mGain);
            mGain.connect(this.ctx!.destination);
            mOsc.start(now + idx * 0.3);
            mOsc.stop(now + idx * 0.3 + 0.55);
          });
        }
        
        beatCount++;
      } catch (e) { }
    }, 1200);
  }

  stopBackgroundMusic() {
    if (this.bgMusicInterval) {
      clearInterval(this.bgMusicInterval);
      this.bgMusicInterval = null;
    }
    if (this.bgAudio) {
      try {
        this.bgAudio.pause();
        this.bgAudio.currentTime = 0;
      } catch (e) {}
      this.bgAudio = null;
    }
  }

  playTensionWaiting() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Dissonant suspense swell (D3 + G#3 -> A3 + D#4)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(146.83, now); // D3
      osc1.frequency.exponentialRampToValueAtTime(220.00, now + 1.9); // A3
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(207.65, now); // G#3 (very dissonant with D3)
      osc2.frequency.exponentialRampToValueAtTime(311.13, now + 1.9); // D#4
      
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 1.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
      
      // Add a double heavy heartbeat at start of waiting
      const heartOsc = this.ctx.createOscillator();
      const heartGain = this.ctx.createGain();
      heartOsc.type = 'sine';
      heartOsc.frequency.setValueAtTime(65.0, now);
      heartGain.gain.setValueAtTime(0.15, now);
      heartGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      heartOsc.connect(heartGain);
      heartGain.connect(this.ctx.destination);
      heartOsc.start(now);
      heartOsc.stop(now + 0.3);

      const heartOsc2 = this.ctx.createOscillator();
      const heartGain2 = this.ctx.createGain();
      heartOsc2.type = 'sine';
      heartOsc2.frequency.setValueAtTime(65.0, now + 0.25);
      heartGain2.gain.setValueAtTime(0.12, now + 0.25);
      heartGain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      heartOsc2.connect(heartGain2);
      heartGain2.connect(this.ctx.destination);
      heartOsc2.start(now + 0.25);
      heartOsc2.stop(now + 0.55);
    } catch (e) {}
  }

  playLifelineCall() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Ringtone simulation: 3 rings
      for (let i = 0; i < 3; i++) {
        const time = now + i * 0.8;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, time);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, time);
        
        gain.gain.setValueAtTime(0.06, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.55);
        osc2.stop(time + 0.55);
      }
    } catch (e) {}
  }
}

export const soundManager = new SoundManager();
