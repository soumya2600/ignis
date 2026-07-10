import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const FireParticles = () => {
  const ref = useRef<THREE.Points>(null!);
  const count = 500;
  
  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // spread particles out
      pos[i * 3] = (Math.random() - 0.5) * 30; // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15 - 5; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 2; // z
      rand[i] = Math.random();
    }
    return [pos, rand];
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        // move up
        positions[i * 3 + 1] += delta * (0.5 + randoms[i]);
        // slight drift
        positions[i * 3] += Math.sin(state.clock.elapsedTime * 0.5 + randoms[i] * 10) * delta * 0.2;
        
        // reset if too high
        if (positions[i * 3 + 1] > 10) {
          positions[i * 3 + 1] = -10;
        }
      }
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#EA580C"
        size={0.12}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.8}
      />
    </Points>
  );
};

export default function FireAnimation() {
  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <fog attach="fog" args={['#04100C', 1, 15]} />
        <ambientLight intensity={0.5} />
        <FireParticles />
      </Canvas>
    </div>
  );
}
