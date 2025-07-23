import React, { useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { notify } from "@/shared/stores/app-store";
import {
  usePanelView,
  useSelectedPanel,
  usePanelSearch,
  usePanelActions,
  useDeletePanelModal,
} from "@/shared/stores/app-store";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import {
  usePanelsQuery,
  useCreatePanelMutation,
  useUpdatePanelMutation,
  useDeletePanelMutation,
  useDeployPanelMutation,
} from "@/hooks/use-panel-query";
import { withSuccessNotification } from "@/lib/query-client";
import PanelContainer from "@/features/panels/ui/panel-container";
import PanelsTable from "@/features/panels/ui/panels-table";
import DeletePanelModal from "@/features/panels/ui/delete-panel-modal";
import type { Panel } from "@/features/panels/queries";

function PanelsContent() {
  // Guild context
  const { selectedGuildId } = useSelectServer();

  // UI state from global app store
  const currentView = usePanelView();
  const selectedPanelId = useSelectedPanel();
  const searchQuery = usePanelSearch();
  const { setView, selectPanel, setSearch, setSort, openDeleteModal, closeDeleteModal } =
    usePanelActions();
  const deleteModal = useDeletePanelModal();

  // Query data
  const { data: panels = [], isLoading, error } = usePanelsQuery(selectedGuildId);

  // Find selected panel
  const selectedPanel = useMemo(
    () => panels.find((p) => p.id === selectedPanelId) || null,
    [panels, selectedPanelId]
  );

  // Find panel being deleted
  const deletingPanel = useMemo(
    () => panels.find((p) => p.id === deleteModal.panelId) || null,
    [panels, deleteModal.panelId]
  );

  // Filter panels based on search
  const filteredPanels = useMemo(() => {
    if (!searchQuery) return panels;

    const query = searchQuery.toLowerCase();
    return panels.filter(
      (panel) =>
        panel.title.toLowerCase().includes(query) ||
        panel.buttonText?.toLowerCase().includes(query) ||
        panel.content?.toLowerCase().includes(query)
    );
  }, [panels, searchQuery]);

  // Mutations with notifications
  const createMutation = useCreatePanelMutation();
  const updateMutation = useUpdatePanelMutation();
  const deleteMutation = useDeletePanelMutation();
  const deployMutation = useDeployPanelMutation();

  // Setup mutation success handlers
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      notify.success("Panel created successfully");
      setView("list");
    }
  }, [createMutation.isSuccess, setView]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      notify.success("Panel updated successfully");
      setView("list");
      selectPanel(null);
    }
  }, [updateMutation.isSuccess, setView, selectPanel]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      notify.success("Panel deleted successfully");
      closeDeleteModal();
    }
  }, [deleteMutation.isSuccess, closeDeleteModal]);

  React.useEffect(() => {
    if (deployMutation.isSuccess) {
      notify.success("Panel deployed successfully");
    }
  }, [deployMutation.isSuccess]);

  // Action handlers
  const handleCreateNew = useCallback(() => {
    setView("create");
    selectPanel(null);
  }, [setView, selectPanel]);

  const handleEdit = useCallback(
    (panel: Panel) => {
      selectPanel(panel.id);
      setView("edit");
    },
    [selectPanel, setView]
  );

  const handleDelete = useCallback(
    (panel: Panel) => {
      openDeleteModal(panel.id);
    },
    [openDeleteModal]
  );

  const handleBackToList = useCallback(() => {
    setView("list");
    selectPanel(null);
  }, [setView, selectPanel]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteModal.panelId) return;
    await deleteMutation.mutateAsync(deleteModal.panelId);
  }, [deleteMutation, deleteModal.panelId]);

  const handleDeploy = useCallback(
    async (panel: Panel) => {
      await deployMutation.mutateAsync(panel.id);
    },
    [deployMutation]
  );

  return (
    <div
      className={currentView === "create" || currentView === "edit" ? "h-screen p-4" : "h-screen"}
    >
      <div className={currentView === "create" || currentView === "edit" ? "h-full" : "p-0"}>
        <Card
          className={
            currentView === "create" || currentView === "edit"
              ? "h-full border-0 bg-white shadow-none"
              : "border-0 bg-white shadow-none"
          }
        >
          <CardContent
            className={currentView === "create" || currentView === "edit" ? "h-full p-0" : "p-0"}
          >
            {/* Conditional Content */}
            {currentView === "list" ? (
              <Tabs defaultValue="panels" className="w-full pt-5">
                <TabsList className="h-auto w-full justify-start rounded-none border-b border-gray-200 bg-transparent p-0">
                  <TabsTrigger value="_" className="pointer-events-none w-4"></TabsTrigger>
                  <TabsTrigger
                    value="panels"
                    className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
                  >
                    Panels
                  </TabsTrigger>
                  <TabsTrigger
                    value="forms"
                    className="rounded-none border-b-2 border-transparent px-4 pb-3 pt-3 text-gray-600 hover:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-[#103A71] data-[state=active]:bg-transparent data-[state=active]:text-[#0E121B]"
                  >
                    Forms
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="panels" className="p-6">
                  <PanelsTable
                    panels={filteredPanels}
                    panelsLoading={isLoading}
                    panelsError={error}
                    error={deployMutation.error?.message || deleteMutation.error?.message || null}
                    onCreateNew={handleCreateNew}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onResend={(panel) => {
                      void handleDeploy(panel);
                    }}
                    onClearError={() => {
                      // Error clearing is handled by the mutations
                    }}
                  />
                </TabsContent>

                <TabsContent value="forms" className="p-6">
                  <div>
                    {/* Forms Header */}
                    <div className="mb-6">
                      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Forms</h1>
                      <p className="text-base text-gray-500">Create, edit, or delete Forms.</p>
                    </div>

                    {/* Create Button */}
                    <div className="mb-6">
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 rounded-xl border-[#103A71] bg-[#EBF1FF] font-medium text-[#103A71]"
                        >
                          <Plus className="size-4" />
                          Create New Form
                        </Button>
                      </div>
                    </div>

                    {/* Forms content placeholder */}
                    <div className="rounded-lg border border-gray-200 p-8 text-center">
                      <p className="text-gray-500">Forms management coming soon...</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : currentView === "create" ? (
              <PanelContainer mode="create" onBack={handleBackToList} />
            ) : currentView === "edit" ? (
              selectedPanel ? (
                <PanelContainer mode="edit" panel={selectedPanel} onBack={handleBackToList} />
              ) : null
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {(deployMutation.error || deleteMutation.error) && (
        <div className="fixed bottom-4 right-4 max-w-md rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 flex-shrink-0" />
            <span className="text-sm">
              {deployMutation.error?.message || deleteMutation.error?.message}
            </span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeletePanelModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        selectedPanel={deletingPanel}
        onConfirm={handleConfirmDelete}
        deleteMutation={{
          isPending: deleteMutation.isPending,
          error: deleteMutation.error,
        }}
      />
    </div>
  );
}

export default function PanelsPage() {
  return <PanelsContent />;
}
