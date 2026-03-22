"use client";

import { motion } from "framer-motion";
import { useDrawingContext } from "../DrawingProvider";
import styles from "./CompanionSprite.module.css";

interface Props {
  currentLevel: number;
}

/**
 * Growth stages (8 levels, 0-7):
 *  Levels 2-3  → underground (120px)
 *  Levels 4-5  → mid-journey (180px)
 *  Levels 6-7  → sky (240px)
 */
function getStage(level: number) {
  if (level <= 4) return { size: 120, className: styles.underground };
  if (level <= 6) return { size: 180, className: styles.midway };
  return { size: 240, className: styles.sky };
}

export default function CompanionSprite({ currentLevel }: Props) {
  const { drawingDataURL } = useDrawingContext();
  if (!drawingDataURL) return null;

  const { size, className } = getStage(currentLevel);

  return (
    <motion.div
      className={`${styles.companion} ${className}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ willChange: "transform, opacity" }}
    >
      <motion.img
        src={drawingDataURL}
        alt="Your companion"
        className={styles.image}
        animate={{ width: size, height: size }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ width: size, height: size }}
        decoding="sync"
      />
    </motion.div>
  );
}
