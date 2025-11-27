import { useState, useEffect } from "react";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  // Use local state instead of hook to avoid potential issues
  const [position, setPosition] = useState<"top-center" | "top-right">(
    "top-right"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      setPosition(window.innerWidth < 768 ? "top-center" : "top-right");
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  return (
    <Sonner
      className="toaster group"
      position={position}
      style={{
        // Respect iOS safe area for notch/Dynamic Island
        top: "env(safe-area-inset-top, 0px)",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
