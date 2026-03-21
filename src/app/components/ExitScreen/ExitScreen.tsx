"use client";

import { motion } from "framer-motion";
import { useGateContext } from "../GateProvider";
import DitheredField from "./DitheredField";
import styles from "./ExitScreen.module.css";

export default function ExitScreen() {
  const { setGateAnswer } = useGateContext();

  return (
    <motion.div
      className={styles.overlay}
      initial={{ backgroundColor: "rgb(44, 24, 16)" }}
      animate={{ backgroundColor: "#f5f2ee" }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      {/* Full-screen dithered field background */}
      <motion.div
        className={styles.fieldBackground}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 1.5, ease: "easeOut" }}
      >
        <DitheredField pixelSize={5} />
      </motion.div>

      {/* Text + button floating on top */}
      <div className={styles.content}>
        <motion.p
          className={styles.message}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 0.8, ease: "easeOut" }}
        >
          Not every seed sprouts on the first try.
        </motion.p>

        <motion.p
          className={styles.contact}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 0.8, ease: "easeOut" }}
        >
          Helen Huang — howdy@helenhuang.io
        </motion.p>

        <motion.button
          className={styles.restart}
          onClick={() => setGateAnswer(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.8, duration: 0.6 }}
        >
          Start over
        </motion.button>
      </div>
    </motion.div>
  );
}
