import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, Settings, ChevronRight, RotateCcw, Edit, Trash2 } from "lucide-react";
import { usePermissions, PermissionFlags } from "@/features/permissions/hooks/use-permissions";
import type { Panel } from "../queries";
import { isDevelopment } from "@/env";

interface PanelsTableProps {
  panels: Panel[];
  panelsLoading: boolean;
  panelsError: Error | null;
  error: string | null;
  onCreateNew: () => void;
  onEdit: (panel: Panel) => void;
  onDelete: (panel: Panel) => void;
  onResend: (panel: Panel) => void;
  onClearError: () => void;
}

function PanelsHeader({ onCreateNew }: { onCreateNew: () => void }) {
  const { hasPermission, permissions: userPermissions } = usePermissions();
  const canCreatePanel = hasPermission(PermissionFlags.PANEL_CREATE);

  if (isDevelopment()) {
    console.log("Panel permissions debug:", {
      userPermissions: userPermissions ? userPermissions.toString(16) : undefined,
      PANEL_CREATE: PermissionFlags.PANEL_CREATE.toString(16),
      hasPermission: canCreatePanel,
    });
  }

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-gray-900">Manage Panels</h1>
        <p className="text-base text-gray-500">
          Create, edit, or delete panels to keep your workspace clean and efficient.
        </p>
      </div>
      {canCreatePanel && (
        <div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={onCreateNew}
              className="flex items-center gap-2 rounded-xl border-[#103A71] bg-[#EBF1FF] font-medium text-[#103A71]"
            >
              <Plus className="size-4" />
              Create New Panel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelTableRow({ panel, onEdit }: { panel: Panel; onEdit: (panel: Panel) => void }) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PermissionFlags.PANEL_EDIT);

  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50">
      <div className="col-span-3 flex items-center gap-2">
        <span className="text-sm text-gray-900">{panel.title}</span>
      </div>
      <div className="col-span-3 flex items-center gap-2">
        <span className="text-sm text-gray-900">
          {panel.type === "SINGLE" ? "Individual" : "Multi Panel"}
        </span>
      </div>
      <div className="col-span-3 flex items-center">
        <span className="text-sm text-gray-900"># {panel.channelPrefix}</span>
      </div>
      <div className="col-span-3 flex items-center justify-end gap-2">
        {canEdit && (
          <Button
            variant="outline"
            onClick={() => {
              onEdit(panel);
            }}
            className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
          >
            <Settings className="size-4" />
            <span>Manage</span>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function PanelCard({
  panel,
  onEdit,
  onResend,
  onDelete,
}: {
  panel: Panel;
  onEdit: (panel: Panel) => void;
  onResend: (panel: Panel) => void;
  onDelete: (panel: Panel) => void;
}) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission(PermissionFlags.PANEL_EDIT);
  const canDeploy = hasPermission(PermissionFlags.PANEL_DEPLOY);
  const canDelete = hasPermission(PermissionFlags.PANEL_DELETE);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-sm text-gray-500">Channel</div>
          <div className="text-sm font-medium text-gray-900">{panel.channel}</div>
        </div>
        <div>
          <div className="mb-1 text-sm text-gray-500">Ticket Category</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-gray-900">{panel.title}</div>
            {!panel.messageId && (
              <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Not deployed
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 pt-2">
          <span className="text-sm text-gray-500">Actions</span>
          <div className="flex items-center gap-2">
            {canDeploy && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onResend(panel);
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onEdit(panel);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-700"
              >
                <Edit className="size-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onDelete(panel);
                }}
                className="p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PanelsTable({
  panels,
  panelsLoading,
  panelsError,
  error,
  onCreateNew,
  onEdit,
  onDelete,
  onResend,
  onClearError,
}: PanelsTableProps) {
  return (
    <>
      <PanelsHeader onCreateNew={onCreateNew} />

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm text-amber-800">{error}</p>
            </div>
            <button onClick={onClearError} className="text-amber-600 hover:text-amber-700">
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden">
        {panelsLoading && (
          <div className="py-12 text-center">
            <div className="text-gray-500">Loading panels...</div>
          </div>
        )}

        {panelsError && (
          <div className="py-12 text-center">
            <div className="text-red-500">Failed to load panels</div>
          </div>
        )}

        {!panelsLoading && !panelsError && (
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-lg border-b border-gray-200">
              <div className="rounded-lg bg-gray-50">
                <div className="grid grid-cols-12 gap-4 px-6 py-2">
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700">Name</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700">Type</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-700">Channel</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {panels.length > 0 ? (
                  panels.map((panel) => (
                    <PanelTableRow key={panel.id} panel={panel} onEdit={onEdit} />
                  ))
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">No panels found</div>
                )}
              </div>
            </div>
          </div>
        )}

        {!panelsLoading && !panelsError && (
          <div className="space-y-4 md:hidden">
            {panels.length > 0 ? (
              panels.map((panel) => (
                <PanelCard
                  key={panel.id}
                  panel={panel}
                  onEdit={onEdit}
                  onResend={onResend}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">No panels found</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
