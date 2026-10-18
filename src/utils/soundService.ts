/**
 * Sound Service for CRM Real-time Notifications
 * Plays an audible chime using Web Audio API synthesis with HTML5 Audio fallback.
 * Automatically handles browser autoplay unlock policies.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private fallbackAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
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
    } catch {
      // Ignored
    }
  }

  /**
   * Plays a 3-tone chime (C5 - 523Hz -> E5 - 659Hz -> G5 - 784Hz)
   */
  public playChime(volume: number = 0.5): void {
    try {
      const ctx = this.getAudioContext();

      if (ctx && ctx.state !== 'closed') {
        // Ensure running state
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const notes = [
          { freq: 523.25, time: now, duration: 0.35, gain: volume * 0.7 },
          { freq: 659.25, time: now + 0.12, duration: 0.38, gain: volume * 0.8 },
          { freq: 783.99, time: now + 0.24, duration: 0.55, gain: volume * 1.0 },
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
        return;
      }
    } catch (err) {
      console.warn('[SoundService] Web Audio chime failed, falling back to audio element:', err);
    }

    // Fallback: HTML5 Audio
    try {
      if (!this.fallbackAudio && typeof Audio !== 'undefined') {
        this.fallbackAudio = new Audio('/sounds/notification.wav');
      }
      if (this.fallbackAudio) {
        this.fallbackAudio.currentTime = 0;
        this.fallbackAudio.volume = Math.min(1, Math.max(0, volume));
        this.fallbackAudio.play().catch(() => {});
      }
    } catch (e) {
      console.warn('[SoundService] Fallback audio playback failed:', e);
    }
  }
}

export const soundService = new SoundService();
export const playNotificationSound = (volume: number = 0.5) => soundService.playChime(volume);
export const unlockAudio = () => soundService.unlockAudio();
