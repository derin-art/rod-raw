import { OrbitControls, useHelper, useScroll, Environment, Caustics, PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, useMemo } from "react";
import { useAtom } from "jotai";
import * as THREE from "three";
import { easing } from "maath";
import { Book, Stool } from "./Book";
import { pageAtom, pages, showcaseEndedAtom } from "./UI";
import { FloatingGallery } from "./FloatingGallery";

// Linear interpolation helper
const lerp = (a, b, t) => a + (b - a) * t;

// Smoothstep helper
const smoothstep = (min, max, value) => {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
};

// Scroll Animation Driver Component (only rendered when storyMode is active)
const ScrollStoryDriver = ({ bookGroupRef, stoolGroupRef, dirLightRef, lightARef, controls }) => {
  const scroll = useScroll();
  const { camera } = useThree();
  const [page, setPage] = useAtom(pageAtom);
  const [, setShowcaseEnded] = useAtom(showcaseEndedAtom);

  // Refs to store target states and perform smooth interpolation (damping)
  const targetCamPos = useRef(new THREE.Vector3(0, 1.2, 25));
  const targetLookAt = useRef(new THREE.Vector3(0, 0.2, 21));
  const currentLookAt = useRef(new THREE.Vector3(0, 0.2, 21));

  // Reset visibility and scroll state when story mode is exited (unmounted)
  useEffect(() => {
    return () => {
      window.currentScrollOffset = 0;
      window.showcaseEndedState = false;
      setShowcaseEnded(false);
      if (bookGroupRef.current) bookGroupRef.current.visible = true;
      if (stoolGroupRef.current) stoolGroupRef.current.visible = true;
    };
  }, [bookGroupRef, stoolGroupRef, setShowcaseEnded]);

  useFrame((state, delta) => {
    const offset = scroll.offset; // ranges from 0 to 1
    window.currentScrollOffset = offset;

    const ended = offset > 0.95;
    if (ended !== window.showcaseEndedState) {
      window.showcaseEndedState = ended;
      setTimeout(() => setShowcaseEnded(ended), 0);
    }

    // Dynamic light A intensity interpolation (starts at 5.0, transitions to controls.lightAIntensity [1.4] at book side)
    if (lightARef && lightARef.current) {
      let targetIntensity = 5.0;
      if (offset >= 0.76) {
        // Transition spans offset 0.76 to 0.80 -> progress goes from 0 to 1
        const t = Math.min(1.0, Math.max(0.0, (offset - 0.76) / 0.04));
        targetIntensity = lerp(5.0, controls.lightAIntensity ?? 1.4, t);
      }
      easing.damp(lightARef.current, "intensity", targetIntensity, 0.15, delta);
    }

    // Hide book and stool in story mode
    if (bookGroupRef.current && bookGroupRef.current.visible) {
      bookGroupRef.current.visible = false;
    }
    if (stoolGroupRef.current && stoolGroupRef.current.visible) {
      stoolGroupRef.current.visible = false;
    }

    if (offset < 0.8) {
      // 1. Phase 1: Photo Gallery (scroll 0.0 to 0.8)
      const progress = offset / 0.8; // ranges from 0 to 1

      let zCam = 25;
      let xCam = 0;
      let yCam = 1.2;

      if (progress <= 0.15) {
        // Set 0 Dwell
        zCam = 25;
      } else if (progress <= 0.20) {
        // Transition Set 0 -> Set 1
        const t = smoothstep(0.15, 0.20, progress);
        zCam = lerp(25, 21.5, t);
      } else if (progress <= 0.35) {
        // Set 1 Dwell
        zCam = 21.5;
      } else if (progress <= 0.40) {
        // Transition Set 1 -> Set 2
        const t = smoothstep(0.35, 0.40, progress);
        zCam = lerp(21.5, 18.0, t);
      } else if (progress <= 0.55) {
        // Set 2 Dwell
        zCam = 18.0;
      } else if (progress <= 0.60) {
        // Transition Set 2 -> Set 3
        const t = smoothstep(0.55, 0.60, progress);
        zCam = lerp(18.0, 14.5, t);
      } else if (progress <= 0.75) {
        // Set 3 Dwell
        zCam = 14.5;
      } else if (progress <= 0.80) {
        // Transition Set 3 -> Set 4
        const t = smoothstep(0.75, 0.80, progress);
        zCam = lerp(14.5, 11.0, t);
      } else if (progress <= 0.95) {
        // Set 4 Dwell
        zCam = 11.0;
      } else {
        // Transition Set 4 -> Book
        const t = smoothstep(0.95, 1.0, progress);
        zCam = lerp(11.0, controls.cameraPos[2], t);
        xCam = lerp(0, controls.cameraPos[0], t);
        yCam = lerp(1.2, controls.cameraPos[1], t);
      }

      targetCamPos.current.set(xCam, yCam, zCam);

      // Camera Target (LookAt): Looks straight ahead down Z during gallery, then blends onto Book
      let targetX = 0;
      let targetY = 0.2;
      let targetZ = zCam - 4;

      if (progress > 0.95) {
        const t = smoothstep(0.95, 1.0, progress);
        targetX = lerp(0, controls.cameraTarget[0], t);
        targetY = lerp(0.2, controls.cameraTarget[1], t);
        targetZ = lerp(zCam - 4, controls.cameraTarget[2], t);
      }

      targetLookAt.current.set(targetX, targetY, targetZ);

      // Keep book closed (page = 0) in gallery phase
      // if (page !== 0) {
      //   setTimeout(() => setPage(0), 0);
      // }
    } else {
      // 2. Phase 2: Book View (scroll 0.8 to 1.0)
      const progress = (offset - 0.8) / 0.2; // ranges from 0 to 1

      // Set target camera position and lookAt exactly to the user-designed values
      targetCamPos.current.set(...controls.cameraPos);
      targetLookAt.current.set(...controls.cameraTarget);

      // Map scroll progress to open only the first page and stop
      // const targetPage = progress > 0.35 ? 1 : 0;

      // if (targetPage !== page) {
      //   setTimeout(() => setPage(targetPage), 0);
      // }
    }

    // Smoothly interpolate camera position using easing.damp3
    easing.damp3(camera.position, targetCamPos.current, 0.25, delta);

    // Smoothly interpolate lookAt target using easing.damp3
    easing.damp3(currentLookAt.current, targetLookAt.current, 0.25, delta);
    camera.lookAt(currentLookAt.current);

    // Smoothly interpolate camera FOV from 42 during gallery to book FOV
    const targetFov = offset < 0.8 
      ? (offset / 0.8 > 0.95 ? lerp(42, controls.cameraFov, smoothstep(0.95, 1.0, offset / 0.8)) : 42) 
      : controls.cameraFov;

    easing.damp(camera, "fov", targetFov, 0.25, delta);
    camera.updateProjectionMatrix();
  });

  return null;
};

// Procedural 3D Room Walls and Floor
const Room = () => {
  return (
    <group>
      {/* Floor (perpendicular to stool legs, positioned behind the stand) */}
      <mesh position={[0, 0, -1.09]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#ebdcb9" roughness={0.85} metalness={0.0} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-6, 0, 4]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 30]} />
        <meshStandardMaterial color="#ebdcb9" roughness={0.85} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[6, 0, 4]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 30]} />
        <meshStandardMaterial color="#ebdcb9" roughness={0.85} />
      </mesh>

      {/* Back Wall (Top wall in high-angle view) */}
      <mesh position={[0, 6, 4]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 10]} />
        <meshStandardMaterial color="#ebdcb9" roughness={0.85} />
      </mesh>
    </group>
  );
};

// Dynamic light helper component
const RenderLight = ({ lightRef, type, position, color, intensity, angle, penumbra }) => {
  if (type === "SpotLight") {
    return (
      <spotLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={intensity}
        angle={angle}
        penumbra={penumbra}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
    );
  }
  if (type === "DirectionalLight") {
    return (
      <directionalLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={intensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
    );
  }
  return (
    <pointLight
      ref={lightRef}
      position={position}
      color={color}
      intensity={intensity}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      shadow-bias={-0.0002}
    />
  );
};

export const Experience = ({ controls, setControls, storyViews }) => {
  const controlsRef = useRef();
  const dirLightRef = useRef();
  const lightARef = useRef();
  const bookGroupRef = useRef();
  const stoolGroupRef = useRef();
  const { camera } = useThree();

  // Local reference state for camera helper
  const [dummyCamera, setDummyCamera] = useState(null);

  // Sync threejs camera values if changed manually in Editor Mode
  useEffect(() => {
    if (controls.storyMode || !controls.lookThroughCamera) return; // Skip manual override
    camera.position.set(...controls.cameraPos);
    if (camera.isOrthographicCamera) {
      camera.zoom = controls.cameraZoom ?? 100;
    } else {
      camera.fov = controls.cameraFov;
    }
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(...controls.cameraTarget);
      controlsRef.current.update();
    }
  }, [controls.cameraPos, controls.cameraTarget, controls.cameraFov, controls.cameraZoom, camera, controls.storyMode, controls.lookThroughCamera]);

  // Capture current camera values from mouse orbit navigation
  const captureCamera = () => {
    if (controlsRef.current) {
      const camObj = controlsRef.current.object;
      const targetObj = controlsRef.current.target;
      setControls((prev) => ({
        ...prev,
        cameraPos: [
          parseFloat(camObj.position.x.toFixed(3)),
          parseFloat(camObj.position.y.toFixed(3)),
          parseFloat(camObj.position.z.toFixed(3)),
        ],
        cameraTarget: [
          parseFloat(targetObj.x.toFixed(3)),
          parseFloat(targetObj.y.toFixed(3)),
          parseFloat(targetObj.z.toFixed(3)),
        ],
        cameraFov: Math.round(camObj.fov),
        cameraZoom: camObj.isOrthographicCamera ? camObj.zoom : prev.cameraZoom ?? 100,
        cameraType: camObj.isOrthographicCamera ? "Orthographic" : "Perspective",
      }));
    }
  };

  // Bind capture action to window for HTML dashboard triggers
  useEffect(() => {
    window.captureCameraView = captureCamera;
    return () => {
      window.captureCameraView = null;
    };
  }, [setControls]);

  // Render R3F standard light helper
  useHelper(
    controls.showLightHelper ? dirLightRef : null,
    THREE.DirectionalLightHelper,
    1,
    "yellow"
  );

  return (
    <>
      {/* Dynamic Camera Selection */}
      {!controls.storyMode && controls.cameraType === "Orthographic" ? (
        <OrthographicCamera
          makeDefault
          position={controls.cameraPos}
          zoom={controls.cameraZoom ?? 100}
          near={0.1}
          far={100}
        />
      ) : (
        <PerspectiveCamera
          makeDefault
          position={controls.cameraPos}
          fov={controls.cameraFov}
          near={0.1}
          far={100}
        />
      )}

      {/* Scroll animation driver (mounted only in Story Mode) */}
      {controls.storyMode && (
        <>
          <ScrollStoryDriver
            bookGroupRef={bookGroupRef}
            stoolGroupRef={stoolGroupRef}
            dirLightRef={dirLightRef}
            lightARef={lightARef}
            controls={controls}
          />
          <FloatingGallery />
        </>
      )}

      {/* Book Model wrapper carrying manual transform controls */}
      {!controls.storyMode && (
        <group
          ref={bookGroupRef}
          position={controls.bookPos}
          rotation={controls.bookRot}
          scale={controls.bookScale}
        >
          {/* <Book /> */}
        </group>
      )}

      {/* Caustics Generator: Casts organic refractive highlights onto the book, stool, and room floor */}
      {!controls.storyMode && (
        <Caustics
          color={controls.causticsColor ?? "#ffb029"}
          intensity={controls.causticsIntensity ?? 1.5}
          ior={controls.causticsIor ?? 1.26}
          worldRadius={controls.causticsWorldRadius ?? 2.1}
          backside={controls.causticsBackside ?? true}
          lightSource={controls.storyMode ? storyViews[0].lightPos : controls.lightPos}
          causticsOnly
        >
          {/* Render a high-frequency refracting shape that generates detailed caustic patterns */}
          <mesh position={[2.5, 3.2, 2.0]}>
            <torusKnotGeometry args={[0.4, 0.15, 128, 16]} />
          </mesh>
        </Caustics>
      )}

      {/* Stool - Independent in Editor Mode, follows Book via ref in Story Mode */}
      {!controls.storyMode && controls.showStool !== false && (
        <group ref={stoolGroupRef}>
          <group position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <Stool />
          </group>
        </group>
      )}

      {/* OrbitControls disabled in Story Mode to let scroll take control */}
      <OrbitControls ref={controlsRef} enabled={!controls.storyMode} />

      {/* Warm ambient room bounce light */}
      <ambientLight
        intensity={controls.ambientIntensity ?? 0.35}
        color={controls.ambientColor ?? "#ffecd2"}
      />
      
      {/* Key Light (Dynamic / Curated sunlight beam with shadow mapping) */}
      <directionalLight
        ref={dirLightRef}
        position={controls.storyMode ? storyViews[0].lightPos : controls.lightPos}
        intensity={controls.storyMode ? storyViews[0].lightIntensity : controls.lightIntensity}
        color={controls.storyMode ? storyViews[0].lightColor : controls.lightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-bias={-0.0004}
      />

      {/* Warm fill light (bounce simulation) */}
      <directionalLight
        position={[-4, 6, -4]}
        intensity={controls.fillLightIntensity ?? 0.4}
        color="#e8d5b7"
        castShadow={false}
      />

      {/* Additional custom light sources (Light A and Light B) */}
      <RenderLight
        lightRef={lightARef}
        type={controls.lightAType ?? "SpotLight"}
        position={controls.lightAPos ?? [-3, 4, 3]}
        color={controls.lightAColor ?? "#ffaa44"}
        intensity={controls.lightAIntensity ?? 1.5}
        angle={controls.lightAAngle ?? 0.6}
        penumbra={controls.lightAPenumbra ?? 0.5}
      />

      <RenderLight
        type={controls.lightBType ?? "PointLight"}
        position={controls.lightBPos ?? [2, -2, 3]}
        color={controls.lightBColor ?? "#44aaff"}
        intensity={controls.lightBIntensity ?? 1.0}
        angle={controls.lightBAngle ?? 0.8}
        penumbra={controls.lightBPenumbra ?? 0.3}
      />

      {/* Visual representation of custom light bulbs in Editor Mode */}
      {!controls.storyMode && controls.showLightHelper && (
        <>
          <mesh position={controls.lightAPos ?? [-3, 4, 3]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color={controls.lightAColor ?? "#ffaa44"} />
          </mesh>
          <mesh position={controls.lightBPos ?? [2, -2, 3]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color={controls.lightBColor ?? "#44aaff"} />
          </mesh>
        </>
      )}

      {/* Shadow Blocker Meshes */}
      <mesh
        position={controls.blocker1Pos ?? [-1.5, 2.0, 1.5]}
        rotation={controls.blocker1Rot ?? [0.0, 0.5, 0.0]}
        scale={controls.blocker1Scale ?? [0.1, 2.0, 0.5]}
        castShadow
      >
        <boxGeometry />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={controls.showBlockers ? 0.4 : 0.0}
          depthWrite={!!controls.showBlockers}
        />
      </mesh>

      <mesh
        position={controls.blocker2Pos ?? [-1.2, 1.8, 1.3]}
        rotation={controls.blocker2Rot ?? [0.0, 0.5, 0.0]}
        scale={controls.blocker2Scale ?? [0.1, 2.0, 0.5]}
        castShadow
      >
        <boxGeometry />
        <meshStandardMaterial
          color="#fb7185"
          transparent
          opacity={controls.showBlockers ? 0.4 : 0.0}
          depthWrite={!!controls.showBlockers}
        />
      </mesh>

      {/* Natural Environment Reflections */}
      <Environment preset="apartment" />

      {/* 3D Room */}
      {controls.showRoom !== false && <Room />}

      {/* Grid and Axes Visual Helpers (Visible only in Editor Mode) */}
      {!controls.storyMode && controls.showGridHelper && (
        <>
          <gridHelper args={[20, 20, "#ff3333", "#888888"]} position-y={-1.49} />
          <axesHelper args={[5]} position-y={-1.49} />
        </>
      )}

      {/* Camera Frustum Helper (Renders a dummy viewpoint perspective camera) */}
      {!controls.storyMode && controls.showCameraHelper && (
        <perspectiveCamera
          ref={setDummyCamera}
          position={controls.cameraPos}
          fov={controls.cameraFov}
          aspect={1.6}
          near={0.1}
          far={10}
        />
      )}
      {dummyCamera && !controls.storyMode && controls.showCameraHelper && (
        <primitive object={new THREE.CameraHelper(dummyCamera)} />
      )}
    </>
  );
};
