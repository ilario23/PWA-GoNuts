import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MotionPageProps {
    children: ReactNode;
    className?: string;
}

export function MotionPage({ children, className }: MotionPageProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn("w-full", className)}
        >
            {children}
        </motion.div>
    );
}
