import React from "react";
import { Plus, RotateCcw, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermissions, PermissionFlags } from "@/features/permissions/hooks/use-permissions";
import type { Panel } from "../queries";

interface PanelsTableProps {
  panels: Panel[];
  panelsLoading: boolean;
  panelsError: Error | null;
  onCreateNew: () => void;
  onEdit: (panel: Panel) => void;
  onDelete: (panel: Panel) => void;
  onResend: (panel: Panel) => void;
}

function PanelsHeader({ onCreateNew }: { onCreateNew: () => void }) {
  const { hasPermission } = usePermissions();
  const canCreatePanel = hasPermission(PermissionFlags.PANEL_CREATE);

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">Manage Panels</h1>
        <p className="text-base text-gray-500">
          Create, edit, or delete panels to keep your workspace clean and efficient.
        </p>
      </div>
      {canCreatePanel && (
        <Button onClick={onCreateNew}>
          <Plus className="size-4" />
          Create New Panel
        </Button>
      )}
    </div>
  );
}

export function PanelsTableRefactored({
  panels,
  panelsLoading,
  panelsError,
  onCreateNew,
  onEdit,
  onDelete,
  onResend,
}: PanelsTableProps) {
  const { hasPermission } = usePermissions();

  const renderActionButtons = (panel: Panel) => (
    <div className="flex items-center justify-end space-x-2">
      {hasPermission(PermissionFlags.PANEL_EDIT) && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(panel)}
          aria-label={`Edit ${panel.title}`}
        >
          <Edit className="size-4" />
        </Button>
      )}
      {hasPermission(PermissionFlags.PANEL_DEPLOY) && panel.messageId && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onResend(panel)}
          aria-label={`Resend ${panel.title}`}
        >
          <RotateCcw className="size-4" />
        </Button>
      )}
      {hasPermission(PermissionFlags.PANEL_DELETE) && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(panel)}
          aria-label={`Delete ${panel.title}`}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );

  if (panelsError) {
    return (
      <div className="border-destructive/20 bg-destructive/10 rounded-lg border p-4">
        <p className="text-destructive text-sm">Failed to load panels: {panelsError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PanelsHeader onCreateNew={onCreateNew} />

      {panelsLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : panels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No panels found. Create your first panel to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Panel Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.map((panel) => (
                <TableRow key={panel.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {panel.emoji && <span className="text-xl">{panel.emoji}</span>}
                      <span className="font-medium">{panel.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {panel.type === "SINGLE" ? "Single" : "Multi"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        panel.messageId
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {panel.messageId ? "Deployed" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{renderActionButtons(panel)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
