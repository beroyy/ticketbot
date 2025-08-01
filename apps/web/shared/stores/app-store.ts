import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { toast } from "sonner";

// Types
interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type ModalType =
  | "delete-panel"
  | "create-panel"
  | "edit-member"
  | "add-member"
  | "select-server"
  | "activity-log"
  | null;

interface FormDraft {
  step: number;
  data: Record<string, any>;
  lastSaved: number;
}



// Store slices
interface NotificationSlice {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

interface ModalSlice {
  modal: {
    type: ModalType;
    data: Record<string, any>;
    isOpen: boolean;
  };
  openModal: (type: ModalType, data?: Record<string, any>) => void;
  closeModal: () => void;
  updateModalData: (data: Record<string, any>) => void;
}

interface FormSlice {
  drafts: Record<string, FormDraft>;
  currentFormId: string | null;
  setCurrentForm: (formId: string) => void;
  updateDraft: (formId: string, data: Partial<FormDraft["data"]>) => void;
  setStep: (formId: string, step: number) => void;
  clearDraft: (formId: string) => void;
  clearAllDrafts: () => void;
}



// Complete store interface
interface AppStore
  extends NotificationSlice,
    ModalSlice,
    FormSlice {}

// Default states

// Store implementation
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Notification slice
        notifications: [],
        addNotification: (notification) => {
          const id = Math.random().toString(36).substr(2, 9);
          const newNotification = { ...notification, id };

          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));

          // Auto-remove after duration
          const duration = notification.duration || 5000;
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        },
        removeNotification: (id) =>
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
          })),
        clearNotifications: () => set({ notifications: [] }),

        // Modal slice
        modal: { type: null, data: {}, isOpen: false },
        openModal: (type, data = {}) => set({ modal: { type, data, isOpen: true } }),
        closeModal: () => set({ modal: { type: null, data: {}, isOpen: false } }),
        updateModalData: (data) =>
          set((state) => ({
            modal: { ...state.modal, data: { ...state.modal.data, ...data } },
          })),

        // Form slice (persisted)
        drafts: {},
        currentFormId: null,
        setCurrentForm: (formId) => set({ currentFormId: formId }),
        updateDraft: (formId, data) =>
          set((state) => ({
            drafts: {
              ...state.drafts,
              [formId]: {
                step: state.drafts[formId]?.step || 0,
                data: { ...(state.drafts[formId]?.data || {}), ...data },
                lastSaved: Date.now(),
              },
            },
          })),
        setStep: (formId, step) =>
          set((state) => ({
            drafts: {
              ...state.drafts,
              [formId]: {
                step,
                data: state.drafts[formId]?.data || {},
                lastSaved: Date.now(),
              },
            },
          })),
        clearDraft: (formId) =>
          set((state) => {
            const { [formId]: _, ...rest } = state.drafts;
            return { drafts: rest };
          }),
        clearAllDrafts: () => set({ drafts: {} }),
      }),
      {
        name: "app-storage",
        partialize: (state) => ({ drafts: state.drafts }), // Only persist drafts
      }
    )
  )
);

// Atomic selectors for performance
export const useNotifications = () => useAppStore((s) => s.notifications);
export const useAddNotification = () => useAppStore((s) => s.addNotification);
export const useRemoveNotification = () => useAppStore((s) => s.removeNotification);

export const useModal = () => useAppStore((s) => s.modal);
export const useModalActions = () =>
  useAppStore((s) => ({ openModal: s.openModal, closeModal: s.closeModal }));

export const useDrafts = () => useAppStore((s) => s.drafts);
export const useCurrentFormId = () => useAppStore((s) => s.currentFormId);
export const useFormActions = () => {
  const updateDraft = useAppStore((s) => s.updateDraft);
  const setStep = useAppStore((s) => s.setStep);
  const clearDraft = useAppStore((s) => s.clearDraft);
  const setCurrentForm = useAppStore((s) => s.setCurrentForm);

  return {
    updateDraft,
    setStep,
    clearDraft,
    setCurrentForm,
  };
};


// Convenience notification methods
export const notify = {
  success: (title: string, message?: string) => {
    useAppStore.getState().addNotification({ type: "success", title, message });
    toast.success(title, { description: message });
  },
  error: (title: string, message?: string) => {
    useAppStore.getState().addNotification({ type: "error", title, message });
    toast.error(title, { description: message });
  },
  info: (title: string, message?: string) => {
    useAppStore.getState().addNotification({ type: "info", title, message });
    toast.info(title, { description: message });
  },
  warning: (title: string, message?: string) => {
    useAppStore.getState().addNotification({ type: "warning", title, message });
    toast.warning(title, { description: message });
  },
};

// Helper hooks for common patterns
export function useFormDraft(formId: string) {
  const draft = useAppStore((s) => s.drafts[formId]);
  return draft?.data || {};
}

export function useFormStep(formId: string) {
  const draft = useAppStore((s) => s.drafts[formId]);
  return draft?.step || 0;
}

// Typed modal hooks for backwards compatibility
export function useTypedModal<T = any>(modalType: ModalType) {
  const modal = useModal();
  const { openModal, closeModal } = useModalActions();

  return {
    isOpen: modal.isOpen && modal.type === modalType,
    data: modal.data as T,
    open: (data?: T) => openModal(modalType, data as Record<string, any>),
    close: closeModal,
  };
}
