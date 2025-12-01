import { useState } from "react";
import SplashScreen from "./components/SplashScreen";
import AudioSelector from "./components/AudioSelector";
import ThreeVisualizer from "./components/ThreeVisualizer";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [audioFile, setAudioFile] = useState(null);
  const [audioType, setAudioType] = useState("default"); // ← إضافة

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!audioFile) {
    return (
      <AudioSelector 
        onSelect={(file, type) => {
          setAudioFile(file);
          setAudioType(type); // ← تخزين النوع
        }} 
      />
    );
  }

  return <ThreeVisualizer audioFile={audioFile} type={audioType} />; // ← تمرير النوع
}

export default App;