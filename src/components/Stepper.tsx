import React, {
  useState,
  Children,
  useRef,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';

// ─── Public API ───────────────────────────────────────────────────────────────

interface StepperProps {
  children: ReactNode;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
  nextButtonText?: string;
  finalButtonText?: string;
}

export interface StepperHandle {
  advance: () => void;
}

export const Stepper = forwardRef<StepperHandle, StepperProps>(function Stepper({
  children,
  onStepChange,
  onComplete,
  nextButtonText = 'Done',
  finalButtonText = 'Complete',
}, ref) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const steps = Children.toArray(children);
  const total = steps.length;
  const isCompleted = currentStep > total;
  const isLastStep = currentStep === total;

  const advance = () => {
    const next = currentStep + 1;
    setDirection(1);
    setCurrentStep(next);
    if (next > total) onComplete?.();
    else onStepChange?.(next);
  };

  useImperativeHandle(ref, () => ({ advance }));

  return (
    <div className="w-full">
      {/* Step indicators + connectors */}
      <div className="flex items-center px-2 mb-8">
        {steps.map((_, i) => {
          const n = i + 1;
          return (
            <React.Fragment key={n}>
              <StepDot step={n} currentStep={currentStep} />
              {i < total - 1 && <StepConnector complete={currentStep > n} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Animated content */}
      <StepContentWrapper
        isCompleted={isCompleted}
        currentStep={currentStep}
        direction={direction}
      >
        {steps[currentStep - 1]}
      </StepContentWrapper>

      {/* Footer */}
      {!isCompleted && (
        <div className="flex justify-center mt-8">
          <button
            onClick={advance}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            {isLastStep ? finalButtonText : nextButtonText}
          </button>
        </div>
      )}
    </div>
  );
});

export function Step({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

// ─── Internal pieces ─────────────────────────────────────────────────────────

function StepDot({
  step,
  currentStep,
}: {
  step: number;
  currentStep: number;
}) {
  const status =
    currentStep === step
      ? 'active'
      : currentStep > step
      ? 'complete'
      : 'inactive';

  return (
    <motion.div
      animate={status}
      initial={false}
      className="relative flex items-center justify-center"
    >
      <motion.div
        variants={{
          inactive: {
            scale: 1,
            backgroundColor: 'var(--dot-inactive)',
          },
          active: {
            scale: 1.1,
            backgroundColor: 'var(--dot-active)',
          },
          complete: {
            scale: 1,
            backgroundColor: 'var(--dot-complete)',
          },
        }}
        transition={{ duration: 0.25 }}
        className="h-8 w-8 rounded-full flex items-center justify-center"
        style={
          {
            '--dot-inactive': 'rgb(226 232 240)', // slate-200
            '--dot-active': 'rgb(37 99 235)',     // blue-600
            '--dot-complete': 'rgb(34 197 94)',   // green-500
          } as React.CSSProperties
        }
      >
        {status === 'complete' ? (
          <AnimatedCheck />
        ) : status === 'active' ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-2.5 w-2.5 rounded-full bg-white"
          />
        ) : (
          <span className="text-xs font-semibold text-slate-400">{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ complete }: { complete: boolean }) {
  return (
    <div className="relative mx-2 h-0.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <motion.div
        className="absolute left-0 top-0 h-full bg-green-500 rounded-full"
        initial={false}
        animate={{ width: complete ? '100%' : '0%' }}
        transition={{ duration: 0.35 }}
      />
    </div>
  );
}

function AnimatedCheck() {
  return (
    <svg
      className="h-4 w-4 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

// ─── Slide transition wrapper ─────────────────────────────────────────────────

const stepVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? '60%' : '-60%',
    opacity: 0,
  }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({
    x: dir >= 0 ? '-40%' : '40%',
    opacity: 0,
  }),
};

function StepContentWrapper({
  isCompleted,
  currentStep,
  direction,
  children,
}: {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(0);

  return (
    <motion.div
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={{ height: isCompleted ? 0 : height }}
      transition={{ type: 'spring', duration: 0.4 }}
    >
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        {!isCompleted && (
          <SlideStep
            key={currentStep}
            direction={direction}
            onHeightReady={setHeight}
          >
            {children}
          </SlideStep>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SlideStep({
  children,
  direction,
  onHeightReady,
}: {
  children: ReactNode;
  direction: number;
  onHeightReady: (h: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) onHeightReady(ref.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={ref}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}
