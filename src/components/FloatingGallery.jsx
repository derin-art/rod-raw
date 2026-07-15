import React, { useState, useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, useScroll, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { easing } from "maath";
import { useAtom } from "jotai";
import { getImagePath } from "./Book";
import { pictures, flippedPhotoAtom } from "./UI";

const LAYOUT_SLOTS = [
  { x: -1.6, y: 0.95 },   // 0: Top-Left
  { x: 1.6, y: 0.95 },    // 1: Top-Right
  { x: 0.0, y: 0.0 },     // 2: Center
  { x: -1.6, y: -0.95 },  // 3: Bottom-Left
  { x: 1.6, y: -0.95 }    // 4: Bottom-Right
];

const getSlotIndexInLayout = (setIndex, slotIndex) => {
  if (setIndex === 4) {
    if (slotIndex === 0) return 0; // Top-Left
    if (slotIndex === 1) return 2; // Center
    return 4; // Bottom-Right
  }
  return slotIndex;
};

export const generatePhotoLayout = () => {
  return pictures.map((name, i) => {
    let setIndex = 0;
    let slotIndex = 0;
    
    // Divide 23 pictures: Set 0 (5), Set 1 (5), Set 2 (5), Set 3 (5), Set 4 (3)
    if (i < 5) {
      setIndex = 0;
      slotIndex = i;
    } else if (i < 10) {
      setIndex = 1;
      slotIndex = i - 5;
    } else if (i < 15) {
      setIndex = 2;
      slotIndex = i - 10;
    } else if (i < 20) {
      setIndex = 3;
      slotIndex = i - 15;
    } else {
      setIndex = 4;
      slotIndex = i - 20;
    }
    
    // Set 0 at Z=21, Set 1 at Z=17.5, Set 2 at Z=14.0, Set 3 at Z=10.5, Set 4 at Z=7.0
    const baseZ = setIndex === 0 ? 21 
                : setIndex === 1 ? 17.5 
                : setIndex === 2 ? 14.0 
                : setIndex === 3 ? 10.5 
                : 7.0;
    
    const seed = i * 235.617;
    // Uniform, clean layout with minor organic variance to prevent overlaps
    const jitterX = Math.sin(seed) * 0.15;
    const jitterY = Math.cos(seed * 1.4) * 0.12;
    
    // Maintain depth variance to make the 3D parallax feel premium
    let jitterZ = Math.sin(seed * 2.3) * 0.25;
    
    // For the center slot (slotIndex 2 in Set 0, 1, 2, 3 and slotIndex 1 in Set 4)
    const isCenter = (setIndex < 4 && slotIndex === 2) || (setIndex === 4 && slotIndex === 1);
    if (isCenter) {
      // Center image is always closest to the camera (higher Z, no backward push)
      jitterZ = 0.35 + Math.abs(jitterZ);
    }
    
    const rotation = Math.sin(seed * 3.1) * 0.03; // very subtle organic rotation tilt
    
    // Base scale is [1.02, 1.36, 1] with +/- 5% organic scale variance
    const scaleJitter = 0.95 + ((Math.sin(seed * 4.7) + 1.0) * 0.5) * 0.1;
    const baseScale = [1.02, 1.36, 1];
    const finalScale = [baseScale[0] * scaleJitter, baseScale[1] * scaleJitter, baseScale[2]];
    
    const slotIdx = getSlotIndexInLayout(setIndex, slotIndex);
    const slot = LAYOUT_SLOTS[slotIdx];
    
    return {
      name,
      index: i,
      setIndex,
      position: [slot.x + jitterX, slot.y + jitterY, baseZ + jitterZ],
      rotation: [0, 0, rotation],
      scale: finalScale
    };
  });
};

const getSetTargetOpacity = (setIndex, progress) => {
  if (setIndex === 0) {
    if (progress <= 0.15) return 1.0;
    if (progress <= 0.20) return 1.0 - (progress - 0.15) / 0.05;
    return 0.0;
  } else if (setIndex === 1) {
    if (progress < 0.15) return 0.0;
    if (progress <= 0.20) return (progress - 0.15) / 0.05;
    if (progress <= 0.35) return 1.0;
    if (progress <= 0.40) return 1.0 - (progress - 0.35) / 0.05;
    return 0.0;
  } else if (setIndex === 2) {
    if (progress < 0.35) return 0.0;
    if (progress <= 0.40) return (progress - 0.35) / 0.05;
    if (progress <= 0.55) return 1.0;
    if (progress <= 0.60) return 1.0 - (progress - 0.55) / 0.05;
    return 0.0;
  } else if (setIndex === 3) {
    if (progress < 0.55) return 0.0;
    if (progress <= 0.60) return (progress - 0.55) / 0.05;
    if (progress <= 0.75) return 1.0;
    if (progress <= 0.80) return 1.0 - (progress - 0.75) / 0.05;
    return 0.0;
  } else if (setIndex === 4) {
    if (progress < 0.75) return 0.0;
    if (progress <= 0.80) return (progress - 0.75) / 0.05;
    if (progress <= 0.95) return 1.0;
    if (progress <= 1.00) return 1.0 - (progress - 0.95) / 0.05;
    return 0.0;
  }
  return 0.0;
};

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tex;
  uniform float blur;
  uniform float opacity;
  uniform vec3 color;
  uniform float saturation;
  uniform float contrast;
  varying vec2 vUv;

  void main() {
    vec4 col = vec4(0.0);
    float total = 0.0;
    
    // 5x5 box blur kernel
    float step = blur * 0.015;
    for (float x = -2.0; x <= 2.0; x += 1.0) {
      for (float y = -2.0; y <= 2.0; y += 1.0) {
        vec2 offset = vec2(x, y) * step;
        col += texture2D(tex, vUv + offset);
        total += 1.0;
      }
    }
    
    vec4 finalColor = col / total;
    vec3 rgb = finalColor.rgb * color;
    
    // Apply contrast tuning
    rgb = (rgb - 0.58) * contrast + 0.5;
    
    // Apply saturation boost
    float luma = dot(rgb, vec3(0.2126, 0.4152, 0.0722));
    rgb = mix(vec3(luma), rgb, saturation);
    
    gl_FragColor = vec4(rgb, finalColor.a * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const getSetTargetBlur = (setIndex, progress) => {
  if (setIndex === 0) {
    if (progress <= 0.15) return 0.0;
    if (progress <= 0.20) {
      const t = (progress - 0.15) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    return 0.0;
  } else if (setIndex === 1) {
    if (progress < 0.15) return 0.0;
    if (progress <= 0.20) {
      const t = (progress - 0.15) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    if (progress <= 0.35) return 0.0;
    if (progress <= 0.40) {
      const t = (progress - 0.35) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    return 0.0;
  } else if (setIndex === 2) {
    if (progress < 0.35) return 0.0;
    if (progress <= 0.40) {
      const t = (progress - 0.35) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    if (progress <= 0.55) return 0.0;
    if (progress <= 0.60) {
      const t = (progress - 0.55) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    return 0.0;
  } else if (setIndex === 3) {
    if (progress < 0.55) return 0.0;
    if (progress <= 0.60) {
      const t = (progress - 0.55) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    if (progress <= 0.75) return 0.0;
    if (progress <= 0.80) {
      const t = (progress - 0.75) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    return 0.0;
  } else if (setIndex === 4) {
    if (progress < 0.75) return 0.0;
    if (progress <= 0.80) {
      const t = (progress - 0.75) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    if (progress <= 0.95) return 0.0;
    if (progress <= 1.00) {
      const t = (progress - 0.95) / 0.05;
      return 1.0 - Math.abs(t - 0.5) * 2.0;
    }
    return 0.0;
  }
  return 0.0;
};

export const getBackImagePath = (index) => {
  // Fallback to back-1.png for now
  return `/images/photos/back of photos/back-1.png`;
};

const FloatingPhoto = ({ photo, flippedPhoto, setFlippedPhoto }) => {
  const ref = useRef();
  const [hovered, setHovered] = useState(false);
  const scroll = useScroll();
  const texture = useTexture(getImagePath(photo.name));
  const backTexture = useTexture(getBackImagePath(photo.index));
  
  useCursor(hovered);
  
  const isFlipped = flippedPhoto === photo.index;
  
  const frontUniforms = useMemo(() => ({
    tex: { value: null },
    blur: { value: 0.0 },
    opacity: { value: 0.0 },
    color: { value: new THREE.Color(1.0, 1.0, 1.0) },
    saturation: { value: 1.2 },
    contrast: { value: 1 }
  }), []);

  const backUniforms = useMemo(() => ({
    tex: { value: null },
    blur: { value: 0.0 },
    opacity: { value: 0.0 },
    color: { value: new THREE.Color(1.0, 1.0, 1.0) },
    saturation: { value: 1.2 },
    contrast: { value: 1 }
  }), []);

  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      frontUniforms.tex.value = texture;
    }
  }, [texture, frontUniforms]);

  useEffect(() => {
    if (backTexture) {
      backTexture.colorSpace = THREE.SRGBColorSpace;
      backUniforms.tex.value = backTexture;
    }
  }, [backTexture, backUniforms]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    // Compute target opacity and blur based on scroll progress through gallery phase
    const offset = scroll.offset;
    const galleryProgress = Math.min(Math.max(offset / 0.8, 0), 1);
    const targetOpacity = getSetTargetOpacity(photo.setIndex, galleryProgress);
    const targetBlur = getSetTargetBlur(photo.setIndex, galleryProgress);
    
    // Smoothly interpolate opacity and blur
    easing.damp(frontUniforms.opacity, "value", targetOpacity, 0.2, delta);
    easing.damp(frontUniforms.blur, "value", targetBlur, 0.2, delta);
    easing.damp(backUniforms.opacity, "value", targetOpacity, 0.2, delta);
    easing.damp(backUniforms.blur, "value", targetBlur, 0.2, delta);
    
    ref.current.visible = frontUniforms.opacity.value > 0.01;
    
    if (!ref.current.visible) return;
    
    // Smoothly interpolate color brightness and saturation on hover
    const targetColor = hovered ? 1.15 : 1.0;
    const targetSaturation = hovered ? 1.48 : 1.2;
    
    // Front materials
    easing.damp(frontUniforms.color.value, "r", targetColor, 0.15, delta);
    easing.damp(frontUniforms.color.value, "g", targetColor, 0.15, delta);
    easing.damp(frontUniforms.color.value, "b", targetColor, 0.15, delta);
    easing.damp(frontUniforms.saturation, "value", targetSaturation, 0.15, delta);
    
    // Back materials
    easing.damp(backUniforms.color.value, "r", targetColor, 0.15, delta);
    easing.damp(backUniforms.color.value, "g", targetColor, 0.15, delta);
    easing.damp(backUniforms.color.value, "b", targetColor, 0.15, delta);
    easing.damp(backUniforms.saturation, "value", targetSaturation, 0.15, delta);
    
    // Smooth hover scale
    const hoverScaleFactor = hovered ? 1.06 : 1.0;
    easing.damp3(
      ref.current.scale,
      [photo.scale[0] * hoverScaleFactor, photo.scale[1] * hoverScaleFactor, photo.scale[2]],
      0.15,
      delta
    );

    // Smooth Y rotation flip and tilt based on mouse hover when flipped
    let targetRotX = 0.0;
    let targetRotY = isFlipped ? Math.PI : 0.0;
    if (isFlipped && hovered) {
      targetRotX = -state.mouse.y * 0.14;
      targetRotY = Math.PI - state.mouse.x * 0.16;
    }
    easing.damp(ref.current.rotation, "x", targetRotX, 0.25, delta);
    easing.damp(ref.current.rotation, "y", targetRotY, 0.25, delta);

    // Translate slightly forward on Z axis when flipped to prevent intersection clipping
    const targetZ = photo.position[2] + (isFlipped ? 0.8 : 0.0);
    easing.damp(ref.current.position, "z", targetZ, 0.25, delta);
    
    // Gentle organic floating/breathing movement when active
    const time = state.clock.elapsedTime;
    const floatY = Math.sin(time * 1.2 + photo.index * 1.5) * 0.06;
    const floatRotZ = Math.cos(time * 0.8 + photo.index * 2.0) * 0.025;
    
    // Shift along Y axis if flipped and located at the bottom (y = -0.95) or top (y = 0.95)
    const isBottomSlot = photo.position[1] < -0.5;
    const isTopSlot = photo.position[1] > 0.5;
    let targetYOffset = 0.0;
    if (isFlipped) {
      if (isBottomSlot) targetYOffset = 0.65;
      else if (isTopSlot) targetYOffset = -0.65;
    }
    
    // Add loose, fluid mouse shift on Y and X when hovered and flipped
    const mouseShiftX = isFlipped && hovered ? state.mouse.x * 0.16 : 0.0;
    const mouseShiftY = isFlipped && hovered ? state.mouse.y * 0.16 : 0.0;

    const targetX = photo.position[0] + mouseShiftX;
    const targetY = photo.position[1] + targetYOffset + mouseShiftY + floatY;
    
    easing.damp(ref.current.position, "x", targetX, 0.25, delta);
    easing.damp(ref.current.position, "y", targetY, 0.25, delta);
    ref.current.rotation.z = photo.rotation[2] + floatRotZ;
  });
  
  return (
    <group
      ref={ref}
      position={[photo.position[0], photo.position[1], photo.position[2]]}
      rotation={photo.rotation}
      onClick={(e) => {
        e.stopPropagation();
        setFlippedPhoto(isFlipped ? null : photo.index);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {/* Front Face */}
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={frontUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      
      {/* Back Face */}
      <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
        <planeGeometry />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={backUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export const FloatingGallery = () => {
  const layout = useMemo(() => generatePhotoLayout(), []);
  const [flippedPhoto, setFlippedPhoto] = useAtom(flippedPhotoAtom);
  const scroll = useScroll();
  const lastActiveSet = useRef(0);

  useFrame(() => {
    // Automatically flip back if the user scrolls to a different set or approaches the book
    const offset = scroll.offset;
    const galleryProgress = Math.min(Math.max(offset / 0.8, 0), 1);
    const currentSetIndex = Math.min(4, Math.floor(galleryProgress / 0.2));

    if (offset >= 0.8 || currentSetIndex !== lastActiveSet.current) {
      if (flippedPhoto !== null) {
        setFlippedPhoto(null);
      }
    }
    lastActiveSet.current = currentSetIndex;
  });
  
  return (
    <group>
      {layout.map((photo) => (
        <FloatingPhoto
          key={photo.index}
          photo={photo}
          flippedPhoto={flippedPhoto}
          setFlippedPhoto={setFlippedPhoto}
        />
      ))}
    </group>
  );
};
