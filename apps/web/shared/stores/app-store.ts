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

interface FilterState {
  status: string[];
  type: string[];
  assignee: string[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

interface SortState {
  field: "createdAt" | "status" | "progress" | "lastMessage";
  direction: "asc" | "desc";
}

type PanelViewState = "list" | "create" | "edit" | "preview";

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

interface TicketsSlice {
  tickets: {
    searchQuery: string;
    activeTab: "active" | "closed";
    selectedTicketId: string | null;
    isCollapsed: boolean;
    filters: FilterState;
    sort: SortState;
  };
  setTicketSearch: (query: string) => void;
  setActiveTab: (tab: "active" | "closed") => void;
  selectTicket: (id: string | null) => void;
  toggleCollapsed: () => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  updateSort: (sort: Partial<SortState>) => void;
}

interface PanelsSlice {
  panels: {
    currentView: PanelViewState;
    selectedPanelId: string | null;
    isDeleteModalOpen: boolean;
    deletingPanelId: string | null;
    searchQuery: string;
    sortBy: "name" | "created" | "updated";
    sortDirection: "asc" | "desc";
  };
  setPanelView: (view: PanelViewState) => void;
  selectPanel: (id: string | null) => void;
  openDeleteModal: (panelId: string) => void;
  closeDeleteModal: () => void;
  setPanelSearch: (query: string) => void;
  setPanelSort: (sortBy: "name" | "created" | "updated", direction?: "asc" | "desc") => void;
  resetPanelState: () => void;
}

interface SettingsSlice {
  settings: {
    teamSearchQuery: string;
    selectedMemberId: string | null;
  };
  setTeamSearch: (query: string) => void;
  selectMember: (id: string | null) => void;
}

// Complete store interface
interface AppStore
  extends NotificationSlice,
    ModalSlice,
    FormSlice,
    TicketsSlice,
    PanelsSlice,
    SettingsSlice {}

// Default states
const defaultTicketFilters: FilterState = {
  status: [],
  type: [],
  assignee: [],
  dateRange: { from: null, to: null },
};

const defaultTicketSort: SortState = {
  field: "createdAt",
  direction: "desc",
};

const defaultPanelState = {
  currentView: "list" as PanelViewState,
  selectedPanelId: null,
  isDeleteModalOpen: false,
  deletingPanelId: null,
  searchQuery: "",
  sortBy: "created" as const,
  sortDirection: "desc" as const,
};

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

        // Tickets slice
        tickets: {
          searchQuery: "",
          activeTab: "active",
          selectedTicketId: null,
          isCollapsed: false,
          filters: defaultTicketFilters,
          sort: defaultTicketSort,
        },
        setTicketSearch: (query) =>
          set((state) => ({ tickets: { ...state.tickets, searchQuery: query } })),
        setActiveTab: (tab) => set((state) => ({ tickets: { ...state.tickets, activeTab: tab } })),
        selectTicket: (id) =>
          set((state) => ({ tickets: { ...state.tickets, selectedTicketId: id } })),
        toggleCollapsed: () =>
          set((state) => ({
            tickets: { ...state.tickets, isCollapsed: !state.tickets.isCollapsed },
          })),
        updateFilters: (filters) =>
          set((state) => ({
            tickets: {
              ...state.tickets,
              filters: { ...state.tickets.filters, ...filters },
            },
          })),
        resetFilters: () =>
          set((state) => ({
            tickets: { ...state.tickets, filters: defaultTicketFilters },
          })),
        updateSort: (sort) =>
          set((state) => ({
            tickets: { ...state.tickets, sort: { ...state.tickets.sort, ...sort } },
          })),

        // Panels slice
        panels: defaultPanelState,
        setPanelView: (view) =>
          set((state) => ({ panels: { ...state.panels, currentView: view } })),
        selectPanel: (id) => set((state) => ({ panels: { ...state.panels, selectedPanelId: id } })),
        openDeleteModal: (panelId) =>
          set((state) => ({
            panels: {
              ...state.panels,
              isDeleteModalOpen: true,
              deletingPanelId: panelId,
            },
          })),
        closeDeleteModal: () =>
          set((state) => ({
            panels: {
              ...state.panels,
              isDeleteModalOpen: false,
              deletingPanelId: null,
            },
          })),
        setPanelSearch: (query) =>
          set((state) => ({ panels: { ...state.panels, searchQuery: query } })),
        setPanelSort: (sortBy, direction) =>
          set((state) => ({
            panels: {
              ...state.panels,
              sortBy,
              sortDirection: direction || state.panels.sortDirection,
            },
          })),
        resetPanelState: () => set({ panels: defaultPanelState }),

        // Settings slice
        settings: {
          teamSearchQuery: "",
          selectedMemberId: null,
        },
        setTeamSearch: (query) =>
          set((state) => ({
            settings: { ...state.settings, teamSearchQuery: query },
          })),
        selectMember: (id) =>
          set((state) => ({
            settings: { ...state.settings, selectedMemberId: id },
          })),
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

export const useTicketFilters = () => useAppStore((s) => s.tickets.filters);
export const useTicketSort = () => useAppStore((s) => s.tickets.sort);
export const useTicketSearch = () => useAppStore((s) => s.tickets.searchQuery);
export const useSelectedTicket = () => useAppStore((s) => s.tickets.selectedTicketId);
export const useActiveTab = () => useAppStore((s) => s.tickets.activeTab);
export const useTicketActions = () => {
  const setSearch = useAppStore((s) => s.setTicketSearch);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const selectTicket = useAppStore((s) => s.selectTicket);
  const updateFilters = useAppStore((s) => s.updateFilters);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const updateSort = useAppStore((s) => s.updateSort);

  return {
    setSearch,
    setActiveTab,
    selectTicket,
    updateFilters,
    resetFilters,
    updateSort,
  };
};

export const usePanelView = () => useAppStore((s) => s.panels.currentView);
export const useSelectedPanel = () => useAppStore((s) => s.panels.selectedPanelId);
export const usePanelSearch = () => useAppStore((s) => s.panels.searchQuery);
export const usePanelActions = () => {
  const setView = useAppStore((s) => s.setPanelView);
  const selectPanel = useAppStore((s) => s.selectPanel);
  const setSearch = useAppStore((s) => s.setPanelSearch);
  const setSort = useAppStore((s) => s.setPanelSort);
  const openDeleteModal = useAppStore((s) => s.openDeleteModal);
  const closeDeleteModal = useAppStore((s) => s.closeDeleteModal);
  const reset = useAppStore((s) => s.resetPanelState);

  return {
    setView,
    selectPanel,
    setSearch,
    setSort,
    openDeleteModal,
    closeDeleteModal,
    reset,
  };
};

export const useTeamSearch = () => useAppStore((s) => s.settings.teamSearchQuery);
export const useSettingsActions = () => {
  const setTeamSearch = useAppStore((s) => s.setTeamSearch);
  const selectMember = useAppStore((s) => s.selectMember);

  return {
    setTeamSearch,
    selectMember,
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

export function useDeletePanelModal() {
  const isOpen = useAppStore((s) => s.panels.isDeleteModalOpen);
  const panelId = useAppStore((s) => s.panels.deletingPanelId);
  const { openDeleteModal, closeDeleteModal } = usePanelActions();

  return { isOpen, panelId, open: openDeleteModal, close: closeDeleteModal };
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
