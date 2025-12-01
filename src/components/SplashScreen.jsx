// SplashScreen.jsx - النسخة المحسنة
import { useEffect, useState } from "react";
import "../styles/SplashScreen.css";

export default function SplashScreen({ onFinish }) {
  const [particles, setParticles] = useState([]);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // إنشاء جسيمات عشوائية
    const createParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 20 + 5,
          duration: Math.random() * 20 + 10,
          delay: Math.random() * 10
        });
      }
      setParticles(newParticles);
    };

    createParticles();

    // الانتقال التلقائي بعد 3 ثواني
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        onFinish();
      }, 1000);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`splash-container ${fadeOut ? 'fade-out' : ''}`}>
      {/* الجسيمات الخلفية */}
      <div className="particles">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      {/* المحتوى الرئيسي */}
      <div className="splash-content">
        <h1 className="splash-title">Audio Visualizer</h1>
        <p className="splash-subtitle">Vivez la musique autrement</p>
        
        {/* Loader محسن */}
        <div className="loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      {/* شعارات إضافية */}
      <div className="soundwaves">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i}
            className="soundwave"
            style={{
              animationDelay: `${i * 0.2}s`,
              height: `${30 + i * 10}px`
            }}
          />
        ))}
      </div>
    </div>
  );
}