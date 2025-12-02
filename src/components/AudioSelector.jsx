// AudioSelector.jsx - Responsive Version
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
  const [isMobile, setIsMobile] = useState(false);
  const dropRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      // Reduce number of notes on mobile
      const noteCount = isMobile ? 4 : 8;
      
      for (let i = 0; i < noteCount; i++) {
        newNotes.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 10,
          note: ["🎵", "🎶", "🎧", "🎼", "🎹", "🎷", "🎺", "🎸"][i % 8],
          duration: 8 + Math.random() * 4
        });
      }
      setNotes(newNotes);
    };
    createNotes();
  }, [isMobile]);

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
          const step = Math.max(1, Math.floor(channelData.length / 1000));
          for (let i = 0; i < channelData.length; i += step) {
            sum += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sum / (channelData.length / step));

          let peaks = 0;
          for (let i = 1; i < channelData.length; i += 10) { // Skip some samples for performance
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

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
            animationDuration: `${note.duration}s`
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

      <div 
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
        onClick={() => document.querySelector('.custom-file-upload input')?.click()}
      >
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
          <p>📊 Taille: {formatFileSize(audioFile.size)}</p>
          <p>🎯 Type détecté:</p>
          <div className={`type-badge ${songType}`}>
            {getTypeIcon(songType)} {getTypeLabel(songType)}
          </div>
        </div>
      )}

      {ready && (
        <div className="start-btn-container">
          <button 
            className="start-btn" 
            onClick={handleGoVisualizer}
            aria-label="Démarrer la visualisation"
          >
            Démarrer la visualisation
          </button>
        </div>
      )}

      {!audioFile && (
        <p className="drag-hint">
          Déposez votre fichier audio ici pour commencer l'expérience
        </p>
      )}
    </div>
  );
}