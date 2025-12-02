import { useEffect, useState } from "react";
import "../styles/SplashScreen.css";

export default function SplashScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // تقدّم تدريجي للـ progress (أجمل بكثير من الانتظار الساكن)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1.5;
      });
    }, 45);

    // انتهاء بعد 3.2 ثانية
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 1200); // مدة الـ fade-out
    }, 3200);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [onFinish]);

  return (
    <div className={`splash-container ${fadeOut ? "fade-out" : ""}`}>
      {/* خلفية ديناميكية متدرجة + تأثير Nebula */}
      <div className="nebula-bg"></div>
      <div className="nebula-bg nebula-2"></div>

      {/* الجسيمات المتحركة */}
      <div className="particles-layer">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="particle-glow"
            style={{
              "--x": Math.random() * 200 - 100 + "vw",
              "--y": Math.random() * 200 - 100 + "vh",
              "--size": Math.random() * 6 + 2 + "px",
              "--delay": Math.random() * 20 + "s",
              "--duration": Math.random() * 30 + 20 + "s",
            }}
          />
        ))}
      </div>

      {/* المحتوى الرئيسي */}
      <div className="splash-content">
        <h1 className="splash-title">
          <span className="glitch" data-text="AUDIO">AUDIO</span>
          <span className="glitch" data-text="VISUALIZER">VISUALIZER</span>
        </h1>

        <p className="splash-subtitle">
          Vivez la musique <span className="highlight">autrement</span>
        </p>

        {/* Progress Bar عصري */}
        <div className="progress-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
          >
            <div className="progress-glow"></div>
          </div>
        </div>

        {/* موجات صوتية متجاوبة */}
        <div className="soundwaves-responsive">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="wave-bar"
              style={{
                "--delay": `${i * 0.15}s`,
                "--height": `${40 + i * 15}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* شعار صغير في الأسفل */}
      <div className="splash-footer">
        <span>Powered by React Three Fiber</span>
      </div>
    </div>
  );
}