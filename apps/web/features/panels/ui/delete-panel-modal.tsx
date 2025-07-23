import React from "react";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { Panel } from "../queries";

interface DeletePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPanel: Panel | null;
  onConfirm: () => void;
  deleteMutation: { isPending: boolean; error: Error | null };
}

export default function DeletePanelModal({
  isOpen,
  onClose,
  selectedPanel,
  onConfirm,
  deleteMutation,
}: DeletePanelModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold">Delete Ticket Category</h2>
        <ModalCloseButton onClose={onClose} />
      </ModalHeader>
      <ModalContent>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="size-6 text-red-600" />
          </div>
          <div>
            <p className="mb-2 text-sm text-gray-900">
              Are you sure you want to delete this ticket category?
            </p>
            {selectedPanel && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm">
                  <span className="font-medium">Channel:</span> {selectedPanel.channel}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Category:</span> {selectedPanel.title}
                </p>
              </div>
            )}
            <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={deleteMutation.isPending}
          className="bg-red-600 hover:bg-red-700"
        >
          {deleteMutation.isPending ? (
            <>
              <Trash2 className="mr-2 size-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 size-4" />
              Delete
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
