"use client";

import { motion } from "framer-motion";
import { useDrawingEngine } from "./useDrawingEngine";
import { useDrawingContext } from "../DrawingProvider";
import styles from "./DrawingCanvas.module.css";

const COLORS = [
  "#2d5016", // deep green
  "#4a7c2e", // leaf green
  "#8fbc5a", // light green
  "#6b503c", // earth brown
  "#c4956a", // tan
  "#e8dcc8", // cream
];

const BRUSH_SIZES = [
  { label: "S", size: 5 },
  { label: "M", size: 12 },
  { label: "L", size: 22 },
];

export default function DrawingCanvas() {
  const { setDrawingDataURL, setIsDrawing } = useDrawingContext();
  const {
    canvasRef,
    undo,
    clear,
    getDataURL,
    currentColor,
    currentSize,
    setColor,
    setBrushSize,
    hasStrokes,
  } = useDrawingEngine();

  function handlePlantSeed() {
    const dataURL = getDataURL();
    setDrawingDataURL(dataURL);
    setIsDrawing(false);
  }

  return (
    <motion.div
      className={styles.wrapper}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <p className={styles.prompt}>Draw your companion for the journey</p>

      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {/* Pixel border overlay */}
        <div className={styles.borderOverlay}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/border-sm-frame.svg" alt="" />
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Colors */}
        <div className={styles.toolGroup}>
          {COLORS.map((color) => (
            <button
              key={color}
              className={styles.swatch}
              style={{ background: color }}
              data-active={currentColor === color}
              onClick={() => setColor(color)}
              aria-label={`Color ${color}`}
            />
          ))}
        </div>

        <div className={styles.divider} />

        {/* Brush sizes */}
        <div className={styles.toolGroup}>
          {BRUSH_SIZES.map((b) => (
            <button
              key={b.label}
              className={styles.sizeBtn}
              data-active={currentSize === b.size}
              onClick={() => setBrushSize(b.size)}
              aria-label={`Brush size ${b.label}`}
            >
              <span
                className={styles.sizeDot}
                style={{ width: b.size + 4, height: b.size + 4 }}
              />
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {/* Undo */}
        <button
          className={styles.actionBtn}
          onClick={undo}
          aria-label="Undo"
          title="Undo"
        >
          ↩
        </button>

        {/* Clear */}
        <button
          className={styles.actionBtn}
          onClick={clear}
          aria-label="Clear"
          title="Clear canvas"
        >
          ✕
        </button>
      </div>

      {/* CTA */}
      <button
        className={styles.cta}
        onClick={handlePlantSeed}
        disabled={!hasStrokes}
      >
        Watch it grow
      </button>
    </motion.div>
  );
}
