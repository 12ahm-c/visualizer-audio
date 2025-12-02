import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

const useAudioAnalyzer = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(256));
  const [amplitude, setAmplitude] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);
  const [energy, setEnergy] = useState(0);

  const setupAudio = useCallback((audioElement) => {
    if (!audioElement) return;

    const context = new (window.AudioContext || window.webkitAudioContext)();
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 1024;
    analyserNode.smoothingTimeConstant = 0.85;

    const source = context.createMediaElementSource(audioElement);
    source.connect(analyserNode);
    analyserNode.connect(context.destination);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    setAudioContext(context);
    setAnalyser(analyserNode);

    const update = () => {
      if (!analyserNode) return;

      analyserNode.getByteFrequencyData(dataArray);
      const newData = new Uint8Array(dataArray);
      setFrequencyData(newData);
      
      const avg = newData.reduce((a, b) => a + b) / newData.length;
      setAmplitude(avg / 255);
      
      const bassValue = newData.slice(0, 40).reduce((a, b) => a + b) / 40 / 255;
      const midValue = newData.slice(40, 200).reduce((a, b) => a + b) / 160 / 255;
      const trebleValue = newData.slice(200, 400).reduce((a, b) => a + b) / 200 / 255;
      
      setBass(bassValue);
      setMid(midValue);
      setTreble(trebleValue);
      
      const totalEnergy = (bassValue * 0.4 + midValue * 0.35 + trebleValue * 0.25);
      setEnergy(totalEnergy);
      
      requestAnimationFrame(update);
    };

    update();
    setIsPlaying(true);

    return () => {
      source.disconnect();
      analyserNode.disconnect();
    };
  }, []);

  return { setupAudio, frequencyData, amplitude, isPlaying, audioContext, bass, mid, treble, energy };
};

const ElectronicVisualizer = ({ frequencyData, amplitude, bass, mid, treble, energy }) => {
  const groupRef = useRef();
  const gridRef = useRef();
  const towersRef = useRef([]);
  const ringsRef = useRef([]);

  const [towers] = useState(() => {
    const arr = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 9 + Math.random() * 5;
      arr.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, baseHeight: 3 + Math.random() * 6 });
    }
    return arr;
  });

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.15 + bass * 0.3;

    if (gridRef.current) {
      gridRef.current.material.emissiveIntensity = 0.6 + bass * 3;
      gridRef.current.position.y = Math.sin(t * 8) * bass * 0.08;
    }

    towers.forEach((tower, i) => {
      const mesh = towersRef.current[i];
      if (!mesh) return;
      const freq = frequencyData[i * 16] || 0;
      const height = tower.baseHeight + bass * 10 + (freq / 255) * 12;
      mesh.scale.y = Math.max(0.5, height);
      mesh.position.y = height / 2;
      mesh.material.emissiveIntensity = 2.5 + energy * 8;
      const hue = (t * 40 + i * 25 + bass * 120) % 360;
      mesh.material.color.setHSL(hue / 360, 1, 0.5);
      mesh.material.emissive.setHSL(hue / 360, 1, 0.7);
    });

    ringsRef.current.forEach((ring, i) => {
      if (!ring) return;
      ring.rotation.z = t * (2 + i * 0.8) * (i % 2 === 0 ? 1 : -1);
      ring.scale.setScalar(1 + energy * 2 + treble * 1.5);
    });

    if (bass > 0.8) {
      const shake = Math.sin(t * 20) * bass * 0.4;
      groupRef.current.position.x = shake;
      groupRef.current.position.z = shake * 0.7;
    }
  });

  return (
    <group position={[0, 0, 12]} scale={0.65}>
      <group ref={groupRef}>

        <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[300, 300, 100, 100]} />
          <meshPhysicalMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1.5} wireframe transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>

        <mesh>
          <icosahedronGeometry args={[3.5, 1]} />
          <meshPhysicalMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={3 + energy * 8} metalness={1} roughness={0} clearcoat={1} transmission={0.9} thickness={5} transparent opacity={0.75} />
        </mesh>

        {towers.map((tower, i) => (
          <mesh key={i} ref={el => towersRef.current[i] = el} position={[tower.x, tower.baseHeight / 2, tower.z]}>
            <boxGeometry args={[1.8, 1, 1.8]} />
            <meshPhysicalMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={3} metalness={0.95} roughness={0.05} />
          </mesh>
        ))}

        {[1, 1.8, 2.7, 3.8, 5, 6.5, 8.5, 11].map((r, i) => (
          <mesh key={i} ref={el => ringsRef.current[i] = el} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.18, 12, 160]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.85} />
          </mesh>
        ))}

        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={80} array={new Float32Array(80 * 3).map(() => (Math.random() - 0.5) * 80)} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.35} color="#00ffff" transparent opacity={0.7} blending={THREE.AdditiveBlending} sizeAttenuation />
        </points>

        {[25, 45, 70].map((r, i) => (
          <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r, r + 5, 128]} />
            <meshBasicMaterial color="#0044ff" transparent opacity={0.12 - i * 0.03} side={THREE.DoubleSide} />
          </mesh>
        ))}

        <pointLight position={[0, 15, 0]} intensity={4} color="#00ffff" distance={80} />
        <pointLight position={[0, -5, 0]} intensity={3} color="#ff00ff" distance={70} />
        <pointLight position={[30, 20, 30]} intensity={4} color="#ff00ff" />
        <pointLight position={[-30, 20, -30]} intensity={4} color="#00ffff" />

      </group>
    </group>
  );
};
const RockVisualizer = ({ frequencyData, amplitude, bass, mid, treble, energy }) => {
  const groupRef = useRef();
  const lavaRef = useRef();
  const rocksRef = useRef([]);
  const fireRef = useRef([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.25 + bass * 0.8;

    if (bass > 0.75) {
      const quake = Math.sin(t * 60) * bass * 0.7;
      groupRef.current.position.x = quake;
      groupRef.current.position.z = quake * 0.6;
      groupRef.current.position.y = Math.abs(quake) * 0.4;
    }

    if (lavaRef.current) {
      lavaRef.current.scale.y = 1 + bass * 6 + energy * 2.5;
      lavaRef.current.position.y = lavaRef.current.scale.y / 2 - 2;
      lavaRef.current.material.emissiveIntensity = 3 + bass * 8 + energy * 6;
    }

    rocksRef.current.forEach((rock, i) => {
      if (!rock) return;
      const freq = frequencyData[i * 12] || 0;
      const explosion = bass * 8 + (freq / 255) * 15;
      rock.scale.setScalar(1 + explosion * 0.09);
      rock.position.y = explosion * 0.4;
      rock.material.emissiveIntensity = 3 + energy * 10;
    });

    fireRef.current.forEach((f) => {
      if (!f) return;
      f.position.y += 0.25 + bass * 1.8;
      if (f.position.y > 25) f.position.y = -8;
    });
  });

  return (
    <group position={[0, -2, 10]} scale={0.7}>
      <group ref={groupRef}>

        <mesh ref={lavaRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <circleGeometry args={[50, 128]} />
          <meshPhysicalMaterial color="#ff2200" emissive="#ff4400" emissiveIntensity={4} roughness={0.2} metalness={0.3} transparent opacity={0.92} />
        </mesh>

        {[...Array(16)].map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const dist = 8 + (i % 4) * 3;
          return (
            <mesh key={i} ref={el => rocksRef.current[i] = el} position={[Math.cos(angle) * dist, 0, Math.sin(angle) * dist]}>
              <dodecahedronGeometry args={[3.2 + Math.random() * 1.5, 1]} />
              <meshPhysicalMaterial color="#8B4513" emissive="#FF4500" emissiveIntensity={4} metalness={0.7} roughness={0.5} />
            </mesh>
          );
        })}

        {[...Array(120)].map((_, i) => (
          <mesh key={i} ref={el => fireRef.current[i] = el} position={[(Math.random()-0.5)*70, Math.random()*8-6, (Math.random()-0.5)*70]}>
            <sphereGeometry args={[0.25 + Math.random()*0.25, 8, 8]} />
            <meshBasicMaterial color={i%2===0?"#ff3300":"#ffff44"} emissiveIntensity={10} transparent opacity={0.85} />
          </mesh>
        ))}

        <mesh position={[0, 5, 0]}>
          <coneGeometry args={[9, 22, 40, 8, true]} />
          <meshPhysicalMaterial color="#000000" emissive="#ff1111" emissiveIntensity={6 + energy * 15} roughness={0.9} transparent opacity={0.88} />
        </mesh>

        <mesh position={[0, 12, 0]} scale={[22, 35, 22]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#0a0a0a" transparent opacity={0.45} depthWrite={false} />
        </mesh>

        <pointLight position={[0, 10, 0]} intensity={12} color="#ff2200" distance={100} />
        <pointLight position={[20, 15, 20]} intensity={8} color="#ff5500" />
        <pointLight position={[-20, 15, -20]} intensity={8} color="#ff8800" />

        <mesh>
          <sphereGeometry args={[200, 32, 32]} />
          <meshBasicMaterial color="#220000" side={THREE.BackSide} />
        </mesh>

      </group>
    </group>
  );
};

const PopRockVisualizer = ({ frequencyData, amplitude, bass, mid, treble, energy }) => {
  const groupRef = useRef();
  const stageRef = useRef();
  const crowdRef = useRef([]);
  const confettiRef = useRef([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.2 + bass * 0.4;
    groupRef.current.position.y = Math.sin(t * 3) * bass * 0.4;

    if (stageRef.current) {
      stageRef.current.material.emissiveIntensity = 1.5 + energy * 6;
      stageRef.current.scale.y = 1 + bass * 0.6;
    }

    crowdRef.current.forEach((p, i) => {
      if (!p) return;
      p.position.y = Math.abs(Math.sin(t * 12 + i) * bass * 3.5);
    });

    confettiRef.current.forEach((c) => {
      if (!c) return;
      c.rotation.x += 0.04 + treble * 0.12;
      c.rotation.y += 0.05 + mid * 0.1;
      c.position.y += (treble + energy) * 0.3;
      if (c.position.y > 30) c.position.y = -20;
    });
  });

  return (
    <group position={[0, -3, 14]} scale={0.68}>
      <group ref={groupRef}>

        <mesh ref={stageRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[28, 128]} />
          <meshPhysicalMaterial color="#ff0099" emissive="#ff00aa" emissiveIntensity={2.5} metalness={0.9} roughness={0.1} clearcoat={1} />
        </mesh>

        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const t = Date.now() * 0.001;
          return (
            <mesh key={i} position={[Math.cos(angle + t)*19, 8 + Math.sin(t*2 + i)*4, Math.sin(angle + t)*19]} rotation={[-Math.PI/2,0,0]}>
              <coneGeometry args={[5, 18, 8]} />
              <meshBasicMaterial color={i%3===0?"#ff0088":i%2===0?"#00ffff":"#ffff00"} transparent opacity={0.5} />
            </mesh>
          );
        })}

        {[...Array(80)].map((_, i) => {
          const angle = (i / 80) * Math.PI * 2;
          const dist = 23 + (i % 5)*3;
          return (
            <mesh key={i} ref={el => crowdRef.current[i]=el} position={[Math.cos(angle)*dist, 0, Math.sin(angle)*dist]}>
              <boxGeometry args={[0.9, 2.6, 0.9]} />
              <meshPhysicalMaterial color={new THREE.Color().setHSL((i*8)%360/360, 1, 0.6)} emissiveIntensity={1.8} />
            </mesh>
          );
        })}

        {[...Array(140)].map((_, i) => (
          <mesh key={i} ref={el => confettiRef.current[i]=el}
            position={[(Math.random()-0.5)*45, Math.random()*35-15, (Math.random()-0.5)*45]}
            rotation={[Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI]}>
            <boxGeometry args={[0.28, 0.28, 0.04]} />
            <meshBasicMaterial color={["#ff0088","#00ffff","#ffff00","#ff00ff","#00ff88"][i%5]} emissiveIntensity={7} />
          </mesh>
        ))}

        <mesh position={[0, 11, 0]}>
          <sphereGeometry args={[7.5, 48, 48]} />
          <meshPhysicalMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={4 + energy * 10} metalness={1} roughness={0} envMapIntensity={12} />
        </mesh>

        <Stars radius={130} depth={70} count={4500} factor={8} saturation={1} fade speed={4} />

        <pointLight position={[0, 20, 0]} intensity={10} color="#ff00ff" distance={90} />
        <pointLight position={[20, 15, 20]} intensity={8} color="#00ffff" />
        <pointLight position={[-20, 15, -20]} intensity={8} color="#ffff00" />
        <pointLight position={[0, 0, 0]} intensity={6} color="#ff0088" />

      </group>
    </group>
  );
};
const ClassicalVisualizer = ({ frequencyData, amplitude, bass, mid, treble, energy }) => {
  const groupRef = useRef();
  const chandeliersRef = useRef([]);
  const particlesRef = useRef([]);
  const pillarsRef = useRef([]);
  const floorRef = useRef();

  const [goldenNotes, setGoldenNotes] = useState([]);
  const [dustParticles, setDustParticles] = useState([]);

  useEffect(() => {
    const notes = [];
    for (let i = 0; i < 60; i++) {
      notes.push({
        position: [(Math.random() - 0.5) * 20, Math.random() * 15 + 5, (Math.random() - 0.5) * 20],
        velocity: [(Math.random() - 0.5) * 0.015, -0.01 - Math.random() * 0.02, (Math.random() - 0.5) * 0.015],
        rotationSpeed: Math.random() * 0.03,
        size: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2
      });
    }
    setGoldenNotes(notes);

    const dust = [];
    for (let i = 0; i < 300; i++) {
      dust.push({
        position: [(Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40],
        speed: 0.005 + Math.random() * 0.01
      });
    }
    setDustParticles(dust);
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    groupRef.current.rotation.y = time * 0.03;
    groupRef.current.position.y = Math.sin(time * 0.8) * 0.15 * mid;

    chandeliersRef.current.forEach((chandelier, i) => {
      if (!chandelier) return;
      chandelier.rotation.y = time * 0.2 + i;
      chandelier.position.y = 8 + Math.sin(time * 2 + i) * 0.5 * energy;
      chandelier.scale.setScalar(1 + energy * 0.5);
    });

    goldenNotes.forEach((note, i) => {
      const mesh = particlesRef.current[i];
      if (!mesh) return;

      note.position[0] += note.velocity[0] + Math.sin(time + note.phase) * 0.02 * treble;
      note.position[1] += note.velocity[1] * (0.8 + mid);
      note.position[2] += note.velocity[2] + Math.cos(time + note.phase) * 0.02 * bass;

      if (note.position[1] < -5) note.position[1] = 20;

      mesh.position.set(...note.position);
      mesh.rotation.y += note.rotationSpeed + treble * 0.02;
      mesh.scale.setScalar(note.size * (1 + energy * 2 + amplitude));
    });

    dustParticles.forEach((p, i) => {
      const mesh = particlesRef.current[100 + i];
      if (!mesh) return;
      p.position[1] += Math.sin(time * p.speed + i) * 0.03;
      if (p.position[1] > 25) p.position[1] = -10;
      mesh.position.set(...p.position);
    });

    if (floorRef.current) {
      floorRef.current.material.emissiveIntensity = 0.3 + energy * 1.5;
    }
  });

  return (
    <group ref={groupRef}>

      <mesh>
        <sphereGeometry args={[80, 64, 64]} />
        <meshBasicMaterial color="#000011" side={THREE.BackSide} />
      </mesh>

      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]} receiveShadow>
        <circleGeometry args={[30, 128]} />
        <meshPhysicalMaterial
          color="#f5f5f5"
          emissive="#332200"
          emissiveIntensity={0.4}
          metalness={0.1}
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={2}
        />
      </mesh>

      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 18;
        const z = Math.sin(angle) * 18;
        return (
          <mesh key={`pillar-${i}`} ref={el => pillarsRef.current[i] = el} position={[x, 3, z]} castShadow>
            <cylinderGeometry args={[1.2, 1.5, 12, 16]} />
            <meshPhysicalMaterial
              color="#eeeeee"
              emissive="#332211"
              emissiveIntensity={0.3}
              metalness={0.05}
              roughness={0.2}
            />
          </mesh>
        );
      })}

      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 18;
        const z = Math.sin(angle) * 18;
        return (
          <mesh key={`capital-${i}`} position={[x, 8.5, z]}>
            <boxGeometry args={[3, 1.5, 3]} />
            <meshPhysicalMaterial
              color="#ffd700"
              emissive="#ffaa00"
              emissiveIntensity={1}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        );
      })}

      {[0, 1, 2].map((i) => (
        <group key={`chandelier-${i}`} ref={el => chandeliersRef.current[i] = el} position={[0, 12, 0]}>
          <mesh rotation={[0, (i * Math.PI * 2) / 3, 0]}>
            <torusGeometry args={[4 + i * 1.5, 0.4, 16, 100]} />
            <meshPhysicalMaterial
              color="#ffd700"
              emissive="#ff9500"
              emissiveIntensity={4 + energy * 6}
              metalness={1}
              roughness={0.05}
            />
          </mesh>
          {[...Array(24)].map((_, j) => {
            const a = (j / 24) * Math.PI * 2;
            const r = 4 + i * 1.5;
            return (
              <mesh key={j} position={[Math.cos(a) * r, -1, Math.sin(a) * r]}>
                <cylinderGeometry args={[0.08, 0.12, 2, 16]} />
                <meshPhysicalMaterial
                  color="#ffffaa"
                  emissive="#ffff00"
                  emissiveIntensity={6 + Math.random() * 4}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {goldenNotes.map((note, i) => (
        <mesh
          key={`note-${i}`}
          ref={el => particlesRef.current[i] = el}
          position={note.position}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshPhysicalMaterial
            color="#ffd700"
            emissive="#ffaa00"
            emissiveIntensity={4 + energy * 8}
            metalness={0.95}
            roughness={0.05}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}

      {dustParticles.map((p, i) => (
        <mesh
          key={`dust-${i}`}
          ref={el => particlesRef.current[100 + i] = el}
          position={p.position}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial
            color="#ffddaa"
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}

      <mesh position={[0, 4, 0]}>
        <sphereGeometry args={[3, 64, 64]} />
        <meshPhysicalMaterial
          color="#ffffff"
          emissive="#aaffff"
          emissiveIntensity={5 + energy * 10}
          transmission={0.98}
          thickness={3}
          roughness={0}
          clearcoat={1}
          transparent
          opacity={0.8}
        />
      </mesh>

      <ambientLight intensity={0.4} color="#ffddaa" />
      <pointLight position={[0, 15, 0]} intensity={8} color="#ffaa00" distance={40} decay={1} />
      <pointLight position={[10, 10, 10]} intensity={3} color="#ffeedd" />
      <pointLight position={[-10, 10, -10]} intensity={3} color="#ffeedd" />
    </group>
  );
};

export default function ThreeVisualizer({ audioFile, type = 'electronic' }) {
  const [audioObj, setAudioObj] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentType, setCurrentType] = useState(type);
  const [showControls, setShowControls] = useState(true);
  const [bloomIntensity, setBloomIntensity] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { setupAudio, frequencyData, amplitude, audioContext, bass, mid, treble, energy } = useAudioAnalyzer();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!audioFile) return;

    const url = URL.createObjectURL(audioFile);
    setAudioUrl(url);
    
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume;
    setAudioObj(audio);
    
    const handleCanPlay = () => {
      setupAudio(audio);
      setIsPlaying(true);
      audio.play();
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      if (audioContext) audioContext.close();
    };
  }, [audioFile]);

  const togglePlay = () => {
    if (!audioObj) return;
    
    if (isPlaying) {
      audioObj.pause();
      setIsPlaying(false);
    } else {
      if (audioContext?.state === 'suspended') {
        audioContext.resume();
      }
      audioObj.play();
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    if (audioObj) {
      audioObj.pause();
      audioObj.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const changeVolume = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioObj) {
      audioObj.volume = newVolume;
    }
  };

const renderVisualizer = () => {
  const visualizerProps = { 
    frequencyData, 
    amplitude, 
    bass, 
    mid, 
    treble, 
    energy,
    isMobile // إضافة هذا السطر
  };
  
  switch(currentType) {
    case 'electronic':
      return <ElectronicVisualizer {...visualizerProps} />;
    case 'rock':
      return <RockVisualizer {...visualizerProps} />;
    case 'poprock':
      return <PopRockVisualizer {...visualizerProps} />;
    case 'classical':
      return <ClassicalVisualizer {...visualizerProps} />;
    default:
      return <ElectronicVisualizer {...visualizerProps} />;
  }
};
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Responsive styles
  const containerStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: '#000'
  };

  const controlsStyle = {
    position: isMobile ? "fixed" : "fixed",
    top: isMobile ? 0 : 20,
    left: isMobile ? 0 : 20,
    right: isMobile ? 0 : "auto",
    bottom: isMobile ? "auto" : "auto",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: isMobile ? "8px" : "12px",
    background: "rgba(0,0,0,0.92)",
    padding: isMobile ? "15px" : "20px",
    borderRadius: isMobile ? "0 0 20px 20px" : "20px",
    backdropFilter: "blur(15px)",
    border: isMobile ? "none" : "1px solid rgba(255,255,255,0.15)",
    minWidth: isMobile ? "100%" : "320px",
    width: isMobile ? "100%" : "auto",
    maxWidth: isMobile ? "100%" : "400px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    transition: "all 0.3s ease",
    maxHeight: isMobile ? (mobileMenuOpen ? "85vh" : "60px") : "auto",
    overflow: isMobile ? "auto" : "visible"
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  };

  const titleStyle = {
    margin: 0,
    color: "white",
    fontSize: isMobile ? "0.9rem" : "1.1rem",
    fontWeight: "bold"
  };

  const buttonGroupStyle = {
    display: "flex",
    gap: isMobile ? "6px" : "10px",
    marginBottom: isMobile ? "10px" : "15px",
    flexWrap: "wrap"
  };

  const buttonStyle = (isActive = false, type = 'default') => {
    const baseStyle = {
      padding: isMobile ? "10px 15px" : "12px 20px",
      border: "none",
      borderRadius: isMobile ? "10px" : "12px",
      color: "white",
      cursor: "pointer",
      flex: isMobile ? "1" : "0",
      minWidth: isMobile ? "calc(50% - 6px)" : "70px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontWeight: "bold",
      fontSize: isMobile ? "12px" : "14px",
      transition: "all 0.3s",
      textAlign: "center"
    };

    if (isActive) {
      const typeColors = {
        electronic: { gradient: "linear-gradient(135deg, #00ffcc, #0099cc)", shadow: "rgba(0,255,204,0.4)", border: "#00ffcc" },
        rock: { gradient: "linear-gradient(135deg, #ff5555, #cc0000)", shadow: "rgba(255,85,85,0.4)", border: "#ff5555" },
        poprock: { gradient: "linear-gradient(135deg, #ff66cc, #cc3399)", shadow: "rgba(255,102,204,0.4)", border: "#ff66cc" },
        classical: { gradient: "linear-gradient(135deg, #88aaff, #5566cc)", shadow: "rgba(136,170,255,0.4)", border: "#88aaff" }
      };
      const colors = typeColors[type] || typeColors.electronic;
      return {
        ...baseStyle,
        background: colors.gradient,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 5px 15px ${colors.shadow}`
      };
    }

    return {
      ...baseStyle,
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "none"
    };
  };

  const mobileToggleButtonStyle = {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 1000,
    padding: "12px",
    background: "rgba(0,0,0,0.8)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "50%",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(10px)",
    width: "44px",
    height: "44px"
  };

const visualizerTitleStyle = {
  position: "fixed",
  top: 40, // تغيير من 20 إلى 15 (أعلى قليلاً)
  right: 15, // جعله في الزاوية اليمنى دائماً
  background: "rgba(0,0,0,0.6)",
  padding: isMobile ? "6px 12px" : "10px 15px", // أصغر padding
  borderRadius: "15px",
  zIndex: 1000,
  color: "white",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.15)",
  textAlign: "center",
  boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
  maxWidth: "180px", // تحديد أقصى عرض
  minWidth: "100px"  // تحديد أدنى عرض
};




  const instructionsStyle = {
    position: "fixed",
    bottom: isMobile ? 100 : 30,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.7)",
    padding: isMobile ? "10px 15px" : "15px 30px",
    borderRadius: "25px",
    color: "white",
    fontSize: isMobile ? "12px" : "14px",
    textAlign: "center",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    maxWidth: isMobile ? "90%" : "auto",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  };

  const progressStyle = {
    position: "fixed",
    bottom: isMobile ? 140 : 80,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.6)",
    padding: isMobile ? "8px 15px" : "10px 25px",
    borderRadius: "20px",
    color: "white",
    fontSize: isMobile ? "12px" : "14px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    gap: isMobile ? "10px" : "15px",
    width: isMobile ? "90%" : "auto",
    justifyContent: "center"
  };

  return (
    <>
   <Canvas
  camera={{ 
    position: [0, 0, isMobile ? 30 : 15], // زيادة المسافة على الهاتف
    fov: isMobile ? 50 : 60 // تقليل مجال الرؤية
  }}
  style={{
    position: 'fixed',
    top: isMobile ? '5%' : 0, // إضافة هوامش علوية على الهاتف
    left: isMobile ? '5%' : 0, // إضافة هوامش جانبية على الهاتف
    width: isMobile ? '90%' : '100%', // تقليل العرض لإضافة هوامش
    height: isMobile ? '90%' : '100%', // تقليل الارتفاع
    background: '#000',
    borderRadius: isMobile ? '15px' : '0', // حواف مستديرة على الهاتف
    border: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none'
  }}
  shadows
>
        <color attach="background" args={['#000']} />
        
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, 5, -10]} intensity={0.8} color="#0088ff" />
        
        {renderVisualizer()}
        
<OrbitControls 
  enableZoom={true} // تمكين دائماً
  enablePan={true} // تمكين دائماً
  enableRotate={true} // تمكين دائماً
  minDistance={isMobile ? 15 : 3} // مسافة أقل على الهاتف
  maxDistance={isMobile ? 60 : 30} // مسافة أكثر على الهاتف
  enableDamping
  dampingFactor={0.05}
  rotateSpeed={0.5}
  zoomSpeed={0.8}
  // إضافة معالجات للشاشات اللمسية
  touches={{
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  }}
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }}
/>
        <EffectComposer>
          <Bloom
            intensity={bloomIntensity + amplitude}
            kernelSize={3}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.5}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.001 + energy * 0.002, 0.001 + energy * 0.002]}
          />
          <Vignette
            darkness={0.5}
            offset={0.3}
          />
        </EffectComposer>
      </Canvas>

      {showControls && (
        <div style={controlsStyle}>
          <div style={headerStyle}>
            <h3 style={titleStyle}>
              🎛️ {isMobile ? "Contrôles" : "Contrôle Avancé"}
            </h3>
            <button 
              onClick={() => isMobile ? setMobileMenuOpen(!mobileMenuOpen) : setShowControls(false)}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: isMobile ? "30px" : "30px",
                height: isMobile ? "30px" : "30px",
                color: "white",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {isMobile ? (mobileMenuOpen ? "↑" : "↓") : "×"}
            </button>
          </div>
          
          {(isMobile && mobileMenuOpen) || !isMobile ? (
            <>
              <div style={{
                background: "linear-gradient(90deg, #ff0000, #ffff00, #00ff00)",
                height: "6px",
                borderRadius: "3px",
                overflow: "hidden",
                marginBottom: "15px"
              }}>
                <div style={{
                  width: `${energy * 100}%`,
                  height: "100%",
                  background: "rgba(255,255,255,0.3)",
                  transition: "width 0.1s"
                }} />
              </div>
              
              <div style={buttonGroupStyle}>
                <button 
                  onClick={togglePlay}
                  style={{
                    ...buttonStyle(),
                    background: isPlaying ? "linear-gradient(135deg, #ff9800, #ff5722)" : "linear-gradient(135deg, #4CAF50, #2E7D32)",
                    boxShadow: isPlaying ? "0 5px 15px rgba(255,152,0,0.4)" : "0 5px 15px rgba(76,175,80,0.4)"
                  }}
                >
                  {isPlaying ? "⏸" : "▶️"} {isMobile ? "" : isPlaying ? "Pause" : "Jouer"}
                </button>
                <button 
                  onClick={stopAudio}
                  style={{
                    ...buttonStyle(),
                    background: "linear-gradient(135deg, #f44336, #d32f2f)",
                    boxShadow: "0 5px 15px rgba(244,67,54,0.4)"
                  }}
                >
                  ⏹ {isMobile ? "" : "Arrêter"}
                </button>
              </div>

              
              
              <div style={{marginBottom: "15px"}}>
                <div style={{color:"white", fontSize:"13px", marginBottom:"8px", fontWeight:"500"}}>
                  🎨 {isMobile ? "Mode" : "Mode de Visualisation"}
                </div>
                <div style={{display:"grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(2, 1fr)", gap:"8px"}}>
                  {['electronic', 'rock', 'poprock', 'classical'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setCurrentType(t);
                        if (isMobile) setMobileMenuOpen(false);
                      }}
                      style={buttonStyle(currentType === t, t)}
                    >
                      {t === 'electronic' ? '⚡' :
                       t === 'rock' ? '🤘' :
                       t === 'poprock' ? '🌟' :
                       '🎻'}
                      {!isMobile && (
                        t === 'electronic' ? 'Électronique' :
                        t === 'rock' ? 'Rock' :
                        t === 'poprock' ? 'Pop/Rock' :
                        'Classique'
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{marginBottom:"15px"}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:"8px"}}>
                  <span style={{color:"white", fontSize:"13px", fontWeight:"500"}}>🔊 Volume</span>
                  <span style={{color:"#4CAF50", fontSize:"13px", fontWeight:"bold"}}>{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={changeVolume}
                  style={{
                    width:"100%",
                    height:"6px",
                    background: "linear-gradient(90deg, #4CAF50, #ff9800, #f44336)",
                    borderRadius:"3px",
                    outline:"none"
                  }}
                />
              </div>
              
              <div style={{marginBottom:"15px"}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:"8px"}}>
                  <span style={{color:"white", fontSize:"13px", fontWeight:"500"}}>✨ {isMobile ? "Bloom" : "Intensité Bloom"}</span>
                  <span style={{color:"#ffcc00", fontSize:"13px", fontWeight:"bold"}}>{bloomIntensity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={bloomIntensity}
                  onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                  style={{
                    width:"100%",
                    height:"6px",
                    background: "linear-gradient(90deg, #000, #ffcc00)",
                    borderRadius:"3px",
                    outline:"none"
                  }}
                />
              </div>
              
              <div style={{
                padding: isMobile ? "10px" : "15px",
                background:"rgba(255,255,255,0.05)",
                borderRadius:"12px",
                border:"1px solid rgba(255,255,255,0.08)"
              }}>
                <div style={{
                  display:"grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: isMobile ? "6px" : "10px",
                  marginBottom:"10px"
                }}>
                  <MetricItem label="⚡ Énergie" value={energy.toFixed(3)} color="#00ffcc" isMobile={isMobile} />
                  <MetricItem label="🔊 Amplitude" value={amplitude.toFixed(3)} color="#4CAF50" isMobile={isMobile} />
                  <MetricItem label="🎵 Basses" value={bass.toFixed(3)} color="#ff5555" isMobile={isMobile} />
                  <MetricItem label="🎵 Mids" value={mid.toFixed(3)} color="#55ff55" isMobile={isMobile} />
                  <MetricItem label="🎵 Aigus" value={treble.toFixed(3)} color="#5555ff" isMobile={isMobile} />
                  <MetricItem label="🎯 Précision" value={`${(frequencyData.length/256*100).toFixed(0)}%`} color="#ffcc00" isMobile={isMobile} />
                </div>
                
                <div style={{
                  display:"flex",
                  gap:"4px",
                  height:"6px",
                  marginTop:"5px"
                }}>
                  {Array.from({length: isMobile ? 10 : 20}).map((_, i) => {
                    const value = frequencyData[i * (isMobile ? 24 : 12)] / 255;
                    return (
                      <div 
                        key={i}
                        style={{
                          flex:"1",
                          height:"100%",
                          background: `linear-gradient(to top, 
                            ${i < (isMobile ? 3 : 5) ? '#ff5555' : i < (isMobile ? 6 : 10) ? '#55ff55' : '#5555ff'}, 
                            ${i < (isMobile ? 3 : 5) ? '#ff0000' : i < (isMobile ? 6 : 10) ? '#00ff00' : '#0000ff'})`,
                          borderRadius:"2px",
                          transform: `scaleY(${value})`,
                          transition: "transform 0.05s"
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {!showControls && !isMobile && (
        <button
          onClick={() => setShowControls(true)}
          style={{
            position:"fixed",
            top:20,
            left:20,
            zIndex:2,
            padding:"12px 20px",
            background:"rgba(0,0,0,0.7)",
            border:"1px solid rgba(255,255,255,0.2)",
            borderRadius:"50px",
            color:"white",
            cursor:"pointer",
            display:"flex",
            alignItems:"center",
            gap:"8px",
            backdropFilter: "blur(10px)",
            fontSize:"14px",
            fontWeight:"500"
          }}
        >
          🎛️ Afficher Contrôle
        </button>
      )}

      <div style={visualizerTitleStyle}>
        <div style={{ 
          fontSize: isMobile ? "18px" : "26px", 
          fontWeight:"bold",
          textTransform:"uppercase",
          letterSpacing: isMobile ? "1px" : "3px",
          background: currentType === 'electronic' ? "linear-gradient(45deg, #00ffcc, #0099cc)" :
                     currentType === 'rock' ? "linear-gradient(45deg, #ff5555, #cc0000)" :
                     currentType === 'poprock' ? "linear-gradient(45deg, #ff66cc, #cc3399)" :
                     "linear-gradient(45deg, #88aaff, #5566cc)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom:"5px"
        }}>
          {currentType}
        </div>
        <div style={{ 
          fontSize: isMobile ? "11px" : "13px", 
          opacity:0.8, 
          letterSpacing:"1px",
          background: "rgba(255,255,255,0.1)",
          padding:"5px 15px",
          borderRadius:"20px",
          marginTop:"8px"
        }}>
          {currentType === 'electronic' ? "⚡ Cristaux Énergétiques" :
           currentType === 'rock' ? "🤘 Volcan Énergétique" :
           currentType === 'poprock' ? "🌟 Forêt Cristalline" :
           "🎻 Orchestre Céleste"}
        </div>
      </div>

      <div style={instructionsStyle}>
        <span style={{opacity:0.8}}>🎮</span>
        <span>{isMobile ? "Touch for controls" : "Rotation: Bouton souris • Zoom: Molette • Déplacer: Shift + souris"}</span>
        <span style={{opacity:0.8}}>✨</span>
      </div>

      {audioObj && (
        <div style={progressStyle}>
          <span>⏱️ {formatTime(audioObj.currentTime)}</span>
          <div style={{
            width: isMobile ? "150px" : "200px",
            height:"4px",
            background:"rgba(255,255,255,0.1)",
            borderRadius:"2px",
            overflow:"hidden"
          }}>
            <div style={{
              width:`${(audioObj.currentTime / audioObj.duration) * 100}%`,
              height:"100%",
              background:"linear-gradient(90deg, #00ffcc, #0099cc)",
              transition:"width 0.1s"
            }} />
          </div>
          <span>{formatTime(audioObj.duration)}</span>
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          style={{ display: 'none' }}
          loop
        />
      )}
    </>
  );
}

function MetricItem({ label, value, color, isMobile = false }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.05)",
      padding: isMobile ? "8px" : "10px",
      borderRadius:"8px",
      border:`1px solid ${color}30`
    }}>
      <div style={{color:"rgba(255,255,255,0.7)", fontSize: isMobile ? "10px" : "11px", marginBottom:"4px"}}>
        {label}
      </div>
      <div style={{color:color, fontSize: isMobile ? "12px" : "14px", fontWeight:"bold"}}>
        {value}
      </div>
    </div>
  );
}