import { motion } from 'motion/react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;       // ms between each character
  duration?: number;    // seconds per character
  from?: { opacity?: number; y?: number };
}

export function SplitText({
  text,
  className = '',
  delay = 40,
  duration = 0.5,
  from = { opacity: 0, y: 20 },
}: SplitTextProps) {
  const chars = text.split('');

  return (
    <span className={`inline-flex overflow-hidden ${className}`} aria-label={text}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={from}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration,
            delay: i * (delay / 1000),
            ease: [0.215, 0.61, 0.355, 1], // easeOutCubic
          }}
          // Preserve spaces
          style={{ whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}
