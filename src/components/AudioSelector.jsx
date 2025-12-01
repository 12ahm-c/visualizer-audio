import { useState, useRef, useEffect } from "react";
import "../styles/AudioSelector.css";

export default function AudioSelector({ onSelect }) {
  const [audioFile, setAudioFile] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songType, setSongType] = useState("default"); // نوع الأغنية
  const [ready, setReady] = useState(false); // جاهزية الانتقال للـ Visualizer
  const dropRef = useRef(null);

  // التعامل مع سحب الملفات
  useEffect(() => {
    const div = dropRef.current;
    if (!div) return;

    const handleDragOver = (e) => e.preventDefault();
    const handleDrop = (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("audio")) processFile(file);
    };

    div.addEventListener("dragover", handleDragOver);
    div.addEventListener("drop", handleDrop);

    return () => {
      div.removeEventListener("dragover", handleDragOver);
      div.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("audio")) processFile(file);
  };

  const processFile = async (file) => {
    setAudioFile(file);
    setShowInfo(true);
    setReady(false);

    // استخراج اسم الأغنية من اسم الملف
    const { name } = file;
    const parts = name.replace(/\.[^/.]+$/, "").split(" - ");
    setSongTitle(parts[0] || name);
    setArtistName(parts[1] || "Unknown Artist");

    // تحليل الأغنية لتحديد النوع
    const type = await analyzeAudio(file);
    setSongType(type);

    // بعد التحليل، يصبح جاهزًا للانتقال للـ Visualizer
    setReady(true);
  };

  const analyzeAudio = (file) => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async (e) => {
        const arrayBuffer = e.target.result;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // تحليل الطاقة (RMS)
        const channelData = audioBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < channelData.length; i += 1000) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / (channelData.length / 1000));

        // تحليل BPM تقريبي
        let peaks = 0;
        for (let i = 1; i < channelData.length; i++) {
          if (channelData[i] > 0.9 && channelData[i - 1] <= 0.9) peaks++;
        }
        const durationSec = audioBuffer.duration;
        const bpm = (peaks / durationSec) * 60;

        // قاعدة بسيطة لتحديد النوع
        if (bpm > 120 && rms > 0.05) resolve("electronic");
        else if (bpm > 90) resolve("poprock");
        else resolve("classical");
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleGoVisualizer = () => {
    if (audioFile) {
      onSelect(audioFile, songType);
    }
  };

  return (
    <div className="audio-selector-container" ref={dropRef}>
      <h2>🎵 Glissez-déposez votre musique ou sélectionnez un fichier</h2>

      <label className="custom-file-upload">
        Sélectionner un fichier audio
        <input type="file" accept="audio/*" onChange={handleFileChange} />
      </label>

      {audioFile && showInfo && (
        <div className="song-info">
          <h3>{songTitle}</h3>
          <p>{artistName}</p>
          <p>⚡ Type: {songType}</p>
        </div>
      )}

      {ready && (
        <button className="start-btn" onClick={handleGoVisualizer}>
          Démarrer la visualisation
        </button>
      )}

      {!audioFile && (
        <p className="drag-hint">Déposez votre fichier audio ici pour commencer</p>
      )}
    </div>
  );
}