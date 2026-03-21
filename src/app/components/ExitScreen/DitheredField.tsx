"use client";

import { useEffect, useRef } from "react";

/**
 * Bayer 4×4 ordered dithering matrix (normalized 0-1).
 */
const BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16],
];

interface DitheredFieldProps {
  pixelSize?: number;
}

export default function DitheredField({ pixelSize = 5 }: DitheredFieldProps) {
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
      const h = window.innerHeight;

      canvas.width = w;
      canvas.height = h;

      const cols = Math.floor(w / pixelSize);
      const rows = Math.floor(h / pixelSize);

      // Background gradient: dark green at top → cream at bottom
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, "rgb(26, 51, 10)");
      bgGrad.addColorStop(0.5, "rgb(60, 90, 40)");
      bgGrad.addColorStop(0.85, "#f5f2ee");
      bgGrad.addColorStop(1, "#f5f2ee");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Set fill once — all dithered dots are the same cream color
      ctx.fillStyle = "#f5f2ee";

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const ny = row / rows;
          const nx = col / cols;

          const baseDensity = Math.pow(ny, 1.2);

          const variation =
            Math.sin(nx * 12 + ny * 3) * 0.08 +
            Math.sin(nx * 25 + ny * 8) * 0.04 +
            Math.sin(nx * 50) * 0.02;

          const density = Math.max(0, Math.min(1, baseDensity + variation));
          const threshold = BAYER_4X4[row % 4][col % 4];

          if (density > threshold) {
            ctx.fillRect(
              col * pixelSize,
              row * pixelSize,
              pixelSize,
              pixelSize
            );
          }
        }
      }
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
  }, [pixelSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
      }}
    />
  );
}
