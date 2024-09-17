import { useState, useEffect } from "react";
import styles from "./animations.module.css";

export const AnimatedText = ({
  text,
  hold = 1000,
  transition = 500,
}: {
  text: string;
  hold?: number;
  transition?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, hold);

    return () => clearTimeout(timer);
  }, [hold]);

  return (
    <span
      className={`${styles.animatedText} ${isVisible ? styles.visible : ""}`}
      style={{
        transitionDuration: `${transition}ms`,
      }}
    >
      {text}
    </span>
  );
};
