import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const pageTransition = {
  type: "tween",
  ease: [0.25, 0.1, 0.25, 1],
  duration: 0.15,
};

export default function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={pageTransition}
      style={{
        width: "100%",
        minHeight: "100%",
        willChange: "opacity",
      }}
    >
      {children}
    </motion.div>
  );
}
