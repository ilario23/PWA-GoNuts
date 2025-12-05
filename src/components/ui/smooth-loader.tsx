import { AnimatePresence, motion, Variants } from "framer-motion";
import { ReactNode } from "react";

interface SmoothLoaderProps {
    isLoading: boolean;
    skeleton: ReactNode;
    children: ReactNode;
    className?: string;
    /**
     * If true, the skeletons will be preserved in the DOM but transparent
     * to maintain layout until content is ready. Default: false
     */
    preserveLayout?: boolean;
}

const variants: Variants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    },
    exit: {
        opacity: 0,
        scale: 0.98,
        transition: {
            duration: 0.2,
            ease: "easeIn"
        }
    }
};

export function SmoothLoader({
    isLoading,
    skeleton,
    children,
    className,
    preserveLayout = false
}: SmoothLoaderProps) {
    return (
        <div className={className}>
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="skeleton"
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        variants={variants}
                        className="w-full h-full"
                    >
                        {skeleton}
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial="hidden"
                        animate="visible"
                        variants={variants}
                        className="w-full h-full"
                    >
                        {children}
                        {preserveLayout && <div className="hidden">{skeleton}</div>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
