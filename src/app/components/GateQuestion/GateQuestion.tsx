"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGateContext } from "../GateProvider";
import styles from "./GateQuestion.module.css";

export default function GateQuestion() {
  const { setGateAnswer } = useGateContext();
  const [phase, setPhase] = useState<"intro" | "transform" | "question">("intro");

  // Auto-advance through the text phases
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("transform"), 3000);
    const t2 = setTimeout(() => setPhase("question"), 5500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <motion.p
        className={styles.logo}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        TROVE
      </motion.p>

      <div className={styles.textBlock}>
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.p
              key="intro"
              className={styles.headline}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
            >
              Imagine what it would feel like to have
              x-ray vision for character.
            </motion.p>
          )}
          {phase === "transform" && (
            <motion.p
              key="transform"
              className={styles.headlineBold}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
            >
              What if you had x-ray vision for
              how people actually behave?
            </motion.p>
          )}
          {phase === "question" && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className={styles.questionBlock}
            >
              <p className={styles.question}>
                Are you ready to see clearly?
              </p>
              <div className={styles.buttons}>
                <button
                  className={styles.btnYes}
                  onClick={() => setGateAnswer("yes")}
                >
                  Show me
                </button>
                <button
                  className={styles.btnNo}
                  onClick={() => setGateAnswer("no")}
                >
                  Not yet
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* <motion.p
        className={styles.backers}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        Backed by Slack Fund &bull; Betaworks &bull; True Ventures &bull; RRE Ventures
      </motion.p> */}
    </motion.div>
  );
}
