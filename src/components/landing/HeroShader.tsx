import { useEffect, useState } from 'react';
import {
  Shader,
  Circle,
  Dither,
  FlowingGradient,
  Glass,
  SolidColor,
  Tritone,
} from 'shaders/react';

export function HeroShader() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <Shader style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <Circle
        id="heroMask"
        center={{ x: 0.7, y: 0.5 }}
        radius={3}
        softness={0.67}
        visible={false}
      />
      <SolidColor color="#060E1A" />
      <FlowingGradient
        colorB="#9c9c9c"
        colorC="#a1a1a1"
        colorD="#d4d4d4"
        colorSpace="linear"
        distortion={0.2}
        maskSource="heroMask"
        seed={30}
      />
      <Glass
        aberration={0}
        center={{
          y: 0.5,
          type: 'mouse-position',
          reach: 0.05,
          originX: 0.44,
          originY: 0.50,
          momentum: 0.1,
          smoothing: 0.7,
        }}
        edgeSoftness={0.15}
        fresnel={0.15}
        fresnelSoftness={1}
        highlight={0.25}
        highlightSoftness={0.52}
        lightAngle={276}
        refraction={0.86}
        shape={{ type: 'ringSDF', radius: 0.69, thickness: 0.15 }}
        thickness={1}
      />
      <Tritone
        colorA="#060E1A"
        colorB="#3DB240"
        colorC="#E8FAE8"
        visible={true}
      />
      <Dither
        colorMode="source"
        pattern="blueNoise"
        pixelSize={2}
        threshold={0.62}
      />
    </Shader>
  );
}
