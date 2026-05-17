import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { haptic } from "../utils/haptics";

const THRESHOLD = 600;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      aria-label="Remonter en haut"
      className="glass-strong fixed bottom-24 right-4 z-30 grid h-12 w-12 place-items-center rounded-full text-accent-300 shadow-glow-accent animate-fade-in"
      onClick={() => {
        haptic("light");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      type="button"
    >
      <ChevronUp size={22} strokeWidth={2.4} />
    </button>
  );
}
