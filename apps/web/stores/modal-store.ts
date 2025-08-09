import { create } from 'zustand';

interface ModalState {
  openModals: Set<string>;
  modalData: Record<string, any>;
  open: (id: string, data?: any) => void;
  close: (id: string) => void;
  isOpen: (id: string) => boolean;
}

export const useModalStore = create<ModalState>()((set, get) => ({
  openModals: new Set(),
  modalData: {},
  open: (id, data) => set(state => ({ 
    openModals: new Set([...state.openModals, id]),
    modalData: data ? { ...state.modalData, [id]: data } : state.modalData
  })),
  close: (id) => set(state => {
    const newModals = new Set([...state.openModals].filter(m => m !== id));
    const newData = { ...state.modalData };
    delete newData[id];
    return { openModals: newModals, modalData: newData };
  }),
  isOpen: (id) => get().openModals.has(id),
}));