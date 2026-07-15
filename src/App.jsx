import { Loader, ScrollControls, useScroll } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useState, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import * as THREE from "three";
import { Experience } from "./components/Experience";
import { UI, pageAtom } from "./components/UI";
import { EffectComposer } from "@react-three/postprocessing";
const deedsSVG = "/d.svg";
const fingerPrintSVG = "/finger-print.svg";
import { FisheyeEffect } from "./components/FisheyeEffect";

const STORY_VIEWS = [
  {
    "storyMode": true,
    "page": 0,
    "cameraPos": [-1.142, -0.935, -0.229],
    "cameraTarget": [0, 0, 0],
    "cameraFov": 45,
    "bookPos": [0.03, 0, 0.3],
    "bookRot": [0.01, -0.04, -0.29],
    "bookScale": [1, 1, 1],
    "lightPos": [6, 8, 4],
    "lightIntensity": 4.5,
    "lightColor": "#ffd180",
    "showCameraHelper": false,
    "showLightHelper": false,
    "showGridHelper": false
  },
  {
    "storyMode": true,
    "page": 1,
    "cameraPos": [0, 0, 1.45],
    "cameraTarget": [0, 0, 0],
    "cameraFov": 45,
    "bookPos": [0.5, -0.6, 0],
    "bookRot": [-0.04, 0.26, 0],
    "bookScale": [1, 1, 1],
    "lightPos": [6, 8, 4],
    "lightIntensity": 4.5,
    "lightColor": "#ffd180",
    "showCameraHelper": false,
    "showLightHelper": false,
    "showGridHelper": false
  },
  {
    "storyMode": true,
    "page": 1,
    "cameraPos": [0, 0, 1.45],
    "cameraTarget": [0, 0, 0],
    "cameraFov": 45,
    "bookPos": [0.5, 0.6, 0],
    "bookRot": [-0.04, 0.26, 0],
    "bookScale": [1, 1, 1],
    "lightPos": [6, 8, 4],
    "lightIntensity": 4.5,
    "lightColor": "#ffd180",
    "showCameraHelper": false,
    "showLightHelper": false,
    "showGridHelper": false
  },
  {
    "storyMode": true,
    "page": 2,
    "cameraPos": [-0.5, 0, 1.45],
    "cameraTarget": [0, 0, 0],
    "cameraFov": 26,
    "bookPos": [-0.5, -0.6, 0],
    "bookRot": [-0.04, -0.24, 0],
    "bookScale": [1, 1, 1],
    "lightPos": [6, 8, 4],
    "lightIntensity": 4.5,
    "lightColor": "#ffd180",
    "showCameraHelper": false,
    "showLightHelper": false,
    "showGridHelper": false
  }
];

const LensMarkerRing = ({ globalColor, notches }) => {
  const circleRef = useRef();

  useEffect(() => {
    let animId;
    const update = () => {
      if (circleRef.current) {
        // Slowly and mechanically rotate 90 degrees smoothly when scrolling down
        const offset = window.currentScrollOffset || 0;
        const angle = offset * 90;
        circleRef.current.setAttribute("transform", `rotate(${angle} 0 0)`);
      }
      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        aspectRatio: '1 / 1',
        zIndex: 5,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="94%"
        height="94%"
        viewBox="-15 -15 30 30"
        fill="none"
        style={{ opacity: 0.85, filter: 'drop-shadow(0px 0px 4px rgba(0,0,0,0.55))' }}
      >
        {/* Outer circular guide ring (gapped/dashed circle that rotates) */}
        <circle
          ref={circleRef}
          cx="0"
          cy="0"
          r="12"
          stroke={globalColor}
          strokeWidth="0.08"
          strokeDasharray="0.3 0.3"
          opacity="0.18"
        />
        
        {/* Render notches and labels */}
        {notches}
        
        {/* Camera target center dot */}
        <circle cx="0" cy="0" r="0.25" fill={globalColor} opacity="0.65" />
      </svg>
    </div>
  );
};

const LensMarker = ({ controls }) => {
  const show = controls.showMarker !== false;
  const numNotches = controls.markerNumNotches ?? 8;
  const notchColors = controls.markerNotchColors ?? [];
  const globalColor = controls.markerGlobalColor ?? "#ffffff";
  const majorLength = controls.markerMajorNotchLength ?? 2.0;

  if (!show) return null;

  const notches = [];
  const totalTicks = numNotches * 5;
  for (let j = 0; j < totalTicks; j++) {
    const angle = (j * 360) / totalTicks;
    const isMain = j % 5 === 0;

    if (isMain) {
      const mainIdx = j / 5;
      const color = notchColors[mainIdx] || globalColor;
      const isCardinal = Math.abs(angle - 0) < 0.01 || Math.abs(angle - 90) < 0.01 || Math.abs(angle - 180) < 0.01 || Math.abs(angle - 270) < 0.01;
      const finalColor = isCardinal ? "#ef4444" : color;
      const val = numNotches > 1 ? (mainIdx * (2.5 / (numNotches - 1))).toFixed(1) : "0.0";
      
      notches.push(
        <g key={`main-${mainIdx}`} transform={`rotate(${angle})`}>
          <line
            x1="0"
            y1="-12"
            x2="0"
            y2={-12 + majorLength}
            stroke={finalColor}
            strokeWidth="0.12"
            strokeLinecap="round"
          />
          <text
            x="0"
            y="-12.7"
            fill={finalColor}
            fontSize="0.4"
            fontFamily="'Geist Mono', monospace"
            textAnchor="middle"
            dominantBaseline="middle"
            transform="rotate(90 0 -12.7)"
            style={{ fontWeight: '500' }}
          >
            {val}
          </text>
        </g>
      );
    } else {
      const mainIdxBefore = Math.floor(j / 5);
      const color = notchColors[mainIdxBefore] || globalColor;
      
      notches.push(
        <line
          key={`sub-${j}`}
          x1="0"
          y1="-12"
          x2="0"
          y2="-11.55"
          stroke={color}
          strokeWidth="0.05"
          strokeLinecap="round"
          transform={`rotate(${angle})`}
          opacity="0.45"
        />
      );
    }
  }

  return (
    <LensMarkerRing
      globalColor={globalColor}
      notches={notches}
    />
  );
};

const FisheyeController = ({ controls }) => {
  const scroll = useScroll();
  const effectRef = useRef();

  useFrame(() => {
    if (!effectRef.current) return;

    const startStrength = 3.5; // Gallery default strength
    const endStrength = controls.fisheyeStrength ?? 0.0;
    const offset = scroll.offset;

    let strength = startStrength;
    if (offset >= 0.76) {
      // Transition Set 4 -> Book spans offset 0.76 to 0.8
      const progress = Math.min(1.0, Math.max(0.0, (offset - 0.76) / 0.04));
      strength = startStrength + (endStrength - startStrength) * progress;
    }

    if (effectRef.current.uniforms.has("strength")) {
      effectRef.current.uniforms.get("strength").value = strength;
    }
  });

  return <FisheyeEffect ref={effectRef} />;
};

const CameraTelemetryHUD = ({ isOpen, controls, updateVal, formRef }) => {
  const focalRef = useRef();
  const apertureRef = useRef();
  const distRef = useRef();
  const evRef = useRef();

  useEffect(() => {
    let animId;
    const update = () => {
      const offset = window.currentScrollOffset || 0;
      
      // Dynamic focal length: 35mm -> 85mm
      const focal = 35 + Math.sin(offset * Math.PI * 3) * 18 + offset * 32;
      if (focalRef.current) focalRef.current.innerText = `${Math.round(focal)}mm`;

      // Subject Distance
      const dist = Math.max(0.32, 4.8 * (1.0 - offset * 0.88));
      if (distRef.current) distRef.current.innerText = `${dist.toFixed(2)}m`;

      // Aperture / F-stop
      const fstops = ["f/1.4", "f/1.8", "f/2.0", "f/2.8", "f/4.0"];
      const fIndex = Math.min(fstops.length - 1, Math.floor(offset * fstops.length));
      if (apertureRef.current) apertureRef.current.innerText = fstops[fIndex];

      // Exposure Index (EV)
      const ev = (offset * 1.5 - 0.5).toFixed(2);
      if (evRef.current) evRef.current.innerText = `${ev > 0 ? '+' : ''}${ev} EV`;

      // Update newsletter form opacity and blur dynamically in real-time
      if (formRef && formRef.current) {
        if (controls.storyMode && offset >= 0.76) {
          formRef.current.style.display = 'flex';
          const progress = Math.min(1.0, (offset - 0.76) / 0.14); // Fully visible from offset 0.90 onwards
          formRef.current.style.opacity = progress;
          formRef.current.style.pointerEvents = progress > 0.9 ? 'auto' : 'none';
          
          const blur = 12 * (1 - progress);
          formRef.current.style.filter = `blur(${blur}px)`;
        } else {
          formRef.current.style.display = 'none';
          formRef.current.style.opacity = 0;
          formRef.current.style.pointerEvents = 'none';
        }
      }

      animId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animId);
  }, [controls.storyMode, formRef]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '32px',
        right: false ? '420px' : '80px',
        zIndex: 50,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontFamily: "'Geist Mono', monospace",
        fontSize: '11px',
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.75)',
        letterSpacing: '0.08em',
        transition: 'right 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        textTransform: 'uppercase',
      }}
    >
     <div className="space-y-2 border px-2 py-1 border-white/10 rounded-md ">
       <div  className={" bg-white/10 shadow-inner shadow-blue-300/30 p-1 border-white/20 rounded-full px-2 items-center"} style={{ display: 'flex', gap: '8px',  }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>LENS //</span>
        <span className="border bg-green-800/30 border-green-400/30 rounded-[6px] px-4" ref={focalRef}>35mm</span>
      
      </div>
      <div  className={" bg-white/10 shadow-inner shadow-blue-300/30 p-1 border-white/20 rounded-full px-2  items-center"} style={{ display: 'flex', gap: '8px',  }}>
        <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>FOCUS //</span>
        <span className="border bg-green-800/30 border-green-400/30 rounded-[6px] px-2" ref={distRef}>35mm</span>
     
      </div>
     </div>
 
  <div className="flex items-center gap-x-2 mt-4" style={{ pointerEvents: 'auto' }}>
       <span style={{ color: 'rgba(255, 255, 255, 0.35)' }}>B-W //</span>
       <div className="relative" style={{ width: '64px', height: '16px', display: 'flex', alignItems: 'center' }}>
         {/* Track */}
         <div className="w-16 h-2 rounded-full bg-gray-100/15 shadow-inner shadow-gray-700 border border-white/20 absolute" style={{ top: '4px', left: 0 }}></div>
         
         {/* Red Handle */}
         <div 
           className="h-4 w-4 rounded-full bg-red-700 shadow-inner shadow-red-950 absolute" 
           style={{ 
             left: `${(controls.bwStrength ?? 0.0) * 48}px`,
             pointerEvents: 'none',
             top: 0
           }}
         ></div>

         {/* Invisible Range Input */}
         <input
           type="range"
           min="0"
           max="1"
           step="0.01"
           value={controls.bwStrength ?? 0.0}
           onChange={(e) => updateVal("bwStrength", parseFloat(e.target.value))}
           style={{
             position: 'absolute',
             top: 0,
             left: 0,
             width: '64px',
             height: '16px',
             opacity: 0,
             cursor: 'pointer',
             margin: 0,
             padding: 0
           }}
         />
       </div>
  </div>
   
    </div>
  );
};

function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [page, setPage] = useAtom(pageAtom);
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const formRef = useRef();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
    }
  };

  const [controls, setControls] = useState({
    storyMode: true,
    page: 2,
    cameraPos: [-1, 1.186, 5.217],
    cameraTarget: [0, 0, 0],
    cameraFov: 34,
    lookThroughCamera: true,
    cameraType: "Perspective",
    cameraZoom: 100,
    fisheyeStrength: 0,
    bookPos: [0.03, 0, 0.34],
    bookRot: [-0.21, -0.24, -0.03],
    bookScale: [1, 1, 1],
    lightPos: [6, 8, 4],
    lightIntensity: 4.5,
    lightColor: "#ffeccc",
    ambientIntensity: 0,
    ambientColor: "#ffecd2",
    fillLightIntensity: 2.75,
    causticsColor: "#945e00",
    causticsIntensity: 3,
    causticsIor: 1.81,
    causticsWorldRadius: 1,
    causticsBackside: false,
    lightAType: "DirectionalLight",
    lightAPos: [-3, 4, 3],
    lightAColor: "#dbc248",
    lightAIntensity: 1.4,
    lightAAngle: 0.6,
    lightAPenumbra: 0.5,
    lightBType: "DirectionalLight",
    lightBPos: [0.5, -0.8, 3],
    lightBColor: "#82a2e3",
    lightBIntensity: 6,
    lightBAngle: 0.8,
    lightBPenumbra: 0.3,
    grainOpacity: 0.25,
    grainSize: 0.9,
    showCameraHelper: false,
    showLightHelper: false,
    showGridHelper: false,
    showRoom: false,
    showStool: false,
    bgColorInner: "#ffffff",
    bgColorMiddle: "#dcd3c1",
    bgColorOuter: "#ffffff",
    bgX: 19,
    bgY: 20,
    bgMiddleRadius: 0,
    bgOuterRadius: 0,
    showBlockers: false,
    blocker1Pos: [-1.4, 2.4, 1.1],
    blocker1Rot: [1.2, 0.5, 0],
    blocker1Scale: [0.2, 2.7, 0.5],
    blocker2Pos: [-0.4, -0.1, 1.3],
    blocker2Rot: [-0.25, 0.7, 0.9],
    blocker2Scale: [0.1, 2, 0.5],
    showMarker: true,
    markerNumNotches: 18,
    markerGlobalColor: "#ffffff",
    markerNotchColors: [],
    markerMajorNotchLength: 0.5,
    bwStrength: 0.0,
  });

  const [jsonText, setJsonText] = useState("");

  const isMounted = useRef(false);

  // Sync Jotai page state with controls state
  useEffect(() => {
    if (!isMounted.current) {
      setPage(controls.page);
      isMounted.current = true;
    } else {
      if (controls.page !== page) {
        setControls(prev => {
          if (prev.page === page) return prev;
          return { ...prev, page };
        });
      }
    }
  }, [page]);

  useEffect(() => {
    if (isMounted.current && controls.page !== page) {
      setPage(controls.page);
    }
  }, [controls.page]);

  // Sync controls to JSON text
  useEffect(() => {
    setJsonText(JSON.stringify(controls, null, 2));
  }, [controls]);

  // Sync backdrop vignette to document body/root element
  useEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      const inner = controls.bgColorInner ?? "#fff6e0";
      const middle = controls.bgColorMiddle ?? "#dcd3c1";
      const outer = controls.bgColorOuter ?? "#181512";
      const x = controls.bgX ?? 75;
      const y = controls.bgY ?? 20;
      const midRadius = controls.bgMiddleRadius ?? 35;
      const outRadius = controls.bgOuterRadius ?? 90;
      root.style.background = `radial-gradient(circle at ${x}% ${y}%, ${inner} 0%, ${middle} ${midRadius}%, ${outer} ${outRadius}%)`;
    }
  }, [
    controls.bgColorInner,
    controls.bgColorMiddle,
    controls.bgColorOuter,
    controls.bgX,
    controls.bgY,
    controls.bgMiddleRadius,
    controls.bgOuterRadius,
  ]);

  const handleJsonApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setControls(parsed);
    } catch (e) {
      alert("Invalid JSON format! Please check the bracket balances and keys.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonText);
    alert("JSON Configuration Copied to Clipboard!");
  };

  const updateVal = (key, val) => {
    setControls(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const updateVector = (key, index, val) => {
    setControls(prev => {
      const arr = [...prev[key]];
      arr[index] = parseFloat(val) || 0;
      return { ...prev, [key]: arr };
    });
  };

  return (
    <>
      <UI />
      <Loader />
      
      {/* 3D Canvas */}
 <div className=" h-screen overflow-hidden">
    <div className="relative border mx-auto pt-0  h-full bg-black w-full">
     
       <Canvas
        style={{ filter: `grayscale(${controls.bwStrength ?? 0.0})` }}
        dpr={1.5}
        shadows
        camera={{
          position: controls.cameraPos,
          fov: controls.cameraFov,
        }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
      >
        <group position-y={0}>
          <Suspense fallback={null}>
            {controls.storyMode ? (
              <ScrollControls pages={6} damping={0.4}>
                <Experience controls={controls} setControls={setControls} storyViews={STORY_VIEWS} />
                <EffectComposer>
                  <FisheyeController controls={controls} />
                </EffectComposer>
              </ScrollControls>
            ) : (
              <>
                <Experience controls={controls} setControls={setControls} storyViews={STORY_VIEWS} />
                <EffectComposer>
                  <FisheyeEffect strength={controls.fisheyeStrength ?? 3.5} />
                </EffectComposer>
              </>
            )}
          </Suspense>
        </group>
      </Canvas>
      <LensMarker controls={controls} />
      <CameraTelemetryHUD isOpen={isOpen} controls={controls} updateVal={updateVal} formRef={formRef} />
      <a
        href="https://www.deedsmag.com/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          position: 'absolute', 
          bottom: '32px', 
          right: '32px', 
          zIndex: 102, 
          pointerEvents: 'auto',
          cursor: 'pointer'
        }}
      >
        <img 
          className="rotate-[-8deg] hover:rotate-[-12deg] transition-all duration-300 ease-out z-50"
          src={deedsSVG} 
          style={{ 
            width: '170px',
            height: 'auto',
            display: 'block'
          }} 
          alt="deeds" 
        />
      </a>
      <img 
      className="rotate-[-8deg]  opacity-[0.15] mix-blend-lighten"
        src={fingerPrintSVG} 
        style={{ 
          position: 'absolute', 
          bottom: '-40px', 
          right: '32px', 
          zIndex: 100, 
          width: '100px',
          height: 'auto',
          pointerEvents: 'none',
        }} 
        alt="finger-print" 
      />
      <img 
      className="rotate-[-40deg]  opacity-[0.15] mix-blend-lighten"
        src={fingerPrintSVG} 
        style={{ 
          position: 'absolute', 
          bottom: '-40px', 
          right: '140px', 
          zIndex: 100, 
          width: '100px',
          height: 'auto',
          pointerEvents: 'none',
        }} 
        alt="finger-print" 
      />
   </div>
 </div>

 <div style={{ fontFamily: "'Geist Mono', monospace",}} className="absolute top-8 left-8 text-white ">
  ROD.raw
 </div>

      {/* Floating Toggle Icon (when panel is collapsed) */}
      {/* !isOpen */}
      {false && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            transition: 'all 0.2s'
          }}
          title="Open Studio Director"
        >
          <svg style={{ width: '24px', height: '24px', color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Studio Director Panel Modal */}
      {false && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            width: '380px',
            maxHeight: '92vh',
            overflowY: 'auto',
            backgroundColor: 'rgba(10, 10, 10, 0.92)',
            color: 'white',
            padding: '20px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: '"Poppins", "Inter", sans-serif',
            fontSize: '12px',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg style={{ width: '20px', height: '20px', color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', tracking: '0.05em', color: '#c7d2fe', textTransform: 'uppercase' }}>Studio Director</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Hide Panel ✕
            </button>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '8px', padding: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => updateVal("storyMode", false)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: '6px',
                textAlign: 'center',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: !controls.storyMode ? '#4f46e5' : 'transparent',
                color: !controls.storyMode ? 'white' : 'rgba(255,255,255,0.6)'
              }}
            >
              🛠️ Editor Mode
            </button>
            <button
              onClick={() => updateVal("storyMode", true)}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: '6px',
                textAlign: 'center',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: controls.storyMode ? '#4f46e5' : 'transparent',
                color: controls.storyMode ? 'white' : 'rgba(255,255,255,0.6)'
              }}
            >
              📜 Story Mode
            </button>
          </div>

          {controls.storyMode ? (
            /* STORY MODE PANELS */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'rgba(79, 70, 229, 0.08)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(79, 70, 229, 0.2)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#a5b4fc' }}>📜 Scroll Story Active</span>
              <span style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>Scroll the page up/down to transition camera viewpoints, book positioning, and lighting smoothly.</span>
              <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '6px', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#6366f1', height: '100%', borderRadius: '999px', width: '100%' }}></div>
              </div>
            </div>
          ) : (
            /* EDITOR MODE PANELS */
            <>
              {/* Camera View controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>1. Camera view</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '11px' }}>
                      <input type="checkbox" checked={controls.lookThroughCamera} onChange={(e) => updateVal("lookThroughCamera", e.target.checked)} />
                      Sync View
                    </label>
                    <button
                      onClick={() => {
                        if (window.captureCameraView) window.captureCameraView();
                      }}
                      style={{
                        backgroundColor: '#4f46e5',
                        border: 'none',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                      }}
                    >
                      📸 Capture View
                    </button>
                  </div>
                </div>

                {/* Camera position inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Position (X, Y, Z):</span>
                    <span style={{ fontFamily: 'monospace' }}>[{controls.cameraPos.map(v => v.toFixed(2)).join(", ")}]</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input type="number" step="0.1" value={controls.cameraPos[0]} onChange={(e) => updateVector("cameraPos", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.1" value={controls.cameraPos[1]} onChange={(e) => updateVector("cameraPos", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.1" value={controls.cameraPos[2]} onChange={(e) => updateVector("cameraPos", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                  </div>
                </div>

                {/* Camera target inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Target LookAt (X, Y, Z):</span>
                    <span style={{ fontFamily: 'monospace' }}>[{controls.cameraTarget.map(v => v.toFixed(2)).join(", ")}]</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input type="number" step="0.1" value={controls.cameraTarget[0]} onChange={(e) => updateVector("cameraTarget", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.1" value={controls.cameraTarget[1]} onChange={(e) => updateVector("cameraTarget", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.1" value={controls.cameraTarget[2]} onChange={(e) => updateVector("cameraTarget", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                  </div>
                </div>

                {/* Camera Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Camera Type:</span>
                  <select
                    value={controls.cameraType ?? "Perspective"}
                    onChange={(e) => updateVal("cameraType", e.target.value)}
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
                  >
                    <option value="Perspective">Perspective</option>
                    <option value="Orthographic">Orthographic</option>
                  </select>
                </div>

                {/* Camera FOV or Zoom depending on Type */}
                {controls.cameraType === "Orthographic" ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                      <span>Camera Zoom:</span>
                      <span>{controls.cameraZoom ?? 100}</span>
                    </div>
                    <input type="range" min="10" max="600" step="1" value={controls.cameraZoom ?? 100} onChange={(e) => updateVal("cameraZoom", parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                      <span>Field of View (FOV):</span>
                      <span>{controls.cameraFov}°</span>
                    </div>
                    <input type="range" min="15" max="100" value={controls.cameraFov} onChange={(e) => updateVal("cameraFov", parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                )}

                {/* Fisheye Strength Slider */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Fisheye Strength:</span>
                    <span>{(controls.fisheyeStrength ?? 3.5).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={controls.fisheyeStrength ?? 3.5}
                    onChange={(e) => updateVal("fisheyeStrength", parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Book model transform controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em' }}>2. Book Model Transform</span>
                
                {/* Book position inputs with Range Sliders + Numbers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Position (X, Y, Z):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>X: {controls.bookPos[0]}</div>
                      <input type="range" min="-4.0" max="4.0" step="0.01" value={controls.bookPos[0]} onChange={(e) => updateVector("bookPos", 0, e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Y: {controls.bookPos[1]}</div>
                      <input type="range" min="-4.0" max="4.0" step="0.01" value={controls.bookPos[1]} onChange={(e) => updateVector("bookPos", 1, e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Z: {controls.bookPos[2]}</div>
                      <input type="range" min="-4.0" max="4.0" step="0.01" value={controls.bookPos[2]} onChange={(e) => updateVector("bookPos", 2, e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '2px' }}>
                    <input type="number" step="0.05" value={controls.bookPos[0]} onChange={(e) => updateVector("bookPos", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    <input type="number" step="0.05" value={controls.bookPos[1]} onChange={(e) => updateVector("bookPos", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    <input type="number" step="0.05" value={controls.bookPos[2]} onChange={(e) => updateVector("bookPos", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                  </div>
                </div>

                {/* Book rotation sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Rotation (Pitch, Yaw, Roll):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Pitch</div>
                      <input type="range" min="-3.14" max="3.14" step="0.01" value={controls.bookRot[0]} onChange={(e) => updateVector("bookRot", 0, e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Yaw</div>
                      <input type="range" min="-3.14" max="3.14" step="0.01" value={controls.bookRot[1]} onChange={(e) => updateVector("bookRot", 1, e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Roll</div>
                      <input type="range" min="-3.14" max="3.14" step="0.01" value={controls.bookRot[2]} onChange={(e) => updateVector("bookRot", 2, e.target.value)} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    <input type="number" step="0.01" value={controls.bookRot[0]} onChange={(e) => updateVector("bookRot", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    <input type="number" step="0.01" value={controls.bookRot[1]} onChange={(e) => updateVector("bookRot", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    <input type="number" step="0.01" value={controls.bookRot[2]} onChange={(e) => updateVector("bookRot", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                  </div>
                </div>

                {/* Book scale inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Scale (X, Y, Z):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input type="number" step="0.1" value={controls.bookScale[0]} onChange={(e) => updateVector("bookScale", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.1" value={controls.bookScale[1]} onChange={(e) => updateVector("bookScale", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.1" value={controls.bookScale[2]} onChange={(e) => updateVector("bookScale", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                  </div>
                </div>

                {/* Active Page Spread */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Active Page Spread:</span>
                    <span style={{ fontWeight: 'bold', color: '#34d399' }}>{controls.page}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={controls.page}
                    onChange={(e) => updateVal("page", parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Lighting controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>3. Lighting Settings</span>
                
                {/* Light position inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Directional Light Position (X, Y, Z):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <input type="number" step="0.5" value={controls.lightPos[0]} onChange={(e) => updateVector("lightPos", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.5" value={controls.lightPos[1]} onChange={(e) => updateVector("lightPos", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                    <input type="number" step="0.5" value={controls.lightPos[2]} onChange={(e) => updateVector("lightPos", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center', color: 'white' }} />
                  </div>
                </div>

                {/* Key Light intensity & color */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Key Intensity: {controls.lightIntensity}</span>
                    <input type="range" min="0" max="8" step="0.1" value={controls.lightIntensity} onChange={(e) => updateVal("lightIntensity", parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Color:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={controls.lightColor} onChange={(e) => updateVal("lightColor", e.target.value)} style={{ width: '32px', height: '24px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace' }}>{controls.lightColor}</span>
                    </div>
                  </div>
                </div>

                {/* Ambient Light */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Ambient: {controls.ambientIntensity}</span>
                    <input type="range" min="0" max="2" step="0.05" value={controls.ambientIntensity} onChange={(e) => updateVal("ambientIntensity", parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Ambient Color:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={controls.ambientColor} onChange={(e) => updateVal("ambientColor", e.target.value)} style={{ width: '32px', height: '24px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{controls.ambientColor}</span>
                    </div>
                  </div>
                </div>

                {/* Fill Light */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Fill Light: {controls.fillLightIntensity}</span>
                  <input type="range" min="0" max="3" step="0.05" value={controls.fillLightIntensity} onChange={(e) => updateVal("fillLightIntensity", parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>

              {/* Caustic Effects controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.05em' }}>4. Caustics Settings</span>
                 {/* Caustics Color & Intensity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Intensity: {controls.causticsIntensity}</span>
                    <input type="range" min="0" max="25" step="0.1" value={controls.causticsIntensity} onChange={(e) => updateVal("causticsIntensity", parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Color:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={controls.causticsColor} onChange={(e) => updateVal("causticsColor", e.target.value)} style={{ width: '32px', height: '24px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{controls.causticsColor}</span>
                    </div>
                  </div>
                </div>

                {/* Caustics Ior & Radius */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Refraction (IOR): {controls.causticsIor}</span>
                    <input type="range" min="1.0" max="3.0" step="0.01" value={controls.causticsIor} onChange={(e) => updateVal("causticsIor", parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Radius: {controls.causticsWorldRadius}</span>
                    <input type="range" min="0.1" max="10.0" step="0.05" value={controls.causticsWorldRadius} onChange={(e) => updateVal("causticsWorldRadius", parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                </div>

                {/* Backside Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginTop: '4px', color: 'rgba(255,255,255,0.7)' }}>
                  <input type="checkbox" checked={controls.causticsBackside} onChange={(e) => updateVal("causticsBackside", e.target.checked)} />
                  Compute Backside Caustics
                </label>
              </div>

              {/* Film Grain controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>5. Film Grain</span>
                
                {/* Opacity & Size */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Opacity: {controls.grainOpacity}</span>
                    <input type="range" min="0" max="0.25" step="0.005" value={controls.grainOpacity} onChange={(e) => updateVal("grainOpacity", parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Grain Size: {controls.grainSize}x</span>
                    <input type="range" min="0.3" max="3.0" step="0.05" value={controls.grainSize} onChange={(e) => updateVal("grainSize", parseFloat(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                </div>
              </div>

              {/* Light A controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>6. Custom Light A</span>
                
                {/* Light Type Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Light Type:</span>
                  <select
                    value={controls.lightAType}
                    onChange={(e) => updateVal("lightAType", e.target.value)}
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
                  >
                    <option value="SpotLight">SpotLight</option>
                    <option value="PointLight">PointLight</option>
                    <option value="DirectionalLight">DirectionalLight</option>
                  </select>
                </div>

                {/* Light Position (X, Y, Z) sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Position (X, Y, Z):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '9px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>X: {controls.lightAPos[0]}</div>
                      <input type="range" min="-8" max="8" step="0.1" value={controls.lightAPos[0]} onChange={(e) => updateVector("lightAPos", 0, e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Y: {controls.lightAPos[1]}</div>
                      <input type="range" min="-8" max="8" step="0.1" value={controls.lightAPos[1]} onChange={(e) => updateVector("lightAPos", 1, e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Z: {controls.lightAPos[2]}</div>
                      <input type="range" min="-8" max="8" step="0.1" value={controls.lightAPos[2]} onChange={(e) => updateVector("lightAPos", 2, e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                {/* Intensity & Color */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Intensity: {controls.lightAIntensity}</span>
                    <input type="range" min="0" max="6" step="0.1" value={controls.lightAIntensity} onChange={(e) => updateVal("lightAIntensity", parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Color:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={controls.lightAColor} onChange={(e) => updateVal("lightAColor", e.target.value)} style={{ width: '32px', height: '24px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{controls.lightAColor}</span>
                    </div>
                  </div>
                </div>

                {/* SpotLight Specific Options */}
                {controls.lightAType === "SpotLight" && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Angle: {controls.lightAAngle}</span>
                      <input type="range" min="0.1" max="1.5" step="0.05" value={controls.lightAAngle} onChange={(e) => updateVal("lightAAngle", parseFloat(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Penumbra: {controls.lightAPenumbra}</span>
                      <input type="range" min="0" max="1" step="0.05" value={controls.lightAPenumbra} onChange={(e) => updateVal("lightAPenumbra", parseFloat(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Light B controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>7. Custom Light B</span>
                
                {/* Light Type Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Light Type:</span>
                  <select
                    value={controls.lightBType}
                    onChange={(e) => updateVal("lightBType", e.target.value)}
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '4px', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
                  >
                    <option value="SpotLight">SpotLight</option>
                    <option value="PointLight">PointLight</option>
                    <option value="DirectionalLight">DirectionalLight</option>
                  </select>
                </div>

                {/* Light Position (X, Y, Z) sliders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Position (X, Y, Z):</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '9px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>X: {controls.lightBPos[0]}</div>
                      <input type="range" min="-8" max="8" step="0.1" value={controls.lightBPos[0]} onChange={(e) => updateVector("lightBPos", 0, e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Y: {controls.lightBPos[1]}</div>
                      <input type="range" min="-8" max="8" step="0.1" value={controls.lightBPos[1]} onChange={(e) => updateVector("lightBPos", 1, e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Z: {controls.lightBPos[2]}</div>
                      <input type="range" min="-8" max="8" step="0.1" value={controls.lightBPos[2]} onChange={(e) => updateVector("lightBPos", 2, e.target.value)} style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                {/* Intensity & Color */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Intensity: {controls.lightBIntensity}</span>
                    <input type="range" min="0" max="6" step="0.1" value={controls.lightBIntensity} onChange={(e) => updateVal("lightBIntensity", parseFloat(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Color:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="color" value={controls.lightBColor} onChange={(e) => updateVal("lightBColor", e.target.value)} style={{ width: '32px', height: '24px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{controls.lightBColor}</span>
                    </div>
                  </div>
                </div>

                {/* SpotLight Specific Options */}
                {controls.lightBType === "SpotLight" && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Angle: {controls.lightBAngle}</span>
                      <input type="range" min="0.1" max="1.5" step="0.05" value={controls.lightBAngle} onChange={(e) => updateVal("lightBAngle", parseFloat(e.target.value))} style={{ width: '100%' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Penumbra: {controls.lightBPenumbra}</span>
                      <input type="range" min="0" max="1" step="0.05" value={controls.lightBPenumbra} onChange={(e) => updateVal("lightBPenumbra", parseFloat(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Backdrop Vignette controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>8. Backdrop Vignette</span>
                
                {/* Vignette Colors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>Inner</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="color" value={controls.bgColorInner ?? "#fff6e0"} onChange={(e) => updateVal("bgColorInner", e.target.value)} style={{ width: '24px', height: '20px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>{controls.bgColorInner ?? "#fff6e0"}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>Middle</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="color" value={controls.bgColorMiddle ?? "#dcd3c1"} onChange={(e) => updateVal("bgColorMiddle", e.target.value)} style={{ width: '24px', height: '20px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>{controls.bgColorMiddle ?? "#dcd3c1"}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>Outer</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="color" value={controls.bgColorOuter ?? "#181512"} onChange={(e) => updateVal("bgColorOuter", e.target.value)} style={{ width: '24px', height: '20px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                      <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>{controls.bgColorOuter ?? "#181512"}</span>
                    </div>
                  </div>
                </div>

                {/* Vignette Positioning */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Center X: {controls.bgX ?? 75}%</span>
                    <input type="range" min="0" max="100" value={controls.bgX ?? 75} onChange={(e) => updateVal("bgX", parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Center Y: {controls.bgY ?? 20}%</span>
                    <input type="range" min="0" max="100" value={controls.bgY ?? 20} onChange={(e) => updateVal("bgY", parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                </div>

                {/* Vignette Color Stops */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Middle Stop: {controls.bgMiddleRadius ?? 35}%</span>
                    <input type="range" min="0" max="100" value={controls.bgMiddleRadius ?? 35} onChange={(e) => updateVal("bgMiddleRadius", parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Outer Stop: {controls.bgOuterRadius ?? 90}%</span>
                    <input type="range" min="0" max="100" value={controls.bgOuterRadius ?? 90} onChange={(e) => updateVal("bgOuterRadius", parseInt(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                  </div>
                </div>
              </div>

              {/* Visual Helpers checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>9. Visual Helpers</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={controls.showCameraHelper} onChange={(e) => updateVal("showCameraHelper", e.target.checked)} />
                    Camera
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={controls.showLightHelper} onChange={(e) => updateVal("showLightHelper", e.target.checked)} />
                    Light
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={controls.showGridHelper} onChange={(e) => updateVal("showGridHelper", e.target.checked)} />
                    Grid/Axes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={controls.showRoom !== false} onChange={(e) => updateVal("showRoom", e.target.checked)} />
                    Show Room
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={controls.showStool !== false} onChange={(e) => updateVal("showStool", e.target.checked)} />
                    Show Stool
                  </label>
                </div>
              </div>

              {/* Blocker Shadows Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.05em' }}>10. Blocker Shadows</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
                    <input type="checkbox" checked={controls.showBlockers !== false} onChange={(e) => updateVal("showBlockers", e.target.checked)} />
                    Show Helpers
                  </label>
                </div>

                {/* Blocker 1 */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>Blocker 1 (Blue)</span>
                  
                  {/* Position */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                      <span>Pos (X, Y, Z):</span>
                      <span style={{ fontFamily: 'monospace' }}>[{controls.blocker1Pos?.map(v => v.toFixed(2)).join(", ")}]</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
                      <input type="number" step="0.1" value={controls.blocker1Pos?.[0] ?? -1.5} onChange={(e) => updateVector("blocker1Pos", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.1" value={controls.blocker1Pos?.[1] ?? 2.0} onChange={(e) => updateVector("blocker1Pos", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.1" value={controls.blocker1Pos?.[2] ?? 1.5} onChange={(e) => updateVector("blocker1Pos", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                      <span>Rot (P, Y, R):</span>
                      <span style={{ fontFamily: 'monospace' }}>[{controls.blocker1Rot?.map(v => v.toFixed(2)).join(", ")}]</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
                      <input type="number" step="0.05" value={controls.blocker1Rot?.[0] ?? 0} onChange={(e) => updateVector("blocker1Rot", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker1Rot?.[1] ?? 0.5} onChange={(e) => updateVector("blocker1Rot", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker1Rot?.[2] ?? 0} onChange={(e) => updateVector("blocker1Rot", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    </div>
                  </div>

                  {/* Scale */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                      <span>Scale (W, H, D):</span>
                      <span style={{ fontFamily: 'monospace' }}>[{controls.blocker1Scale?.map(v => v.toFixed(2)).join(", ")}]</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
                      <input type="number" step="0.05" value={controls.blocker1Scale?.[0] ?? 0.1} onChange={(e) => updateVector("blocker1Scale", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker1Scale?.[1] ?? 2.0} onChange={(e) => updateVector("blocker1Scale", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker1Scale?.[2] ?? 0.5} onChange={(e) => updateVector("blocker1Scale", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    </div>
                  </div>
                </div>

                {/* Blocker 2 */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: '#fb7185' }}>Blocker 2 (Rose)</span>
                  
                  {/* Position */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                      <span>Pos (X, Y, Z):</span>
                      <span style={{ fontFamily: 'monospace' }}>[{controls.blocker2Pos?.map(v => v.toFixed(2)).join(", ")}]</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
                      <input type="number" step="0.1" value={controls.blocker2Pos?.[0] ?? -1.2} onChange={(e) => updateVector("blocker2Pos", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.1" value={controls.blocker2Pos?.[1] ?? 1.8} onChange={(e) => updateVector("blocker2Pos", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.1" value={controls.blocker2Pos?.[2] ?? 1.3} onChange={(e) => updateVector("blocker2Pos", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                      <span>Rot (P, Y, R):</span>
                      <span style={{ fontFamily: 'monospace' }}>[{controls.blocker2Rot?.map(v => v.toFixed(2)).join(", ")}]</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
                      <input type="number" step="0.05" value={controls.blocker2Rot?.[0] ?? 0} onChange={(e) => updateVector("blocker2Rot", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker2Rot?.[1] ?? 0.5} onChange={(e) => updateVector("blocker2Rot", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker2Rot?.[2] ?? 0} onChange={(e) => updateVector("blocker2Rot", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    </div>
                  </div>

                  {/* Scale */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                      <span>Scale (W, H, D):</span>
                      <span style={{ fontFamily: 'monospace' }}>[{controls.blocker2Scale?.map(v => v.toFixed(2)).join(", ")}]</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
                      <input type="number" step="0.05" value={controls.blocker2Scale?.[0] ?? 0.1} onChange={(e) => updateVector("blocker2Scale", 0, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker2Scale?.[1] ?? 2.0} onChange={(e) => updateVector("blocker2Scale", 1, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                      <input type="number" step="0.05" value={controls.blocker2Scale?.[2] ?? 0.5} onChange={(e) => updateVector("blocker2Scale", 2, e.target.value)} style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '3px', borderRadius: '4px', textAlign: 'center', color: 'white', fontSize: '11px' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Camera Lens Marker Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontWeight: 'bold', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>11. Camera Lens Marker</span>
                
                {/* Show/Hide Marker */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                  <input type="checkbox" checked={controls.showMarker !== false} onChange={(e) => updateVal("showMarker", e.target.checked)} />
                  Show Lens Marker Overlay
                </label>

                {/* Num Notches */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Number of Notches:</span>
                    <span>{controls.markerNumNotches ?? 8}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    step="1"
                    value={controls.markerNumNotches ?? 8}
                    onChange={(e) => updateVal("markerNumNotches", parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                {/* Major Notch Length */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Major Notch Length:</span>
                    <span>{(controls.markerMajorNotchLength ?? 2.0).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={controls.markerMajorNotchLength ?? 2.0}
                    onChange={(e) => updateVal("markerMajorNotchLength", parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                {/* Global Color */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Global Color:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="color" value={controls.markerGlobalColor ?? "#ffffff"} onChange={(e) => updateVal("markerGlobalColor", e.target.value)} style={{ width: '32px', height: '24px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }} />
                    <span style={{ fontFamily: 'monospace' }}>{controls.markerGlobalColor ?? "#ffffff"}</span>
                  </div>
                </div>

                {/* Individual Notch Colors */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Individual Notch Highlights:</span>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {Array.from({ length: controls.markerNumNotches ?? 8 }).map((_, i) => {
                      const customColor = (controls.markerNotchColors ?? [])[i] || "";
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>#{i + 1}</span>
                          <input
                            type="color"
                            value={customColor || controls.markerGlobalColor || "#ffffff"}
                            onChange={(e) => {
                              const newColors = [...(controls.markerNotchColors ?? [])];
                              newColors[i] = e.target.value;
                              updateVal("markerNotchColors", newColors);
                            }}
                            style={{ width: '20px', height: '20px', padding: 0, cursor: 'pointer', border: 'none', background: 'transparent' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => updateVal("markerNotchColors", [])}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: 'white',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      marginTop: '2px'
                    }}
                  >
                    Reset Custom Colors
                  </button>
                </div>
              </div>

              {/* JSON export/import text block */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#e879f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>12. Configuration JSON</span>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      backgroundColor: '#c084fc',
                      border: 'none',
                      color: 'black',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    📋 Copy JSON
                  </button>
                </div>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '8px',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    height: '96px',
                    color: 'rgba(255,255,255,0.9)',
                    resize: 'none',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  placeholder="View Config JSON"
                />
                <button
                  onClick={handleJsonApply}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '6px 0',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                >
                  📥 Apply Pasted JSON Configuration
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Animated Film Grain Overlay */}
      {controls.grainOpacity > 0 && (
        <>
          <style>{`
            @keyframes grainAnimation {
              0%, 100% { transform: translate(0, 0); }
              10% { transform: translate(-0.5%, -1%); }
              20% { transform: translate(-1%, 0.5%); }
              30% { transform: translate(0.5%, -1%); }
              40% { transform: translate(-0.5%, 1.5%); }
              50% { transform: translate(-1%, 0.5%); }
              60% { transform: translate(1%, -0.5%); }
              70% { transform: translate(1.5%, 1%); }
              80% { transform: translate(-1.5%, -1%); }
              90% { transform: translate(0.5%, -1.5%); }
            }
          `}</style>
          <div style={{
            position: 'fixed',
            top: '-50%',
            left: '-50%',
            right: '-50%',
            bottom: '-50%',
            width: '200%',
            height: '200%',
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: controls.grainOpacity,
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: `${180 * controls.grainSize}px ${180 * controls.grainSize}px`,
            animation: 'grainAnimation 1.2s steps(8) infinite',
          }} />
        </>
      )}

      {/* Newsletter Subscription and Purchase Overlay (Flat, B&W, sharp, Geist Mono) */}
      <div 
      className="border border-white/40"
        ref={formRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          display: 'none',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '24px',
          width: '320px',
          fontFamily: "'Geist Mono', monospace",
          color: '#ffffff',
          backgroundColor: '#000000',
        
          padding: '32px',
          boxSizing: 'border-box',
          opacity: 0,
          pointerEvents: 'none'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.15em', margin: 0 }}>
            DEEDS NEWSLETTER
          </h2>
          <p style={{ fontSize: '9px', color: '#888888', letterSpacing: '0.05em', lineHeight: '1.4', margin: 0 }}>
            ENTER EMAIL FOR EXCLUSIVE RELEASES.
          </p>
        </div>

        {isSubscribed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#ffffff', lineHeight: '1.4' }}>
              SUBSCRIBED SUCCESSFULLY.<br />
              {email.toUpperCase()}
            </div>
            <button
              onClick={() => {
                setIsSubscribed(false);
                setEmail("");
              }}
              style={{
                width: '100%',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: '1px solid #ffffff',
                padding: '10px',
                fontSize: '10px',
                fontFamily: "'Geist Mono', monospace",
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.color = '#000000'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#000000'; e.target.style.color = '#ffffff'; }}
            >
              BACK
            </button>
          </div>
        ) : (
          <form 
            onSubmit={handleSubscribe} 
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="EMAIL ADDRESS"
              style={{
                width: '100%',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: '1px solid #ffffff',
                padding: '10px',
                fontSize: '10px',
                fontFamily: "'Geist Mono', monospace",
                boxSizing: 'border-box',
                outline: 'none',
                letterSpacing: '0.05em'
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                color: '#000000',
                border: '1px solid #ffffff',
                padding: '10px',
                fontSize: '10px',
                fontFamily: "'Geist Mono', monospace",
                fontWeight: '700',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#000000'; e.target.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.color = '#000000'; }}
            >
              SUBSCRIBE
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <a
            href="https://www.deedsmag.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: '1px solid #ffffff',
              padding: '10px',
              fontSize: '10px',
              fontFamily: "'Geist Mono', monospace",
              textDecoration: 'none',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.color = '#000000'; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = '#000000'; e.target.style.color = '#ffffff'; }}
          >
            BUY PHYSICAL BOOK
          </a>
        </div>
        
        <div style={{ fontSize: '9px', color: '#555555', textAlign: 'center', letterSpacing: '0.05em' }}>
          ↑ SCROLL UP TO RETURN TO GALLERY
        </div>
      </div>
    </>
  );
}

export default App;
