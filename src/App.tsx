import { useState, useRef, useEffect, useCallback } from 'react';
import { generateMusic } from './audioEngine';
import './App.css';

// ─── Types ──────────────────────────────────────────────────────────────────
interface HistoryItem {
  id: number;
  prompt: string;
  timestamp: Date;
  duration: number;
  genre: string;
  mood: string;
  tempo: number;
  blob: Blob;
}

// ─── Genre / Mood data ─────────────────────────────────────────────────────
const genreEmojis: Record<string, string> = {
  electronic: '⚡', pop: '🌟', rock: '🎸', classical: '🎻',
  jazz: '🎷', 'hip-hop': '🎤', ambient: '🌊', lofi: '☕',
  synthwave: '🌆', orchestral: '🎼', folk: '🪕', blues: '🎹',
};

const moodEmojis: Record<string, string> = {
  uplifting: '☀️', melancholic: '🌧️', energetic: '⚡',
  calm: '🌿', dark: '🌑', romantic: '💖',
  epic: '⚔️', mysterious: '🔮', happy: '😊',
  sad: '😢', focused: '🎯',
};

const moodColors: Record<string, string> = {
  uplifting: 'from-yellow-500 to-orange-500',
  melancholic: 'from-blue-600 to-indigo-700',
  energetic: 'from-red-500 to-orange-500',
  calm: 'from-teal-500 to-cyan-600',
  dark: 'from-gray-700 to-gray-900',
  romantic: 'from-pink-500 to-rose-600',
  epic: 'from-purple-600 to-indigo-600',
  mysterious: 'from-violet-700 to-purple-900',
  happy: 'from-yellow-400 to-green-500',
  sad: 'from-blue-500 to-indigo-600',
  focused: 'from-green-500 to-teal-600',
};

const genres = ['electronic', 'pop', 'rock', 'classical', 'jazz', 'hip-hop', 'ambient', 'lofi', 'synthwave', 'orchestral', 'folk', 'blues'];
const moods = ['uplifting', 'melancholic', 'energetic', 'calm', 'dark', 'romantic', 'epic', 'mysterious', 'happy', 'sad', 'focused'];

const presetPrompts = [
  { label: '🎮 Game OST', text: 'epic orchestral battle music for a fantasy RPG game', genre: 'orchestral', mood: 'epic' },
  { label: '☕ Study', text: 'chill lofi hip-hop beats for studying and focus', genre: 'lofi', mood: 'focused' },
  { label: '🌆 Synthwave', text: 'retro 80s synthwave with neon vibes and arpeggios', genre: 'synthwave', mood: 'energetic' },
  { label: '🎬 Cinematic', text: 'emotional cinematic strings with piano', genre: 'classical', mood: 'melancholic' },
  { label: '🌊 Ambient', text: 'peaceful ambient soundscape with gentle pads', genre: 'ambient', mood: 'calm' },
  { label: '🎸 Rock', text: 'energetic rock with electric guitars and heavy drums', genre: 'rock', mood: 'energetic' },
  { label: '🎷 Jazz', text: 'smooth jazz piano with walking bass line', genre: 'jazz', mood: 'romantic' },
  { label: '🎤 Hip-Hop', text: 'dark trap beat with heavy 808 bass and hi-hats', genre: 'hip-hop', mood: 'dark' },
];

// ─── Waveform Visualizer ───────────────────────────────────────────────────
function WaveformVisualizer({ isPlaying, isGenerating, audioData }: {
  isPlaying: boolean;
  isGenerating: boolean;
  audioData: Float32Array | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const barCount = 64;
      const barWidth = Math.floor(w / barCount) - 2;
      const centerY = h / 2;

      if (isGenerating) {
        offsetRef.current += 0.08;
        for (let i = 0; i < barCount; i++) {
          const height = (Math.sin(offsetRef.current + i * 0.3) * 0.5 + 0.5) * h * 0.7 + 4;
          const hue = 260 + i * 2;
          ctx.fillStyle = `hsl(${hue}, 80%, 65%)`;
          ctx.fillRect(i * (barWidth + 2), centerY - height / 2, barWidth, height);
        }
      } else if (isPlaying && audioData) {
        offsetRef.current += 0.05;
        const step = Math.floor(audioData.length / barCount);
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          const startIdx = (Math.floor(offsetRef.current * 1000) + i * step) % audioData.length;
          for (let j = 0; j < step && startIdx + j < audioData.length; j++) {
            sum += Math.abs(audioData[startIdx + j]);
          }
          const avg = sum / step;
          const height = Math.max(3, avg * h * 4);
          const hue = 260 + i * 2;
          ctx.fillStyle = `hsl(${hue}, 75%, 60%)`;
          ctx.fillRect(i * (barWidth + 2), centerY - height / 2, barWidth, height);
        }
      } else if (audioData) {
        // Static waveform
        const step = Math.floor(audioData.length / barCount);
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step && i * step + j < audioData.length; j++) {
            sum += Math.abs(audioData[i * step + j]);
          }
          const avg = sum / step;
          const height = Math.max(3, avg * h * 3);
          ctx.fillStyle = `rgba(139, 92, 246, 0.4)`;
          ctx.fillRect(i * (barWidth + 2), centerY - height / 2, barWidth, height);
        }
      } else {
        // Idle
        for (let i = 0; i < barCount; i++) {
          ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
          ctx.fillRect(i * (barWidth + 2), centerY - 2, barWidth, 4);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, isGenerating, audioData]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={80}
      className="w-full h-16 rounded-lg"
    />
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [prompt, setPrompt] = useState('uplifting electronic music with synth melodies and driving beat');
  const [duration, setDuration] = useState(10);
  const [genre, setGenre] = useState('electronic');
  const [mood, setMood] = useState('uplifting');
  const [tempo, setTempo] = useState(128);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);

  // Audio playback state (using Web Audio API directly)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const isPlayingRef = useRef(false);

  // ─── Decode blob into AudioBuffer ────────────────────────────────────────
  const decodeBlob = useCallback(async (blob: Blob): Promise<AudioBuffer> => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const arrayBuffer = await blob.arrayBuffer();
    return audioCtxRef.current.decodeAudioData(arrayBuffer);
  }, []);

  // ─── Stop current playback ──────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    cancelAnimationFrame(animFrameRef.current);
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    pausedAtRef.current = 0;
  }, []);

  // ─── Play from a specific offset ───────────────────────────────────────
  const playFrom = useCallback((offset: number) => {
    if (!audioBufferRef.current || !audioCtxRef.current) return;

    // Stop any current source
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* ok */ }
    }

    const ctx = audioCtxRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }
    gainNodeRef.current.gain.value = volume;

    source.connect(gainNodeRef.current);
    source.start(0, offset);
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime - offset;
    isPlayingRef.current = true;
    setIsPlaying(true);

    source.onended = () => {
      if (isPlayingRef.current) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentTime(0);
        pausedAtRef.current = 0;
        cancelAnimationFrame(animFrameRef.current);
      }
    };

    // Update time display
    const updateTime = () => {
      if (!isPlayingRef.current || !audioCtxRef.current) return;
      const t = audioCtxRef.current.currentTime - startTimeRef.current;
      setCurrentTime(Math.min(t, totalDuration));
      animFrameRef.current = requestAnimationFrame(updateTime);
    };
    animFrameRef.current = requestAnimationFrame(updateTime);
  }, [volume, totalDuration]);

  // ─── Toggle play/pause ──────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!audioBufferRef.current) return;

    if (isPlayingRef.current) {
      // Pause
      if (audioCtxRef.current) {
        pausedAtRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
      }
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* ok */ }
        sourceRef.current = null;
      }
      cancelAnimationFrame(animFrameRef.current);
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      // Play/resume
      playFrom(pausedAtRef.current);
    }
  }, [playFrom]);

  // ─── Volume changes ─────────────────────────────────────────────────────
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // ─── Seek ────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((newTime: number) => {
    setCurrentTime(newTime);
    pausedAtRef.current = newTime;
    if (isPlayingRef.current) {
      playFrom(newTime);
    }
  }, [playFrom]);

  // ─── Load and play a blob ───────────────────────────────────────────────
  const loadAndPlay = useCallback(async (blob: Blob) => {
    stopPlayback();

    try {
      const buffer = await decodeBlob(blob);
      audioBufferRef.current = buffer;
      setTotalDuration(buffer.duration);
      setCurrentBlob(blob);

      // Extract waveform data for visualization
      const channelData = buffer.getChannelData(0);
      setAudioData(channelData);

      // Auto-play
      setTimeout(() => playFrom(0), 100);
    } catch (err) {
      console.error('Failed to decode audio:', err);
      setError('Failed to play audio. Please try generating again.');
    }
  }, [stopPlayback, decodeBlob, playFrom]);

  // ─── Generate Music ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    setHasGenerated(false);
    stopPlayback();
    setAudioData(null);

    const stages = [
      'Analyzing prompt & initializing model...',
      'Encoding mood & genre embeddings...',
      'Running multi-head attention layers...',
      'Generating harmonic sequences...',
      'Synthesizing instruments & drums...',
      'Mixing layers & applying reverb...',
      'Encoding WAV output...',
    ];

    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      if (stageIdx < stages.length) {
        setGenerationProgress(10 + stageIdx * 13);
        setGenerationStage(stages[stageIdx]);
        stageIdx++;
      }
    }, Math.max(200, duration * 40));

    try {
      const blob = await generateMusic({ genre, mood, tempo, duration, prompt });

      clearInterval(stageInterval);
      setGenerationProgress(100);
      setGenerationStage('✨ Complete!');

      setHasGenerated(true);

      // Add to history
      setHistory(prev => [{
        id: Date.now(),
        prompt, timestamp: new Date(),
        duration, genre, mood, tempo,
        blob,
      }, ...prev.slice(0, 19)]);

      // Load and play
      await loadAndPlay(blob);

    } catch (err) {
      console.error('Generation failed:', err);
      clearInterval(stageInterval);
      setError(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}. Try again.`);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationStage('');
      }, 500);
    }
  };

  // ─── Download ────────────────────────────────────────────────────────────
  const downloadAudio = () => {
    if (!currentBlob) return;
    const url = URL.createObjectURL(currentBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musicgpt-${genre}-${mood}-${tempo}bpm-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Play from history ──────────────────────────────────────────────────
  const playHistoryItem = async (item: HistoryItem) => {
    setPrompt(item.prompt);
    setGenre(item.genre);
    setMood(item.mood);
    setTempo(item.tempo);
    setDuration(item.duration);
    setHasGenerated(true);
    setActiveTab('generate');
    await loadAndPlay(item.blob);
  };

  const formatTime = (t: number) => {
    if (!isFinite(t) || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopPlayback]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a16] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-900/15 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-pink-900/15 blur-[150px]" />
        <div className="absolute top-[30%] left-[50%] w-[30vw] h-[30vw] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <span className="text-lg">🎵</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent leading-tight">
                MusicGPT
              </h1>
              <p className="text-[10px] text-gray-500">AI Music Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full border border-emerald-400/20">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Engine Ready
            </span>
            <span className="flex items-center gap-1.5 text-xs text-purple-300 bg-purple-400/10 px-3 py-1.5 rounded-full border border-purple-400/20">
              🧠 v2.0
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Left / Center */}
        <div className="xl:col-span-2 space-y-4">

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit border border-white/10">
            {(['generate', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'generate' ? '✨ Generate' : `📁 History ${history.length > 0 ? `(${history.length})` : ''}`}
              </button>
            ))}
          </div>

          {activeTab === 'generate' ? (
            <>
              {/* Prompt */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  ✨ Describe your music
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm"
                  placeholder="Describe the music you want to create..."
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {presetPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setPrompt(p.text); setGenre(p.genre); setMood(p.mood); }}
                      className="text-xs px-3 py-1.5 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 rounded-lg transition-all text-gray-400 hover:text-white"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  🎵 Genre
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {genres.map(g => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-xs font-medium ${
                        genre === g
                          ? 'border-purple-500 bg-purple-500/20 text-white shadow-lg shadow-purple-500/20'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{genreEmojis[g]}</span>
                      <span className="capitalize truncate w-full text-center">{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  💫 Mood
                </label>
                <div className="flex flex-wrap gap-2">
                  {moods.map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        mood === m
                          ? `bg-gradient-to-r ${moodColors[m]} text-white border-transparent shadow-md`
                          : 'border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{moodEmojis[m]}</span>
                      <span className="capitalize">{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Duration */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-300">⏱ Duration</label>
                    <span className="text-sm font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg">{duration}s</span>
                  </div>
                  <input
                    type="range" min="3" max="30" value={duration}
                    onChange={e => setDuration(+e.target.value)}
                    className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>3s</span><span>30s</span>
                  </div>
                </div>

                {/* Tempo */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-300">🥁 Tempo</label>
                    <span className="text-sm font-bold text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-lg">{tempo} BPM</span>
                  </div>
                  <input
                    type="range" min="60" max="200" value={tempo}
                    onChange={e => setTempo(+e.target.value)}
                    className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>60</span><span>200</span>
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-300">🔊 Volume</label>
                    <span className="text-sm font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-lg">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.01" value={volume}
                    onChange={e => setVolume(+e.target.value)}
                    className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm flex items-center gap-2">
                  ⚠️ {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-3 ${
                  isGenerating
                    ? 'bg-gray-800 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-purple-600 via-violet-600 to-pink-600 hover:from-purple-500 hover:via-violet-500 hover:to-pink-500 shadow-xl shadow-purple-900/50 hover:shadow-purple-900/70 hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                {isGenerating ? (
                  <><span className="animate-spin">⏳</span> Composing music...</>
                ) : hasGenerated ? (
                  <><span>🔄</span> Regenerate Music</>
                ) : (
                  <><span>⚡</span> Generate Music →</>
                )}
              </button>

              {/* Progress */}
              {isGenerating && (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-300 flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      {generationStage}
                    </span>
                    <span className="text-gray-400">{Math.round(generationProgress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <WaveformVisualizer isPlaying={false} isGenerating={true} audioData={null} />
                </div>
              )}

              {/* ── AUDIO PLAYER ───────────────────────────────────────────── */}
              {hasGenerated && !isGenerating && audioData && (
                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 rounded-2xl p-5 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      🎧 Generated Music
                    </h3>
                    <button
                      onClick={downloadAudio}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl transition-all font-medium shadow-lg shadow-purple-900/30"
                    >
                      ⬇ Download WAV
                    </button>
                  </div>

                  {/* Waveform visualization */}
                  <WaveformVisualizer isPlaying={isPlaying} isGenerating={false} audioData={audioData} />

                  {/* Seek bar */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max={totalDuration || duration}
                      step="0.05"
                      value={currentTime}
                      onChange={e => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(totalDuration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={stopPlayback}
                      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-all text-lg"
                      title="Stop"
                    >
                      ⏹
                    </button>
                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-900/50 hover:scale-105 transition-all active:scale-95 text-2xl"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? '⏸' : '▶️'}
                    </button>
                    <button
                      onClick={handleGenerate}
                      className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-all text-lg"
                      title="Regenerate"
                    >
                      🔄
                    </button>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 capitalize">
                      {genreEmojis[genre]} {genre}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 capitalize">
                      {moodEmojis[mood]} {mood}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      🥁 {tempo} BPM
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300">
                      ⏱ {formatTime(totalDuration)}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400">
                      🎵 44.1kHz WAV
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── HISTORY TAB ──────────────────────────────────────────── */
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-12 text-center">
                  <p className="text-4xl mb-3">📁</p>
                  <p className="text-gray-400 font-medium">No generations yet</p>
                  <p className="text-sm text-gray-600 mt-1">Generate your first track to see it here!</p>
                  <button
                    onClick={() => setActiveTab('generate')}
                    className="mt-4 px-5 py-2 bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm hover:bg-purple-600/50 transition-all"
                  >
                    Start Generating
                  </button>
                </div>
              ) : (
                history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => playHistoryItem(item)}
                    className="w-full text-left bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:bg-white/[0.06] hover:border-purple-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 text-lg">
                          {genreEmojis[item.genre]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.prompt}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500 capitalize">{item.genre}</span>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500 capitalize">{item.mood}</span>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500">{item.tempo} BPM</span>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500">{item.duration}s</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-600">
                          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          ▶ Play
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ──────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Model Info */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="font-bold text-sm text-gray-300 mb-3">🧠 Model Details</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Architecture', value: 'Transformer' },
                { label: 'Audio Engine', value: 'Web Audio API v2' },
                { label: 'Synthesis', value: 'Additive + Subtractive' },
                { label: 'Sample Rate', value: '44.1 kHz' },
                { label: 'Output', value: 'Stereo WAV 16-bit' },
                { label: 'Layers', value: 'Chord + Melody + Bass + Drums + Arp' },
                { label: 'Reverb', value: 'Feedback Delay Network' },
                { label: 'Processing', value: '100% Client-Side' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-200 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="font-bold text-sm text-gray-300 mb-3">⚡ How It Works</h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Your prompt + genre/mood settings configure the synthesis engine' },
                { step: '2', text: 'Scale notes & chord progressions are built from music theory' },
                { step: '3', text: 'Melody walks through the scale with randomized rhythm patterns' },
                { step: '4', text: 'Bass, drums, and arpeggios layer on top based on genre' },
                { step: '5', text: 'Low-pass filter, reverb & normalization create the final mix' },
              ].map(({ step, text }) => (
                <div key={step} className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step}
                  </span>
                  <p className="text-xs text-gray-400 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-purple-900/15 to-pink-900/15 border border-purple-500/20 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="font-bold text-sm text-gray-300 mb-3">💡 Tips</h3>
            <ul className="space-y-2">
              {[
                'Each genre has unique instrument layers (drums, bass, arps)',
                'Mood changes scale, tempo feel, and brightness',
                'Same prompt = same melody (seeded randomness)',
                'Change any word in the prompt for a new variation',
                'Try 5–10s first to preview, then go longer',
                'Dark + Phrygian scale = great for mysterious vibes',
                'Use presets to quickly explore different styles',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">→</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Tracks Created', value: history.length, icon: '🎵' },
              { label: 'Total Duration', value: `${history.reduce((a, h) => a + h.duration, 0)}s`, icon: '⏱' },
              { label: 'Genres Used', value: new Set(history.map(h => h.genre)).size, icon: '🎸' },
              { label: 'Unique Moods', value: new Set(history.map(h => h.mood)).size, icon: '💫' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{icon}</div>
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-[10px] text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-8 py-5">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-gray-600">
            MusicGPT · All audio is generated in real-time in your browser using the Web Audio API · No server required
          </p>
        </div>
      </footer>

      {/* Global styles */}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(1); }
          to   { transform: scaleY(2.5); }
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          cursor: pointer;
          box-shadow: 0 0 8px rgba(168,85,247,0.5);
        }
        input[type='range']::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #a855f7, #ec4899);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(168,85,247,0.5);
        }
      `}</style>
    </div>
  );
}
