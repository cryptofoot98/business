import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PackingResult } from '../../types';

interface Props {
  result: PackingResult;
  productColors: string[];
  depthPct: number;
  cameraKey: number;
}

type Box = { x: number; y: number; z: number; l: number; w: number; h: number; productId: string };

const BOX_SHRINK = 0.984;

// ── Cardboard boxes via InstancedMesh ─────────────────────────────────────────
function ProductInstances({
  allBoxes, visibleBoxes, hexColor, containerL, containerW,
}: {
  allBoxes: Box[]; visibleBoxes: Box[];
  hexColor: string; containerL: number; containerW: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.0 }),
    [],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const base = new THREE.Color(hexColor);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();

    visibleBoxes.forEach((box, i) => {
      p.set(
        box.x + box.l / 2 - containerL / 2,
        box.z + box.h / 2,
        box.y + box.w / 2 - containerW / 2,
      );
      s.set(box.l * BOX_SHRINK, box.h * BOX_SHRINK, box.w * BOX_SHRINK);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);

      // Depth shading + slight top-face brightness variation
      const depth = Math.min(box.y / Math.max(containerW, 1), 1);
      const brightness = 1 - 0.38 * depth;
      mesh.setColorAt(i, base.clone().multiplyScalar(brightness));
    });

    mesh.count = visibleBoxes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [visibleBoxes, hexColor, containerL, containerW]);

  if (allBoxes.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, allBoxes.length]}
      castShadow
      receiveShadow
    />
  );
}

// ── Realistic container shell ─────────────────────────────────────────────────
function ContainerShell({ L, H, W }: { L: number; H: number; W: number }) {
  const WALL_T = 2;   // wall thickness cm
  const FLOOR_T = 4;  // floor thickness

  // Corrugation ribs — vertical on side walls & ceiling
  const ribsGeo = useMemo(() => {
    const pts: number[] = [];
    const ribSpacing = 44; // ~44cm between ribs (realistic for ISO container)
    const ribCount = Math.max(4, Math.round(L / ribSpacing));
    for (let i = 0; i <= ribCount; i++) {
      const rx = -L / 2 + (L / ribCount) * i;
      // Left wall
      pts.push(rx, 0, -W / 2, rx, H, -W / 2);
      // Right wall
      pts.push(rx, 0, W / 2, rx, H, W / 2);
      // Ceiling
      pts.push(rx, H, -W / 2, rx, H, W / 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [L, H, W]);

  // Floor planks — horizontal lines along Z for wood plank look
  const planksGeo = useMemo(() => {
    const pts: number[] = [];
    const plankCount = Math.max(3, Math.round(W / 20));
    for (let i = 0; i <= plankCount; i++) {
      const rz = -W / 2 + (W / plankCount) * i;
      pts.push(-L / 2, FLOOR_T / 2, rz, L / 2, FLOOR_T / 2, rz);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [L, W]);

  // Main structural frame edges
  const frameGeo = useMemo(() => {
    const pts: number[] = [
      // Bottom rectangle
      -L/2,0,-W/2, L/2,0,-W/2,
      -L/2,0, W/2, L/2,0, W/2,
      -L/2,0,-W/2,-L/2,0, W/2,
       L/2,0,-W/2, L/2,0, W/2,
      // Top rectangle
      -L/2,H,-W/2, L/2,H,-W/2,
      -L/2,H, W/2, L/2,H, W/2,
      -L/2,H,-W/2,-L/2,H, W/2,
       L/2,H,-W/2, L/2,H, W/2,
      // Vertical corner posts
      -L/2,0,-W/2,-L/2,H,-W/2,
      -L/2,0, W/2,-L/2,H, W/2,
       L/2,0,-W/2, L/2,H,-W/2,
       L/2,0, W/2, L/2,H, W/2,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [L, H, W]);

  return (
    <group>
      {/* Left wall */}
      <mesh position={[0, H / 2, -W / 2 + WALL_T / 2]} receiveShadow>
        <boxGeometry args={[L, H, WALL_T]} />
        <meshStandardMaterial color="#6b8fa8" roughness={0.55} metalness={0.4} side={THREE.FrontSide} />
      </mesh>

      {/* Right wall */}
      <mesh position={[0, H / 2, W / 2 - WALL_T / 2]} receiveShadow>
        <boxGeometry args={[L, H, WALL_T]} />
        <meshStandardMaterial color="#6b8fa8" roughness={0.55} metalness={0.4} side={THREE.FrontSide} />
      </mesh>

      {/* Back wall */}
      <mesh position={[L / 2 - WALL_T / 2, H / 2, 0]} receiveShadow>
        <boxGeometry args={[WALL_T, H, W]} />
        <meshStandardMaterial color="#5e7e96" roughness={0.6} metalness={0.35} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, H - WALL_T / 2, 0]} receiveShadow>
        <boxGeometry args={[L, WALL_T, W]} />
        <meshStandardMaterial color="#6b8fa8" roughness={0.55} metalness={0.4} side={THREE.FrontSide} />
      </mesh>

      {/* Wooden floor */}
      <mesh position={[0, FLOOR_T / 2, 0]} receiveShadow>
        <boxGeometry args={[L - 1, FLOOR_T, W - 1]} />
        <meshStandardMaterial color="#7a5822" roughness={0.88} metalness={0.01} />
      </mesh>

      {/* Floor plank lines */}
      <lineSegments geometry={planksGeo}>
        <lineBasicMaterial color="#5c3d10" opacity={0.35} transparent />
      </lineSegments>

      {/* Corrugation detail */}
      <lineSegments geometry={ribsGeo}>
        <lineBasicMaterial color="#4a6e85" opacity={0.55} transparent />
      </lineSegments>

      {/* Structural frame */}
      <lineSegments geometry={frameGeo}>
        <lineBasicMaterial color="#2c3e4f" opacity={0.9} transparent />
      </lineSegments>
    </group>
  );
}

// ── Shadow-receiving ground plane ─────────────────────────────────────────────
function Ground({ L, W }: { L: number; W: number }) {
  const size = Math.max(L, W) * 2.5;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color="#e8dcc4" roughness={1} metalness={0} />
    </mesh>
  );
}

// ── Reefer clearance zone ─────────────────────────────────────────────────────
function ReeferZone({ L, H, W, topClear }: { L: number; H: number; W: number; topClear: number }) {
  if (topClear <= 0) return null;
  return (
    <mesh position={[0, H - topClear / 2, 0]}>
      <boxGeometry args={[L - 4, topClear, W - 4]} />
      <meshStandardMaterial color="#ef4444" opacity={0.1} transparent depthWrite={false} />
    </mesh>
  );
}

// ── Camera setup ──────────────────────────────────────────────────────────────
function CameraSetup({ L, H, W }: { L: number; H: number; W: number }) {
  const { camera } = useThree();
  useEffect(() => {
    // Position camera at front-left corner, elevated — looking into the container
    camera.position.set(-L * 0.42, H * 1.55, W * 3.2);
    camera.lookAt(L * 0.1, H * 0.38, 0);
    camera.updateProjectionMatrix();
  }, [camera, L, H, W]);
  return null;
}

// ── Main scene ────────────────────────────────────────────────────────────────
function Scene({ result, productColors, depthPct }: Omit<Props, 'cameraKey'>) {
  const { innerLength: L, innerWidth: W, innerHeight: H } = result.container;
  const depthLimit = depthPct < 100 ? (depthPct / 100) * W : Infinity;

  const allByProduct = useMemo(() => {
    const g: Record<string, Box[]> = {};
    for (const b of result.packedBoxes) {
      if (!g[b.productId]) g[b.productId] = [];
      g[b.productId].push(b);
    }
    return g;
  }, [result.packedBoxes]);

  const visibleByProduct = useMemo(() => {
    const g: Record<string, Box[]> = {};
    for (const b of result.packedBoxes) {
      if (b.y > depthLimit) continue;
      if (!g[b.productId]) g[b.productId] = [];
      g[b.productId].push(b);
    }
    return g;
  }, [result.packedBoxes, depthLimit]);

  const topClear = result.container.category === 'Reefer' ? 25 : 0;

  return (
    <>
      {/* Sky/ground ambient */}
      <hemisphereLight args={['#c8dff0', '#2a3520', 0.55]} />

      {/* Key light (sun) — front-right above, casts shadows */}
      <directionalLight
        position={[L * 0.6, H * 3.5, W * 2.5]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={L * 6}
        shadow-camera-left={-L * 1.2}
        shadow-camera-right={L * 1.2}
        shadow-camera-top={H * 4}
        shadow-camera-bottom={-H}
        shadow-bias={-0.001}
      />

      {/* Fill light — left side, soft blue-green tint */}
      <directionalLight
        position={[-L * 0.6, H * 1.2, -W]}
        intensity={0.42}
        color="#a8c8e0"
      />

      {/* Rim/back light — lifts the back of the container */}
      <directionalLight
        position={[L * 0.8, H * 0.5, -W * 0.8]}
        intensity={0.22}
        color="#d0e8d0"
      />

      <CameraSetup L={L} H={H} W={W} />
      <Ground L={L} W={W} />
      <ContainerShell L={L} H={H} W={W} />
      {topClear > 0 && <ReeferZone L={L} H={H} W={W} topClear={topClear} />}

      {result.productResults.map((pr, i) => {
        const all = allByProduct[pr.product.id] ?? [];
        const visible = visibleByProduct[pr.product.id] ?? [];
        return (
          <ProductInstances
            key={`${pr.product.id}-${all.length}`}
            allBoxes={all}
            visibleBoxes={visible}
            hexColor={productColors[i] ?? '#4a9e6b'}
            containerL={L}
            containerW={W}
          />
        );
      })}
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export function ContainerView3D({ result, productColors, depthPct, cameraKey }: Props) {
  const { innerLength: L, innerWidth: W, innerHeight: H } = result.container;
  const maxDim = Math.max(L, W, H);

  return (
    <Canvas
      key={`${result.container.id}-${cameraKey}`}
      shadows="soft"
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      camera={{
        position: [-L * 0.42, H * 1.55, W * 3.2],
        fov: 42,
        near: 1,
        far: maxDim * 16,
      }}
      style={{
        // Soft warm-cream backdrop so the container reads against the page palette.
        background: 'linear-gradient(180deg, #fef7e8 0%, #fde9c8 100%)',
      }}
    >
      <OrbitControls
        target={[L * 0.1, H * 0.38, 0]}
        minDistance={maxDim * 0.15}
        maxDistance={maxDim * 6}
        enablePan
        enableDamping
        dampingFactor={0.07}
        maxPolarAngle={Math.PI * 0.88}
      />
      <Scene result={result} productColors={productColors} depthPct={depthPct} />
    </Canvas>
  );
}
