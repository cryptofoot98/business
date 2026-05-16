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

const BOX_SHRINK = 0.988;

// ── Product boxes using InstancedMesh (one draw call per product) ─────────────
function ProductInstances({
  allBoxes,
  visibleBoxes,
  hexColor,
  containerL,
  containerW,
}: {
  allBoxes: Box[];
  visibleBoxes: Box[];
  hexColor: string;
  containerL: number;
  containerW: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.04 }),
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
      // Map packing coords → Three.js (Y = up)
      // Packing: x=length, y=width, z=height
      p.set(
        box.x + box.l / 2 - containerL / 2,
        box.z + box.h / 2,
        box.y + box.w / 2 - containerW / 2,
      );
      s.set(box.l * BOX_SHRINK, box.h * BOX_SHRINK, box.w * BOX_SHRINK);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);

      // Depth shading: boxes deeper in container appear darker
      const t = Math.min(box.y / Math.max(containerW, 1), 1);
      mesh.setColorAt(i, base.clone().multiplyScalar(1 - 0.3 * t));
    });

    mesh.count = visibleBoxes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [visibleBoxes, hexColor, containerL, containerW]);

  if (allBoxes.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geo, mat, allBoxes.length]} />;
}

// ── Container shell (wireframe + floor + transparent walls) ──────────────────
function ContainerShell({ L, H, W }: { L: number; H: number; W: number }) {
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W)),
    [L, H, W],
  );

  // Corrugation ribs along the length
  const ribsGeo = useMemo(() => {
    const pts: number[] = [];
    const ribCount = Math.max(5, Math.floor(L / 55));
    for (let i = 1; i < ribCount; i++) {
      const rx = -L / 2 + (L / ribCount) * i;
      // Left wall rib
      pts.push(rx, -H / 2, -W / 2, rx, H / 2, -W / 2);
      // Right wall rib
      pts.push(rx, -H / 2, W / 2, rx, H / 2, W / 2);
      // Ceiling rib
      pts.push(rx, H / 2, -W / 2, rx, H / 2, W / 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [L, H, W]);

  return (
    <group position={[0, H / 2, 0]}>
      {/* Outer shell — very transparent, seen from outside */}
      <mesh>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial
          color="#f0fdf4"
          opacity={0.055}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Floor */}
      <mesh position={[0, -H / 2 + 0.5, 0]}>
        <boxGeometry args={[L - 1, 1, W - 1]} />
        <meshStandardMaterial color="#d1fae5" roughness={0.9} metalness={0.01} />
      </mesh>

      {/* Main wireframe edges */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#15803d" opacity={0.75} transparent />
      </lineSegments>

      {/* Corrugation ribs */}
      <lineSegments geometry={ribsGeo}>
        <lineBasicMaterial color="#16a34a" opacity={0.18} transparent />
      </lineSegments>
    </group>
  );
}

// ── Reefer clearance zone (transparent red slab at top) ──────────────────────
function ReeferZone({ L, H, W, topClear }: { L: number; H: number; W: number; topClear: number }) {
  if (topClear <= 0) return null;
  return (
    <mesh position={[0, H - topClear / 2, 0]}>
      <boxGeometry args={[L - 2, topClear, W - 2]} />
      <meshStandardMaterial color="#ef4444" opacity={0.08} transparent depthWrite={false} />
    </mesh>
  );
}

// ── Camera init helper (runs once inside Canvas) ──────────────────────────────
function CameraInit({ L, H, W }: { L: number; H: number; W: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, H / 2, 0);
  }, [camera, H]);
  void L; void W;
  return null;
}

// ── Main scene ────────────────────────────────────────────────────────────────
function Scene({
  result,
  productColors,
  depthPct,
}: Omit<Props, 'cameraKey'>) {
  const { innerLength: L, innerWidth: W, innerHeight: H } = result.container;
  const depthLimit = depthPct < 100 ? (depthPct / 100) * W : Infinity;

  // All boxes per product (controls InstancedMesh buffer size)
  const allByProduct = useMemo(() => {
    const g: Record<string, Box[]> = {};
    for (const b of result.packedBoxes) {
      if (!g[b.productId]) g[b.productId] = [];
      g[b.productId].push(b);
    }
    return g;
  }, [result.packedBoxes]);

  // Depth-filtered subset per product
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
      {/* 3-point lighting for natural depth */}
      <ambientLight intensity={0.48} />
      <directionalLight position={[L * 0.7, H * 2.5, W * 1.3]} intensity={1.15} />
      <directionalLight position={[-L * 0.5, H * 0.8, -W * 0.8]} intensity={0.38} color="#bbf7d0" />
      <directionalLight position={[L * 0.2, H * 0.3, W * 0.5]} intensity={0.18} />

      <CameraInit L={L} H={H} W={W} />
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
            hexColor={productColors[i] ?? '#16a34a'}
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
      gl={{ antialias: true, alpha: false }}
      camera={{
        position: [L * 0.55, H * 1.3, maxDim * 1.65],
        fov: 45,
        near: 1,
        far: maxDim * 14,
      }}
      style={{ background: '#eef7ee' }}
    >
      <OrbitControls
        target={[0, H / 2, 0]}
        minDistance={maxDim * 0.18}
        maxDistance={maxDim * 5.5}
        enablePan
        enableDamping
        dampingFactor={0.08}
      />
      <Scene result={result} productColors={productColors} depthPct={depthPct} />
    </Canvas>
  );
}
