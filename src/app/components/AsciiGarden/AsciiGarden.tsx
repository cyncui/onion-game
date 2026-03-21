"use client";

import { useEffect, useRef } from "react";

/**
 * ASCII-style garden rendered on a canvas.
 * Full-width, anchored to the bottom of the viewport.
 * Flowers are different heights with dithered stems and petals.
 */

// Palette — earthy greens and warm accent colors
const STEM_COLORS = ["#2d5016", "#4a7c2e", "#3a6623"];
const PETAL_COLORS = ["#c4956a", "#e8dcc8", "#d4a373", "#8fbc5a", "#b5c99a", "#f0e6d3"];
const LEAF_COLOR = "#4a7c2e";

interface Flower {
  x: number;         // x position (0-1 normalized)
  stemH: number;     // stem height in pixels
  petalSize: number;  // petal radius
  petalColor: string;
  stemColor: string;
  hasLeaves: boolean;
  swayOffset: number; // for slight position variation
}

function generateFlowers(count: number, _canvasW: number, canvasH: number): Flower[] {
  const flowers: Flower[] = [];
  const minH = canvasH * 0.08;
  const maxH = canvasH * 0.35;

  for (let i = 0; i < count; i++) {
    // Distribute across width with slight randomness
    const baseX = (i + 0.5) / count;
    const jitter = (Math.sin(i * 7.3) * 0.3) / count;

    flowers.push({
      x: baseX + jitter,
      stemH: minH + Math.abs(Math.sin(i * 3.7 + 1.2)) * (maxH - minH),
      petalSize: 3 + Math.abs(Math.sin(i * 5.1)) * 5,
      petalColor: PETAL_COLORS[i % PETAL_COLORS.length],
      stemColor: STEM_COLORS[i % STEM_COLORS.length],
      hasLeaves: i % 3 === 0,
      swayOffset: Math.sin(i * 2.1) * 4,
    });
  }

  return flowers;
}

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, pixelSize: number
) {
  ctx.fillStyle = color;
  const startCol = Math.floor(x / pixelSize);
  const startRow = Math.floor(y / pixelSize);
  const endCol = Math.ceil((x + w) / pixelSize);
  const endRow = Math.ceil((y + h) / pixelSize);

  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
    }
  }
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  flower: Flower,
  canvasW: number,
  canvasH: number,
  pixelSize: number
) {
  const px = flower.x * canvasW + flower.swayOffset;
  const groundY = canvasH;
  const topY = groundY - flower.stemH;
  const stemW = pixelSize * 2;

  // Stem
  drawPixelRect(ctx, px - stemW / 2, topY, stemW, flower.stemH, flower.stemColor, pixelSize);

  // Leaves (small horizontal bars on the stem)
  if (flower.hasLeaves) {
    const leafY = topY + flower.stemH * 0.4;
    drawPixelRect(ctx, px - pixelSize * 4, leafY, pixelSize * 3, pixelSize, LEAF_COLOR, pixelSize);
    const leafY2 = topY + flower.stemH * 0.65;
    drawPixelRect(ctx, px + pixelSize, leafY2, pixelSize * 3, pixelSize, LEAF_COLOR, pixelSize);
  }

  // Flower head — pixelated circle approximation
  const r = flower.petalSize;
  const cx = px;
  const cy = topY;

  ctx.fillStyle = flower.petalColor;
  // Draw a diamond/cross pattern for the flower head
  for (let dy = -r; dy <= r; dy++) {
    const halfW = Math.round(r - Math.abs(dy) * 0.6);
    for (let dx = -halfW; dx <= halfW; dx++) {
      const bx = Math.floor((cx + dx * pixelSize) / pixelSize) * pixelSize;
      const by = Math.floor((cy + dy * pixelSize) / pixelSize) * pixelSize;
      ctx.fillRect(bx, by, pixelSize, pixelSize);
    }
  }

  // Center dot
  ctx.fillStyle = "#6b503c";
  ctx.fillRect(
    Math.floor(cx / pixelSize) * pixelSize,
    Math.floor(cy / pixelSize) * pixelSize,
    pixelSize,
    pixelSize
  );
}

interface AsciiGardenProps {
  pixelSize?: number;
  flowerCount?: number;
}

export default function AsciiGarden({ pixelSize = 4, flowerCount = 40 }: AsciiGardenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      if (!canvas || !ctx) return;

      const w = window.innerWidth;
      const h = 280; // fixed garden height

      canvas.width = w;
      canvas.height = h;

      ctx.clearRect(0, 0, w, h);

      // Ground — a strip of earthy dithered color at the very bottom
      const groundH = pixelSize * 4;
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(0, h - groundH, w, groundH);

      // Ground dithering
      ctx.fillStyle = "#55392a";
      const groundCols = Math.floor(w / pixelSize);
      const groundRows = Math.floor(groundH / pixelSize);
      for (let r = 0; r < groundRows; r++) {
        for (let c = 0; c < groundCols; c++) {
          if ((c + r) % 3 === 0) {
            ctx.fillRect(c * pixelSize, (h - groundH) + r * pixelSize, pixelSize, pixelSize);
          }
        }
      }

      // Generate and draw flowers
      const flowers = generateFlowers(flowerCount, w, h);
      flowers.forEach((f) => drawFlower(ctx, f, w, h, pixelSize));
    }

    draw();

    function handleResize() {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(draw, 150);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
    };
  }, [pixelSize, flowerCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "280px",
        imageRendering: "pixelated",
        pointerEvents: "none",
      }}
    />
  );
}
