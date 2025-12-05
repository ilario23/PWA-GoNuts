import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface SmoothLoaderProps {
    isLoading: boolean;
    skeleton: ReactNode;
    children: ReactNode;
    className?: string;
}

export function SmoothLoader({
    isLoading,
    skeleton,
    children,
    className,
}: SmoothLoaderProps) {
    return (
        <div className={className}>
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {skeleton}
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
