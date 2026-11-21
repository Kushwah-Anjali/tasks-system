import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";

import { X } from "lucide-react";

type ModalSize =
  | "sm"
  | "md"
  | "lg"
  | "xl";

interface AppModalProps {
  open: boolean;
  onClose: () => void;

  title: string;
  description?: string;

  children: ReactNode;
  footer?: ReactNode;

  size?: ModalSize;

  closeOnBackdrop?: boolean;
}

const sizeClasses: Record<
  ModalSize,
  string
> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export default function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
}: AppModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const focusFirst = () => {
      const dialog = dialogRef.current;
      const initialInput = dialog?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
      );
      const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
      (initialInput || firstFocusable || dialog)?.focus();
    };
    const focusTimer = window.requestAnimationFrame(focusFirst);

    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
      window.cancelAnimationFrame(focusTimer);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        bg-slate-950/40
        p-4
        backdrop-blur-[2px]
      "
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          event.target ===
            event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`
          app-modal flex max-h-[90vh]
          w-full flex-col
          overflow-hidden
          rounded-2xl
          border border-[#E2E8F0]
          bg-white
          shadow-[0_24px_80px_rgba(15,23,42,0.25)]
          ${sizeClasses[size]}
        `}
      >
        {/* Header */}
        <div
          className="
            flex items-start
            justify-between gap-4
            border-b border-[#E2E8F0] bg-slate-50
            px-5 py-5
            sm:px-6
          "
        >
          <div>
            <h2
              id={titleId}
              className="
                text-lg font-bold
                tracking-tight
                text-[#0F172A]
              "
            >
              {title}
            </h2>

            {description ? (
              <p
                className="
                  mt-1 text-sm
                  text-[#64748B]
                "
              >
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="
              flex h-9 w-9
              items-center justify-center
              rounded-lg
              text-[#64748B]
              hover:bg-[#F1F5F9]
              hover:text-[#0F172A]
            "
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-5 py-6
            sm:px-6
          "
        >
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div
            className="
              border-t
              border-[#E2E8F0]
              bg-[#F8FAFC]
              px-5 py-4
              sm:px-6
            "
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
