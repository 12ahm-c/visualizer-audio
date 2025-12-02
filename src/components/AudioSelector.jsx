// AudioSelector.jsx - النسخة المحسنة
import { useState, useRef, useEffect } from "react";
import "../styles/AudioSelector.css";

export default function AudioSelector({ onSelect }) {
  const [audioFile, setAudioFile] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [songType, setSongType] = useState("default");
  const [ready, setReady] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [notes, setNotes] = useState([]);
  const dropRef = useRef(null);

  useEffect(() => {
    const div = dropRef.current;
    if (!div) return;

    const handleDragOver = (e) => {
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = () => {
      setDragOver(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("audio")) processFile(file);
    };

    div.addEventListener("dragover", handleDragOver);
    div.addEventListener("dragleave", handleDragLeave);
    div.addEventListener("drop", handleDrop);

    return () => {
      div.removeEventListener("dragover", handleDragOver);
      div.removeEventListener("dragleave", handleDragLeave);
      div.removeEventListener("drop", handleDrop);
    };
  }, []);

  useEffect(() => {
    const createNotes = () => {
      const newNotes = [];
      for (let i = 0; i < 8; i++) {
        newNotes.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 10,
          note: ["🎵", "🎶", "🎧", "🎼", "🎹", "🎷", "🎺", "🎸"][i % 8]
        });
      }
      setNotes(newNotes);
    };
    createNotes();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("audio")) processFile(file);
  };

  const processFile = async (file) => {
    setAudioFile(file);
    setShowInfo(true);
    setReady(false);

    const { name } = file;
    const parts = name.replace(/\.[^/.]+$/, "").split(" - ");
    setSongTitle(parts[0] || name);
    setArtistName(parts[1] || "Unknown Artist");

    const type = await analyzeAudio(file);
    setSongType(type);

    setReady(true);
  };

  const analyzeAudio = (file) => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          const channelData = audioBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < channelData.length; i += 1000) {
            sum += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sum / (channelData.length / 1000));

          let peaks = 0;
          for (let i = 1; i < channelData.length; i++) {
            if (channelData[i] > 0.9 && channelData[i - 1] <= 0.9) peaks++;
          }
          const durationSec = audioBuffer.duration;
          const bpm = (peaks / durationSec) * 60;

          if (bpm > 120 && rms > 0.05) resolve("electronic");
          else if (bpm > 90 && bpm <= 120) resolve("poprock");
          else if (bpm > 140) resolve("rock");
          else resolve("classical");
        } catch (error) {
          console.log("Error analyzing audio:", error);
          resolve("electronic");
        }
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleGoVisualizer = () => {
    if (audioFile) {
      onSelect(audioFile, songType);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      electronic: "Électronique",
      poprock: "Pop/Rock",
      classical: "Classique",
      rock: "Rock",
      default: "Inconnu"
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      electronic: "⚡",
      poprock: "🌟",
      classical: "🎻",
      rock: "🤘",
      default: "🎵"
    };
    return icons[type] || "🎵";
  };

  return (
    <div className="audio-selector-container" ref={dropRef}>
      {/* نوتات موسيقية عائمة */}
      {notes.map((note) => (
        <div
          key={note.id}
          className="music-note"
          style={{
            left: `${note.left}%`,
            animationDelay: `${note.delay}s`,
            animationDuration: `${8 + note.id * 2}s`
          }}
        >
          {note.note}
        </div>
      ))}

      {/* موجات في الأسفل */}
      <div className="wave-container">
        <div className="wave"></div>
      </div>

      <h2>🎵 Vivez la musique autrement</h2>

      <div className={`upload-area ${dragOver ? 'drag-over' : ''}`}>
        <div className="upload-icon">
          {dragOver ? "🎧" : "🎵"}
        </div>
        <div className="upload-text">
          Glissez-déposez votre fichier audio ici
        </div>
        <div className="upload-subtext">
          ou cliquez sur le bouton ci-dessous
        </div>
      </div>

      <div className="file-input-container">
        <label className="custom-file-upload">
          <span>📁 Sélectionner un fichier audio</span>
          <input type="file" accept="audio/*,.m4a,.caf,.mp3" onChange={handleFileChange} />
        </label>
      </div>

      {audioFile && showInfo && (
        <div className="song-info">
          <h3>{songTitle}</h3>
          <p>🎤 {artistName}</p>
          <p>📊 Taille: {(audioFile.size / (1024 * 1024)).toFixed(2)} MB</p>
          <p>🎯 Type détecté:</p>
          <div className={`type-badge ${songType}`}>
            {getTypeIcon(songType)} {getTypeLabel(songType)}
          </div>
        </div>
      )}

      {ready && (
        <button className="start-btn" onClick={handleGoVisualizer}>
          Démarrer la visualisation
        </button>
      )}

      {!audioFile && (
        <p className="drag-hint">
          Déposez votre fichier audio ici pour commencer l'expérience
        </p>
      )}
    </div>
  );
}