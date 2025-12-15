import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface CountUpProps {
    value: number;
    /**
     * Number of decimal places to show.
     * @default 0
     */
    decimals?: number;
    /**
     * Duration in seconds (approximate, since we use spring)
     * if you want to control speed, adjust stiffness/damping in the component logic.
     * @default 2
     */
    duration?: number;
    className?: string;
    prefix?: string;
    suffix?: string;
}

export function CountUp({
    value,
    decimals = 0,
    className,
    prefix = "",
    suffix = "",
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        damping: 25,
        stiffness: 200,
    });
    const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [isInView, value, motionValue]);

    useEffect(() => {
        if (ref.current) {
            ref.current.textContent = `${prefix}${motionValue.get().toFixed(decimals)}${suffix}`;
        }

        return springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
            }
        });
    }, [springValue, decimals, prefix, suffix, motionValue]);

    return <span className={`tabular-nums ${className || ''}`} ref={ref} />;
}
