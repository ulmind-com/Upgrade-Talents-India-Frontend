"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron, TorusKnot, MeshDistortMaterial } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";

/* Reactive particle field — the "stage dust" behind the hero. */
function ParticleField({ count = 1400, color = "#ff2e88" }: { count?: number; color?: string }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.045;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color={color}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* Morphing core object that tracks the pointer. */
function MorphCore({ accent = "#6d4dff" }: { accent?: string }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    const { x, y } = state.pointer;
    group.current.rotation.y += delta * 0.22;
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, y * 0.35, 0.05);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, x * 0.6, 0.04);
  });

  return (
    <group ref={group}>
      <Float speed={1.6} rotationIntensity={0.7} floatIntensity={1.3}>
        <Icosahedron args={[1.65, 6]}>
          <MeshDistortMaterial
            color={accent}
            roughness={0.12}
            metalness={0.92}
            distort={0.38}
            speed={1.7}
            emissive={accent}
            emissiveIntensity={0.28}
          />
        </Icosahedron>
      </Float>

      <Float speed={1.1} rotationIntensity={1.4} floatIntensity={2}>
        <TorusKnot args={[3.1, 0.055, 180, 24]} rotation={[Math.PI / 2.6, 0, 0]}>
          <meshStandardMaterial color="#22d3ee" metalness={1} roughness={0.2} emissive="#22d3ee" emissiveIntensity={0.5} />
        </TorusKnot>
      </Float>
    </group>
  );
}

export default function Scene3D({
  accent = "#6d4dff",
  particle = "#ff2e88",
  className = "",
}: {
  accent?: string;
  particle?: string;
  className?: string;
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4;
    setEnabled(!reduce && !lowPower);
  }, []);

  if (!enabled) {
    return (
      <div className={className} aria-hidden>
        <div
          className="h-full w-full opacity-60"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accent}55, transparent 62%)`,
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 7.2], fov: 52 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <pointLight position={[6, 6, 6]} intensity={110} color={particle} />
          <pointLight position={[-7, -4, 3]} intensity={80} color="#22d3ee" />
          <spotLight position={[0, 9, 4]} angle={0.6} penumbra={1} intensity={60} color={accent} />
          <MorphCore accent={accent} />
          <ParticleField color={particle} />
        </Suspense>
      </Canvas>
    </div>
  );
}
