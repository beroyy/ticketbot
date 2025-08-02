import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import superjson from "superjson";
import type { PersistStorage } from "zustand/middleware";

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

interface UserPreferencesSlice {
  selectedGuildId: string | null;
  setSelectedGuildId: (guildId: string | null) => void;
}

// Complete store interface
interface GlobalStore
  extends NotificationSlice,
    ModalSlice,
    FormSlice,
    UserPreferencesSlice {}

// Custom storage with superjson - generic to work with partialize
const createSuperjsonStorage = <T>(): PersistStorage<T> => ({
  getItem: (name) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return superjson.parse(str);
  },
  setItem: (name, value) => {
    localStorage.setItem(name, superjson.stringify(value));
  },
  removeItem: (name) => localStorage.removeItem(name),
});

// Store implementation
export const useGlobalStore = create<GlobalStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Notification slice
        notifications: [],
        addNotification: (notification) => {
          const id = Math.random().toString(36).substr(2, 9);
          const newNotification = { ...notification, id };

          set((state) => {
            state.notifications.push(newNotification);
          });

          // Auto-remove after duration
          const duration = notification.duration || 5000;
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        },
        removeNotification: (id) =>
          set((state) => {
            state.notifications = state.notifications.filter((n) => n.id !== id);
          }),
        clearNotifications: () => 
          set((state) => {
            state.notifications = [];
          }),

        // Modal slice
        modal: { type: null, data: {}, isOpen: false },
        openModal: (type, data = {}) => 
          set((state) => {
            state.modal.type = type;
            state.modal.data = data;
            state.modal.isOpen = true;
          }),
        closeModal: () => 
          set((state) => {
            state.modal.type = null;
            state.modal.data = {};
            state.modal.isOpen = false;
          }),
        updateModalData: (data) =>
          set((state) => {
            Object.assign(state.modal.data, data);
          }),

        // Form slice (persisted)
        drafts: {},
        currentFormId: null,
        setCurrentForm: (formId) => 
          set((state) => {
            state.currentFormId = formId;
          }),
        updateDraft: (formId, data) =>
          set((state) => {
            if (!state.drafts[formId]) {
              state.drafts[formId] = {
                step: 0,
                data: {},
                lastSaved: Date.now(),
              };
            }
            Object.assign(state.drafts[formId].data, data);
            state.drafts[formId].lastSaved = Date.now();
          }),
        setStep: (formId, step) =>
          set((state) => {
            if (!state.drafts[formId]) {
              state.drafts[formId] = {
                step: 0,
                data: {},
                lastSaved: Date.now(),
              };
            }
            state.drafts[formId].step = step;
            state.drafts[formId].lastSaved = Date.now();
          }),
        clearDraft: (formId) =>
          set((state) => {
            delete state.drafts[formId];
          }),
        clearAllDrafts: () => 
          set((state) => {
            state.drafts = {};
          }),

        // User preferences slice (persisted)
        selectedGuildId: null,
        setSelectedGuildId: (guildId) =>
          set((state) => {
            state.selectedGuildId = guildId;
          }),

      })),
      {
        name: "global-storage",
        storage: createSuperjsonStorage(),
        partialize: (state) => ({ 
          drafts: state.drafts,
          selectedGuildId: state.selectedGuildId,
        }),
      }
    )
  )
);

// Atomic selectors for performance
export const useNotifications = () => useGlobalStore((s) => s.notifications);
export const useAddNotification = () => useGlobalStore((s) => s.addNotification);
export const useRemoveNotification = () => useGlobalStore((s) => s.removeNotification);

export const useModal = () => useGlobalStore((s) => s.modal);
export const useModalActions = () =>
  useGlobalStore((s) => ({ openModal: s.openModal, closeModal: s.closeModal }));


export const useDrafts = () => useGlobalStore((s) => s.drafts);
export const useCurrentFormId = () => useGlobalStore((s) => s.currentFormId);
export const useFormActions = () => {
  const updateDraft = useGlobalStore((s) => s.updateDraft);
  const setStep = useGlobalStore((s) => s.setStep);
  const clearDraft = useGlobalStore((s) => s.clearDraft);
  const setCurrentForm = useGlobalStore((s) => s.setCurrentForm);

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
    useGlobalStore.getState().addNotification({ type: "success", title, message });
    toast.success(title, { description: message });
  },
  error: (title: string, message?: string) => {
    useGlobalStore.getState().addNotification({ type: "error", title, message });
    toast.error(title, { description: message });
  },
  info: (title: string, message?: string) => {
    useGlobalStore.getState().addNotification({ type: "info", title, message });
    toast.info(title, { description: message });
  },
  warning: (title: string, message?: string) => {
    useGlobalStore.getState().addNotification({ type: "warning", title, message });
    toast.warning(title, { description: message });
  },
};

// Helper hooks for common patterns
export function useFormDraft(formId: string) {
  const draft = useGlobalStore((s) => s.drafts[formId]);
  return draft?.data || {};
}

export function useFormStep(formId: string) {
  const draft = useGlobalStore((s) => s.drafts[formId]);
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

// User preferences selectors
// Note: For SSR-safe usage, use these with useHydratedStore hook
export const getSelectedGuildId = () => useGlobalStore.getState().selectedGuildId;
export const useSetSelectedGuildId = () => useGlobalStore((s) => s.setSelectedGuildId);

// SSR-safe selector - import useHydratedStore where used
export const useSelectedGuildId = () => useGlobalStore((s) => s.selectedGuildId);
