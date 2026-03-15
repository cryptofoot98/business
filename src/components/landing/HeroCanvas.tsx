import { useEffect, useRef } from 'react';

const BOX_COLORS = [
  '#c63320', '#d96a1c', '#1572b6', '#1a4f7a',
  '#df9a10', '#8b3a8a', '#2563a8', '#c05020',
  '#2d6a9a', '#b02a1a',
];

interface Box {
  col: number;
  row: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  color: string;
  progress: number;
  placed: boolean;
  delay: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const stateRef = useRef({
    boxes: [] as Box[],
    particles: [] as Particle[],
    phase: 'filling' as 'filling' | 'hold' | 'clearing',
    holdTimer: 0,
    clearProgress: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const COLS = 7;
    const ROWS = 3;
    const CONTAINER_W = 420;
    const CONTAINER_H = 200;
    const BOX_W = CONTAINER_W / COLS;
    const BOX_H = CONTAINER_H / ROWS;
    const DEPTH = 48;
    const SPEED = 0.035;

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function buildBoxes(cw: number, ch: number) {
      const cx = (cw - CONTAINER_W) / 2;
      const cy = (ch - CONTAINER_H) / 2 - 20;
      const boxes: Box[] = [];
      let idx = 0;
      for (let row = ROWS - 1; row >= 0; row--) {
        for (let col = 0; col < COLS; col++) {
          const tx = cx + col * BOX_W + 2;
          const ty = cy + row * BOX_H + 2;
          const fromLeft = Math.random() > 0.5;
          const sx = fromLeft ? cx - BOX_W * 3 : cx + CONTAINER_W + BOX_W * 3;
          const sy = ty + (Math.random() - 0.5) * 80;
          boxes.push({
            col, row, sx, sy,
            x: sx, y: sy,
            tx, ty,
            color: BOX_COLORS[(col + row * 2) % BOX_COLORS.length],
            progress: 0,
            placed: false,
            delay: idx * 4,
          });
          idx++;
        }
      }
      return boxes;
    }

    function buildParticles(cw: number, ch: number): Particle[] {
      const count = 30;
      const parts: Particle[] = [];
      for (let i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * cw,
          y: Math.random() * ch,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.15 + 0.05,
          color: BOX_COLORS[Math.floor(Math.random() * BOX_COLORS.length)],
        });
      }
      return parts;
    }

    function init() {
      resize();
      stateRef.current.boxes = buildBoxes(canvas.width, canvas.height);
      stateRef.current.particles = buildParticles(canvas.width, canvas.height);
      stateRef.current.phase = 'filling';
      stateRef.current.holdTimer = 0;
      stateRef.current.clearProgress = 0;
    }

    function drawContainer(cw: number, ch: number) {
      const cx = (cw - CONTAINER_W) / 2;
      const cy = (ch - CONTAINER_H) / 2 - 20;

      ctx.save();

      const topL = { x: cx, y: cy };
      const topR = { x: cx + CONTAINER_W, y: cy };
      const botR = { x: cx + CONTAINER_W, y: cy + CONTAINER_H };
      const botL = { x: cx, y: cy + CONTAINER_H };

      const dxOff = DEPTH * Math.cos(Math.PI / 6);
      const dyOff = -DEPTH * Math.sin(Math.PI / 6);

      const topRb = { x: topR.x + dxOff, y: topR.y + dyOff };
      const topLb = { x: topL.x + dxOff, y: topL.y + dyOff };
      const botRb = { x: botR.x + dxOff, y: botR.y + dyOff };

      ctx.fillStyle = 'rgba(27, 107, 64, 0.08)';
      ctx.beginPath();
      ctx.moveTo(topL.x, topL.y);
      ctx.lineTo(topLb.x, topLb.y);
      ctx.lineTo(topRb.x, topRb.y);
      ctx.lineTo(topR.x, topR.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(13, 13, 13, 0.4)';
      ctx.beginPath();
      ctx.moveTo(topR.x, topR.y);
      ctx.lineTo(topRb.x, topRb.y);
      ctx.lineTo(botRb.x, botRb.y);
      ctx.lineTo(botR.x, botR.y);
      ctx.closePath();
      ctx.fill();

      const stripeCount = COLS;
      for (let i = 1; i < stripeCount; i++) {
        const sx = cx + (CONTAINER_W / stripeCount) * i;
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, cy);
        ctx.lineTo(sx, cy + CONTAINER_H);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx, cy, CONTAINER_W, CONTAINER_H);

      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(topL.x, topL.y);
      ctx.lineTo(topLb.x, topLb.y);
      ctx.lineTo(topRb.x, topRb.y);
      ctx.lineTo(topR.x, topR.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(topR.x, topR.y);
      ctx.lineTo(topRb.x, topRb.y);
      ctx.lineTo(botRb.x, botRb.y);
      ctx.lineTo(botR.x, botR.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      const midY = cy + CONTAINER_H / 2;
      ctx.beginPath();
      ctx.moveTo(cx + CONTAINER_W - 20, cy + 8);
      ctx.lineTo(cx + CONTAINER_W - 20, cy + CONTAINER_H - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + CONTAINER_W - 20, midY);
      ctx.lineTo(cx + CONTAINER_W - 8, midY);
      ctx.stroke();

      ctx.restore();
    }

    function drawBox(box: Box, alpha = 1) {
      const bw = BOX_W - 4;
      const bh = BOX_H - 4;
      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.fillStyle = box.color;
      ctx.fillRect(box.x, box.y, bw, bh);

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(box.x, box.y, bw, 3);
      ctx.fillRect(box.x, box.y, 3, bh);

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(box.x + bw - 3, box.y, 3, bh);
      ctx.fillRect(box.x, box.y + bh - 3, bw, 3);

      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x + 0.5, box.y + 0.5, bw - 1, bh - 1);

      ctx.restore();
    }

    function drawGrid(cw: number, ch: number) {
      const spacing = 60;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < cw; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ch);
        ctx.stroke();
      }
      for (let y = 0; y < ch; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(cw, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    let frame = 0;
    function draw() {
      const { width: cw, height: ch } = canvas;
      const s = stateRef.current;

      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, cw, ch);

      drawGrid(cw, ch);

      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = cw + 10;
        if (p.x > cw + 10) p.x = -10;
        if (p.y < -10) p.y = ch + 10;
        if (p.y > ch + 10) p.y = -10;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
      }

      drawContainer(cw, ch);

      if (s.phase === 'filling') {
        for (const box of s.boxes) {
          if (box.placed) {
            drawBox(box);
          } else if (frame >= box.delay) {
            box.progress = Math.min(1, box.progress + SPEED);
            const t = easeOutCubic(box.progress);
            box.x = box.sx + (box.tx - box.sx) * t;
            box.y = box.sy + (box.ty - box.sy) * t;
            drawBox(box, box.progress);
            if (box.progress >= 1) {
              box.placed = true;
              box.x = box.tx;
              box.y = box.ty;
            }
          }
        }
        const allPlaced = s.boxes.every(b => b.placed);
        if (allPlaced) {
          s.phase = 'hold';
          s.holdTimer = 0;
        }
      } else if (s.phase === 'hold') {
        for (const box of s.boxes) drawBox(box);
        s.holdTimer++;
        if (s.holdTimer > 90) {
          s.phase = 'clearing';
          s.clearProgress = 0;
        }
      } else if (s.phase === 'clearing') {
        s.clearProgress = Math.min(1, s.clearProgress + 0.018);
        const t = easeOutCubic(s.clearProgress);
        for (const box of s.boxes) {
          const alpha = 1 - t;
          drawBox(box, alpha);
        }
        if (s.clearProgress >= 1) {
          stateRef.current.boxes = buildBoxes(canvas.width, canvas.height);
          s.phase = 'filling';
          s.holdTimer = 0;
          frame = 0;
        }
      }

      frame++;
      frameRef.current = requestAnimationFrame(draw);
    }

    const observer = new ResizeObserver(() => {
      resize();
      stateRef.current.boxes = buildBoxes(canvas.width, canvas.height);
      stateRef.current.particles = buildParticles(canvas.width, canvas.height);
    });
    observer.observe(canvas);

    init();
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
