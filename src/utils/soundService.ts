/**
 * Sound Service for CRM Real-time Notifications
 * Synthesizes 6 high-fidelity audio presets using the Web Audio API with HTML5 Audio fallback.
 * Allows admin/users to select, preview, and persist their preferred notification alert sound.
 * Automatically handles browser autoplay unlock policies.
 */

export interface SoundPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'chime' | 'bell' | 'ping' | 'marimba' | 'ding' | 'pulse';
}

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'classic_chime',
    name: 'Classic Chime',
    description: 'Familiar 3-note ascending chord (C5 - E5 - G5)',
    icon: '🔔',
    category: 'chime',
  },
  {
    id: 'crystal_bell',
    name: 'Crystal Bell',
    description: 'Bright harmonic crystalline bells with shimmering decay',
    icon: '💎',
    category: 'bell',
  },
  {
    id: 'modern_ping',
    name: 'Modern Tech Ping',
    description: 'Crisp, futuristic pitch-gliding digital blip',
    icon: '⚡',
    category: 'ping',
  },
  {
    id: 'warm_marimba',
    name: 'Warm Marimba',
    description: 'Mellow percussive acoustic wooden chime',
    icon: '🪵',
    category: 'marimba',
  },
  {
    id: 'executive_ding',
    name: 'Executive Ding',
    description: 'Authoritative brass desk ding with resonant ring',
    icon: '🏆',
    category: 'ding',
  },
  {
    id: 'subtle_pulse',
    name: 'Subtle Pulse',
    description: 'Soft, gentle double pulse that won\'t interrupt calls',
    icon: '💫',
    category: 'pulse',
  },
];

const STORAGE_KEY_PRESET = 'crm_notification_sound_preset';
const STORAGE_KEY_VOLUME = 'crm_notification_sound_volume';

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private fallbackAudio: HTMLAudioElement | null = null;
  private currentPresetId: string = 'classic_chime';
  private currentVolume: number = 0.6;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedPreset = localStorage.getItem(STORAGE_KEY_PRESET);
        if (savedPreset && SOUND_PRESETS.some((p) => p.id === savedPreset)) {
          this.currentPresetId = savedPreset;
        }
        const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME);
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
            this.currentVolume = parsed;
          }
        }
      } catch {}

      const unlock = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlock, { passive: true, once: true });
      window.addEventListener('touchstart', unlock, { passive: true, once: true });
      window.addEventListener('keydown', unlock, { passive: true, once: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public unlockAudio(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      this.isUnlocked = true;
    } catch {}
  }

  public getAvailablePresets(): SoundPreset[] {
    return SOUND_PRESETS;
  }

  public getSelectedPresetId(): string {
    return this.currentPresetId;
  }

  public setSelectedPresetId(id: string): void {
    if (SOUND_PRESETS.some((p) => p.id === id)) {
      this.currentPresetId = id;
      try {
        localStorage.setItem(STORAGE_KEY_PRESET, id);
      } catch {}
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.currentVolume = clamped;
    try {
      localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
    } catch {}
  }

  /**
   * Play a specific preset by ID or the currently selected preset.
   * Supports either playPreset(presetId, volume) or playPreset(volume).
   */
  public playPreset(presetOrVolume?: string | number, volumeOverride?: number): void {
    let targetId = this.currentPresetId;
    let vol = this.currentVolume;

    if (typeof presetOrVolume === 'number') {
      vol = presetOrVolume;
    } else if (typeof presetOrVolume === 'string' && presetOrVolume.trim().length > 0) {
      targetId = presetOrVolume;
      if (typeof volumeOverride === 'number') {
        vol = volumeOverride;
      }
    } else if (typeof volumeOverride === 'number') {
      vol = volumeOverride;
    }

    try {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state === 'closed') {
        this.playFallback();
        return;
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      switch (targetId) {
        case 'crystal_bell':
          this.synthCrystalBell(ctx, vol);
          break;
        case 'modern_ping':
          this.synthModernPing(ctx, vol);
          break;
        case 'warm_marimba':
          this.synthWarmMarimba(ctx, vol);
          break;
        case 'executive_ding':
          this.synthExecutiveDing(ctx, vol);
          break;
        case 'subtle_pulse':
          this.synthSubtlePulse(ctx, vol);
          break;
        case 'classic_chime':
        default:
          this.synthClassicChime(ctx, vol);
          break;
      }
    } catch (err) {
      console.warn('[SoundService] Synthesis failed, playing fallback:', err);
      this.playFallback();
    }
  }

  /**
   * Alias for backward compatibility
   */
  public playChime(volume?: number): void {
    this.playPreset(this.currentPresetId, volume);
  }

  // ==========================================
  // Sound 1: Classic Chime (C5 - E5 - G5)
  // ==========================================
  private synthClassicChime(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: now, duration: 0.35, gain: vol * 0.7 },
      { freq: 659.25, time: now + 0.12, duration: 0.38, gain: vol * 0.8 },
      { freq: 783.99, time: now + 0.24, duration: 0.55, gain: vol * 1.0 },
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, time);

      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.exponentialRampToValueAtTime(gain, time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gainNode);
      overtone.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(time);
      overtone.start(time);
      osc.stop(time + duration);
      overtone.stop(time + duration);
    });
  }

  // ==========================================
  // Sound 2: Crystal Bell (A5 - E6 + Harmonics)
  // ==========================================
  private synthCrystalBell(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const tones = [
      { freq: 880.0, time: now, duration: 0.7, gain: vol * 0.85 },
      { freq: 1318.51, time: now + 0.14, duration: 0.9, gain: vol * 0.9 },
    ];

    tones.forEach(({ freq, time, duration, gain }) => {
      const fundamental = ctx.createOscillator();
      const harmonic1 = ctx.createOscillator();
      const harmonic2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      fundamental.type = 'sine';
      fundamental.frequency.setValueAtTime(freq, time);

      harmonic1.type = 'sine';
      harmonic1.frequency.setValueAtTime(freq * 2.76, time); // Inharmonic metallic chime

      harmonic2.type = 'sine';
      harmonic2.frequency.setValueAtTime(freq * 4.2, time);

      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.exponentialRampToValueAtTime(gain, time + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      fundamental.connect(gainNode);
      harmonic1.connect(gainNode);
      harmonic2.connect(gainNode);
      gainNode.connect(ctx.destination);

      fundamental.start(time);
      harmonic1.start(time);
      harmonic2.start(time);
      fundamental.stop(time + duration);
      harmonic1.stop(time + duration);
      harmonic2.stop(time + duration);
    });
  }

  // ==========================================
  // Sound 3: Modern Tech Ping (F5 -> C6 glide)
  // ==========================================
  private synthModernPing(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(698.46, now); // F5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.05); // Glide to C6

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(vol * 1.1, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // ==========================================
  // Sound 4: Warm Marimba (G4 - C5 - E5 Mellow)
  // ==========================================
  private synthWarmMarimba(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: 392.0, time: now, duration: 0.3, gain: vol * 0.9 },
      { freq: 523.25, time: now + 0.09, duration: 0.32, gain: vol * 0.85 },
      { freq: 659.25, time: now + 0.18, duration: 0.45, gain: vol * 1.0 },
    ];

    notes.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const lowHarmonic = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      lowHarmonic.type = 'triangle';
      lowHarmonic.frequency.setValueAtTime(freq * 0.5, time); // Sub-octave warmth

      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.linearRampToValueAtTime(gain, time + 0.008); // Fast woody strike
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gainNode);
      lowHarmonic.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(time);
      lowHarmonic.start(time);
      osc.stop(time + duration);
      lowHarmonic.stop(time + duration);
    });
  }

  // ==========================================
  // Sound 5: Executive Ding (D5 Brass Desk Bell)
  // ==========================================
  private synthExecutiveDing(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const baseFreq = 587.33; // D5

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2.01, now); // Slightly detuned harmonic

    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(baseFreq * 3.82, now); // Bell brightness

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(vol * 1.0, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    osc3.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + 0.95);
    osc2.stop(now + 0.95);
    osc3.stop(now + 0.95);
  }

  // ==========================================
  // Sound 6: Subtle Pulse (Soft E5 - G5)
  // ==========================================
  private synthSubtlePulse(ctx: AudioContext, vol: number): void {
    const now = ctx.currentTime;
    const pulses = [
      { freq: 659.25, time: now, duration: 0.18, gain: vol * 0.5 },
      { freq: 783.99, time: now + 0.14, duration: 0.22, gain: vol * 0.6 },
    ];

    pulses.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.linearRampToValueAtTime(gain, time + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  private playFallback(): void {
    try {
      if (!this.fallbackAudio && typeof Audio !== 'undefined') {
        this.fallbackAudio = new Audio('/sounds/notification.wav');
      }
      if (this.fallbackAudio) {
        this.fallbackAudio.currentTime = 0;
        this.fallbackAudio.volume = this.currentVolume;
        this.fallbackAudio.play().catch(() => {});
      }
    } catch {}
  }
}

export const soundService = new SoundService();
export const playNotificationSound = (presetOrVolume?: string | number, volume?: number) => soundService.playPreset(presetOrVolume, volume);
export const unlockAudio = () => soundService.unlockAudio();

