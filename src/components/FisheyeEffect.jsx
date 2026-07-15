import React, { forwardRef, useMemo } from "react";
import { Effect, BlendFunction } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = `
  uniform float strength;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Center UV coordinates to [-0.5, 0.5]
    vec2 st = uv - 0.5;
    float r2 = st.x * st.x + st.y * st.y;
    
    // Distort UVs outwards (barrel distortion)
    // Strength is divided by 10 to give a finer range in the UI (e.g. 0 to 10)
    vec2 distortedUv = st * (1.0 + (strength / 10.0) * r2) + 0.5;
    
    if (distortedUv.x < 0.0 || distortedUv.x > 1.0 || distortedUv.y < 0.0 || distortedUv.y > 1.0) {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0); // Black screen padding for out-of-bound pixels
    } else {
      outputColor = texture2D(inputBuffer, distortedUv);
    }
  }
`;

class FisheyeEffectImpl extends Effect {
  constructor({ strength = 1.0 } = {}) {
    super("FisheyeEffect", fragmentShader, {
      blendFunction: BlendFunction.Normal,
      uniforms: new Map([["strength", new Uniform(strength)]]),
    });
  }
}

export const FisheyeEffect = forwardRef(({ strength = 1.0 }, ref) => {
  const effect = useMemo(() => new FisheyeEffectImpl({ strength }), []);

  // Update uniform value when prop changes
  React.useEffect(() => {
    if (effect.uniforms.has("strength")) {
      effect.uniforms.get("strength").value = strength;
    }
  }, [strength, effect]);

  return <primitive ref={ref} object={effect} dispose={null} />;
});
