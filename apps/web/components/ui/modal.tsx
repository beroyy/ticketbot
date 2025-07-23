import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
}

interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, children, className, dismissible = true }, ref) => {
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && dismissible && onClose) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }, [isOpen, dismissible, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div
          ref={ref}
          className={cn("mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl", className)}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
Modal.displayName = "Modal";

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between border-b px-6 py-4", className)}
    >
      {children}
    </div>
  )
);
ModalHeader.displayName = "ModalHeader";

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ children, className }, ref) => (
    <div ref={ref} className={cn("p-6", className)}>
      {children}
    </div>
  )
);
ModalContent.displayName = "ModalContent";

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, className }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-end gap-2 border-t px-6 py-4", className)}
    >
      {children}
    </div>
  )
);
ModalFooter.displayName = "ModalFooter";

interface ModalCloseButtonProps {
  onClose?: () => void;
  className?: string;
}

const ModalCloseButton = React.forwardRef<HTMLButtonElement, ModalCloseButtonProps>(
  ({ onClose, className }, ref) => (
    <Button ref={ref} variant="ghost" size="sm" onClick={onClose} className={cn("p-1", className)}>
      <X className="h-5 w-5" />
    </Button>
  )
);
ModalCloseButton.displayName = "ModalCloseButton";

export { Modal, ModalHeader, ModalContent, ModalFooter, ModalCloseButton };
