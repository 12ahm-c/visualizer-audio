import { useEffect, useRef, useState } from "react";
import useAudioAnalyzer from "../hooks/useAudioAnalyzer";

export default function Visualizer({ audioFile, type }) {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  const [audioObj, setAudioObj] = useState(null);
  const [mode, setMode] = useState("bars");
  const [particlesCount, setParticlesCount] = useState(50);
  const [glowIntensity, setGlowIntensity] = useState(20);
  const [theme, setTheme] = useState("classic");
  const [isPlaying, setIsPlaying] = useState(false);

  const particles = useRef([]);

  // دالة لاختيار الإعدادات حسب النوع
  const getSettingsByType = (type) => {
    switch ((type || "").toLowerCase()) {
      case "electronic":
      case "edm":
      case "électronique":
        return { mode: "particles", theme: "neon", glowIntensity: 25, particlesCount: 150 };
      case "rock":
      case "metal":
        return { mode: "bars", theme: "dark", glowIntensity: 15, particlesCount: 80 };
      case "classical":
      case "orchestral":
      case "ambient":
        return { mode: "waves", theme: "sunset", glowIntensity: 8, particlesCount: 50 };
      case "hip-hop":
      case "rap":
        return { mode: "circles", theme: "rainbow", glowIntensity: 20, particlesCount: 100 };
      case "pop":
      default:
        return { mode: "bars", theme: "classic", glowIntensity: 20, particlesCount: 60 };
    }
  };

  // عند تحميل ملف أو تغيير النوع → اعتمد الإعدادات
  useEffect(() => {
    if (!audioFile) return;
    const s = getSettingsByType(type);
    setMode(s.mode);
    setTheme(s.theme);
    setGlowIntensity(s.glowIntensity);
    setParticlesCount(s.particlesCount);

    const audio = new Audio(URL.createObjectURL(audioFile));
    audioRef.current = audio;
    setAudioObj(audio);
    audio.play();
    setIsPlaying(true);

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioFile, type]);

  const { frequencyData, amplitude } = useAudioAnalyzer(audioObj);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const createParticles = () => {
      particles.current = [];
      for (let i = 0; i < particlesCount; i++) {
        particles.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 4 + 1,
          color: `hsl(${Math.random() * 360},100%,60%)`,
          dx: (Math.random() - 0.5) * 2,
          dy: (Math.random() - 0.5) * 2
        });
      }
    };
    createParticles();

    const drawParticles = () => {
      particles.current.forEach(p => {
        p.x += p.dx + amplitude * 5;
        p.y += p.dy + amplitude * 5;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + amplitude * 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = glowIntensity;
        ctx.fill();
      });
    };

    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (frequencyData.length > 0) {
        switch (mode) {
          case "bars":
            drawBars(ctx, canvas, frequencyData, glowIntensity, theme);
            break;
          case "circles":
            drawCircles(ctx, canvas, frequencyData, glowIntensity, theme);
            break;
          case "waves":
            drawWaves(ctx, canvas, frequencyData, glowIntensity, theme);
            break;
          case "particles":
            // In particles mode we might skip bars/circles/waves drawing
            break;
          default:
            drawBars(ctx, canvas, frequencyData, glowIntensity, theme);
        }
      }

      drawParticles();
      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener("resize", resize);
  }, [frequencyData, mode, amplitude, glowIntensity, particlesCount, theme]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };
  const stopAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };
  const changeVolume = (e) => {
    if (!audioRef.current) return;
    audioRef.current.volume = e.target.value;
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, background: "black", zIndex: 1 }}
      />
      <div style={{
        position: "fixed",
        top: 20,
        left: 20,
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        background: "rgba(0,0,0,0.4)",
        padding: "10px 15px",
        borderRadius: "12px"
      }}>
        {/* Buttons for manual override if user wants */}
        <div style={{ display: "flex", gap: "5px" }}>
          <button onClick={() => setMode("bars")}>Bars</button>
          <button onClick={() => setMode("circles")}>Circles</button>
          <button onClick={() => setMode("waves")}>Waves</button>
          <button onClick={() => setMode("particles")}>Particles</button>
        </div>

        <div style={{ display: "flex", gap: "5px" }}>
          <button onClick={togglePlay}>{isPlaying ? "Pause" : "Play"}</button>
          <button onClick={stopAudio}>Stop</button>
        </div>

        <label>Volume:
          <input type="range" min="0" max="1" step="0.01" defaultValue="1" onChange={changeVolume}/>
        </label>

        <label>Glow:
          <input type="range" min="0" max="50" step="1" value={glowIntensity} onChange={(e)=>setGlowIntensity(Number(e.target.value))}/>
        </label>

        <label>Particles:
          <input type="range" min="0" max="300" step="1" value={particlesCount} onChange={(e)=>setParticlesCount(Number(e.target.value))}/>
        </label>

        {/* Theme override */}
        <select value={theme} onChange={(e)=>setTheme(e.target.value)}>
          <option value="classic">Classic</option>
          <option value="neon">Neon</option>
          <option value="dark">Dark</option>
          <option value="sunset">Sunset</option>
          <option value="rainbow">Rainbow</option>
        </select>
      </div>
    </>
  );
}

// الرسم: Bars
function drawBars(ctx, canvas, data, glowIntensity, theme) {
  const barWidth = canvas.width / 60;
  const centerY = canvas.height / 2;
  for (let i = 0; i < 60; i++) {
    const value = data[i];
    const height = value * 1.5;
    const x = i * barWidth;
    const y = centerY - height / 2;
    let color, shadow;
    switch(theme) {
      case "sunset":
        color = `hsl(${i*3 + 20}, 90%, 60%)`;
        shadow = `hsl(${i*3 + 20}, 90%, 70%)`;
        break;
      case "ocean":
        color = `hsl(${i*2 + 180}, 80%, 50%)`;
        shadow = `hsl(${i*2 + 180}, 80%, 60%)`;
        break;
      case "rainbow":
        color = `hsl(${(value * 2 + i*5) % 360}, 100%, 60%)`;
        shadow = color;
        break;
      case "dark":
        color = `hsl(${(i*6 + 220)%360}, 50%, 40%)`;
        shadow = `hsl(${(i*6 + 220)%360}, 50%, 50%)`;
        break;
      case "neon":
        color = `hsl(${(i*10)%360}, 100%, 70%)`;
        shadow = color;
        break;
      default:
        color = `hsl(${i * 6}, 100%, 60%)`;
        shadow = `hsl${i * 6}, 100%, 80%)`;
    }
    ctx.fillStyle = color;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = glowIntensity;
    ctx.fillRect(x, y, barWidth - 2, height);
  }
}

function drawCircles(ctx, canvas, data, glowIntensity, theme) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  for (let i = 0; i < 30; i++) {
    const value = data[i];
    let color, shadow;
    switch(theme) {
      case "sunset":
        color = `hsl(${i*6 + 20}, 90%, 60%)`;
        shadow = `hsl(${i*6 + 20}, 90%, 70%)`;
        break;
      case "ocean":
        color = `hsl${i*4 + 180}, 80%, 50%)`;
        shadow = `hsl${i*4 + 180}, 80%, 60%)`;
        break;
      case "rainbow":
        color = `hsl${(value * 3 + i*5) % 360},100%,60%)`;
        shadow = color;
        break;
      default:
        color = `hsl${i * 12},100%,60%)`;
        shadow = `hsl${i *12},100%,80%)`;
    }
    ctx.beginPath();
    ctx.arc(centerX, centerY, value, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = glowIntensity + 5;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawWaves(ctx, canvas, data, glowIntensity, theme) {
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  for (let i = 0; i < data.length; i++) {
    const x = (i / data.length) * canvas.width;
    const y = canvas.height / 2 + data[i];
    ctx.lineTo(x, y);
  }
  let color;
  switch(theme) {
    case "sunset": color = "#ff8c42"; break;
    case "ocean": color = "#00b4d8"; break;
    case "rainbow": color = `hsl(${Math.random()*360},100%,60%)`; break;
    case "dark": color = "#222"; break;
    default: color = "#38bdf8";
  }
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = glowIntensity;
  ctx.lineWidth = 2;
  ctx.stroke();
}