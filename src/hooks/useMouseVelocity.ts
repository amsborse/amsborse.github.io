import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export function useMouseVelocity() {
  const setMouseVelocity = useStore((state) => state.setMouseVelocity);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastTime = useRef(performance.now());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentTime = performance.now();
      const dt = currentTime - lastTime.current;

      if (dt > 0) {
        // Normalize coordinates to -1 to 1
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;

        const vx = (x - lastMousePos.current.x) / dt;
        const vy = (y - lastMousePos.current.y) / dt;

        setMouseVelocity({ x: vx, y: vy });

        lastMousePos.current = { x, y };
        lastTime.current = currentTime;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [setMouseVelocity]);
}
