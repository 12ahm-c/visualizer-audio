import { useEffect, useRef, useState } from "react";

// نستقبل Audio object بدل audioFile
export default function useAudioAnalyzer(audio) {
  const analyserRef = useRef(null);
  const [amplitude, setAmplitude] = useState(0);
  const [frequencyData, setFrequencyData] = useState([]);

  useEffect(() => {
    if (!audio) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      setAmplitude(sum / bufferLength / 255);
      setFrequencyData([...dataArray]);
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      audioContext.close();
    };
  }, [audio]);

  return { amplitude, frequencyData };
}