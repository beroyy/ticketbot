import React from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeletePanelModal } from "@/shared/stores/app-store";

interface DeletePanelModalProps {
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
  panelTitle?: string;
}

export function DeletePanelModalRefactored({
  onConfirm,
  isDeleting,
  panelTitle,
}: DeletePanelModalProps) {
  const { isOpen, close } = useDeletePanelModal();

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={isDeleting ? undefined : close}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Panel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="size-6 text-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete <span className="font-semibold">{panelTitle}</span>?
                This action cannot be undone and all associated data will be permanently removed.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isDeleting && <Trash2 className="mr-2 size-4" />}
            Delete Panel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
