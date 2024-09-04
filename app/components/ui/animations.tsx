import { useState, useEffect } from "react";

export const AnimatedText = ({
  text,
  hold,
  transition,
}: {
  text: string;
  hold: number;
  transition: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, hold);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transition-opacity duration-[${transition}ms] ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        animation: isVisible ? `fadeIn ${transition}ms ease-in-out` : "none",
      }}
    >
      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
      {text}
    </div>
  );
};
