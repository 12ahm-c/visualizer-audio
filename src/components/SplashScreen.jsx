import { useEffect } from "react";
import "../styles/SplashScreen.css";

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish(); // الانتقال للمرحلة التالية
    }, 3000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-container">
      <div className="splash-content">
        <h1 className="splash-title">Audio Visualizer</h1>
        <p className="splash-subtitle">Vivez la musique autrement</p>
        <div className="loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}