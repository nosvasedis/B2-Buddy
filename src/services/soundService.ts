
/**
 * A lightweight synthesizer for game sound effects using the Web Audio API.
 * No external assets required.
 */

const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
const ctx = new AudioContextClass();

const playTone = (freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 0.1) => {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
};

export const playSound = (effect: 'click' | 'success' | 'error' | 'complete' | 'levelUp' | 'pop') => {
    if (ctx.state === 'suspended') ctx.resume();

    switch (effect) {
        case 'click':
            playTone(600, 'sine', 0.05, 0, 0.05);
            break;
        case 'pop':
            playTone(800, 'triangle', 0.05, 0, 0.05);
            break;
        case 'success':
            // A happy major triad
            playTone(523.25, 'sine', 0.3, 0, 0.1); // C5
            playTone(659.25, 'sine', 0.3, 0.1, 0.1); // E5
            playTone(783.99, 'sine', 0.4, 0.2, 0.1); // G5
            break;
        case 'error':
            // A dissonant buzz
            playTone(150, 'sawtooth', 0.3, 0, 0.1);
            playTone(140, 'sawtooth', 0.3, 0, 0.1);
            break;
        case 'complete':
            // A victorious run
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                playTone(freq, 'square', 0.2, i * 0.1, 0.05);
            });
            break;
        case 'levelUp':
            // Fanfare
            const now = ctx.currentTime;
            [440, 440, 440, 587, 0, 523, 587].forEach((freq, i) => {
                if (freq > 0) playTone(freq, 'triangle', 0.2, i * 0.15, 0.1);
            });
            break;
    }
};
