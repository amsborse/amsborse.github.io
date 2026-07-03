import { useEffect, useRef } from 'react';

interface QuantumMeshProps {
  nodeCount?: number;
  linkDistance?: number;
  nodeColor?: string;
  lineColor?: string;
  speed?: number;
  autoColor?: boolean;
}

export default function QuantumMesh({
  nodeCount = 140,
  linkDistance = 120,
  nodeColor = 'rgba(147, 51, 234, 0.8)',
  lineColor = 'rgba(147, 51, 234, 0.15)',
  speed = 1.0,
  autoColor = false,
}: QuantumMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    let hueOffset = 0;

    // Helper to generate a single node
    const createNode = (w: number, h: number) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * speed * 0.8,
      vy: (Math.random() - 0.5) * speed * 0.8,
      radius: Math.random() * 3 + 2.5,
    });

    const nodes: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Dynamically calculate node target based on area density (e.g., 1 node per 12,000 pixels)
      const targetCount = Math.max(80, Math.min(280, Math.floor((width * height) / 12000)));
      
      // Scale nodes array size to match the target count dynamically without resetting
      while (nodes.length < targetCount) {
        nodes.push(createNode(width, height));
      }
      if (nodes.length > targetCount) {
        nodes.splice(targetCount);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Resolve color for this frame
      let activeNodeColor = nodeColor;
      let activeLineColor = lineColor;

      if (autoColor) {
        hueOffset = (hueOffset + 0.3) % 360;
        activeNodeColor = `hsla(${hueOffset}, 85%, 60%, 0.9)`;
        activeLineColor = `hsla(${hueOffset}, 85%, 60%, 0.2)`;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist < linkDistance) {
            const alpha = (1 - dist / linkDistance) * 0.45;
            ctx.strokeStyle = autoColor ? `hsla(${hueOffset}, 85%, 60%, ${alpha})` : activeLineColor.replace(/[\d.]+\)$/, `${alpha})`);
            ctx.lineWidth = 1.0; // thicker lines
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Draw connections to mouse
        const mouseDist = Math.hypot(n1.x - mouseRef.current.x, n1.y - mouseRef.current.y);
        if (mouseDist < linkDistance * 1.6) {
          const alpha = (1 - mouseDist / (linkDistance * 1.6)) * 0.7;
          ctx.strokeStyle = autoColor ? `hsla(${hueOffset}, 85%, 65%, ${alpha})` : activeLineColor.replace(/[\d.]+\)$/, `${alpha})`);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.stroke();
        }
      }

      // Draw and update nodes
      for (const node of nodes) {
        // Glowing Aura Ring around node
        ctx.strokeStyle = autoColor ? `hsla(${hueOffset}, 85%, 60%, 0.25)` : activeLineColor.replace(/[\d.]+\)$/, '0.25)');
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = activeNodeColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        // Update positions
        node.x += node.vx;
        node.y += node.vy;

        // Mouse attraction force
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 200) {
          const force = (200 - dist) * 0.00012 * speed;
          node.vx += (dx / dist) * force;
          node.vy += (dy / dist) * force;
        }

        // Speed limit
        const currSpeed = Math.hypot(node.vx, node.vy);
        const maxSpeed = speed * 1.6;
        if (currSpeed > maxSpeed) {
          node.vx = (node.vx / currSpeed) * maxSpeed;
          node.vy = (node.vy / currSpeed) * maxSpeed;
        }

        // Wall collisions
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, [nodeCount, linkDistance, nodeColor, lineColor, speed, autoColor]);

  return <canvas ref={canvasRef} className="w-full h-full block bg-black/85" />;
}
