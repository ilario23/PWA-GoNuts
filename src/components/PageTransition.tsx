import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

// Motion is enhancement, not a visibility gate. We animate transform only and
// never opacity: if the enter animation never runs (hidden tab, headless
// renderer, reduced-motion, an interrupted route handoff), the page still shows
// at full opacity instead of shipping blank. The subtle slide/scale is the
// polish; the content underneath is always visible.
const pageVariants = {
    initial: {
        y: 8,
        scale: 0.99,
    },
    animate: {
        y: 0,
        scale: 1,
        transition: {
            duration: 0.25, // product register: keep transitions in the 150-250ms band
            ease: [0.22, 1, 0.36, 1], // easeOutQuint-like curve
        },
    },
    exit: {
        y: -8,
        scale: 0.99,
        transition: {
            duration: 0.2,
            ease: "easeIn",
        },
    },
} as const;

export function PageTransition({ children, className }: PageTransitionProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className={className}
        >
            {children}
        </motion.div>
    );
}
