import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type ModalState = {
  openModals: Set<string>;
  modalData: Record<string, any>;
  open: (id: string, data?: any) => void;
  close: (id: string) => void;
  isOpen: (id: string) => boolean;
};

export const useModalStore = create<ModalState>()(
  immer((set, get) => ({
    openModals: new Set(),
    modalData: {},
    open: (id, data) =>
      set((state) => {
        state.openModals.add(id);
        if (data) {
          state.modalData[id] = data;
        }
      }),
    close: (id) =>
      set((state) => {
        state.openModals.delete(id);
        delete state.modalData[id];
      }),
    isOpen: (id) => get().openModals.has(id),
  }))
);
