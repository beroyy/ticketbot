import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";
import { Plus, RotateCcw, Edit, Trash2, AlertTriangle, ChevronLeft } from "lucide-react";
import { RiDeleteBin4Line, RiEditLine, RiRefreshLine, RiExpandUpDownFill } from "react-icons/ri";
import { usePanels } from "@/lib/queries";
import type { Panel } from "@/lib/queries";
import { useSelectServer } from "@/components/select-server-provider";
import { apiClient } from "@/lib/api";
import EditPanelModal from "@/components/edit-panel-modal";
import CreatePanelWizard from "@/components/create-panel-wizard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGuildPermissions, PermissionFlags } from "@/contexts/permission-context";

interface Question {
  id: string;
  type: "short_answer" | "paragraph";
  label: string;
  placeholder: string;
  enabled: boolean;
  characterLimit?: number;
}

interface PanelFormData {
  channel: string;
  title: string;
  category: string;
  questions: Question[];
  mention_on_open?: string;
  select_team?: string;
  hide_mentions?: boolean;
  ticket_category?: string;
  form?: string;
  naming_scheme?: boolean;
  exit_survey_form?: string;
  awaiting_response_category?: string;
  emoji?: string;
  button_text?: string;
  color?: string;
  welcome_message?: string;
  intro_title?: string;
  intro_description?: string;
}

export default function TicketSettingsPage() {
  const [currentView, setCurrentView] = useState<"table" | "create-flow">("table");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get current guild and fetch panels
  const { selectedGuildId } = useSelectServer();
  const queryClient = useQueryClient();
  const { hasPermission, permissions: userPermissions } = useGuildPermissions();
  const {
    data: panels = [],
    isLoading: panelsLoading,
    error: panelsError,
  } = usePanels(selectedGuildId);

  // Create mutation
  const createPanelMutation = useMutation({
    mutationFn: async (data: unknown) => {
      return apiClient.post("/panels", data);
    },
    onSuccess: (response: unknown) => {
      void queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
      setCurrentView("table");

      // Check if panel was deployed successfully
      const data = response as { warning?: string; panel?: { deployed?: boolean } };
      if (data.warning) {
        setError(
          `Warning: ${data.warning}. You can try to redeploy the panel using the Resend button.`
        );
      } else if (data.panel?.deployed) {
        // Show success message if needed
        console.log("Panel created and deployed successfully");
      }
    },
    onError: (error) => {
      console.error("Failed to create panel:", error);
      let errorMessage = "Failed to create panel. Please try again.";
      if (error instanceof Error && "response" in error) {
        const axiosError = error as Error & { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error ?? errorMessage;
      }
      setError(errorMessage);
    },
  });

  // Edit mutation
  const editPanelMutation = useMutation({
    mutationFn: async (data: PanelFormData) => {
      if (!selectedPanel) throw new Error("No panel selected");
      return apiClient.post(`/panels/${selectedPanel.id}`, {
        ...data,
        guildId: selectedGuildId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
      setIsEditModalOpen(false);
      setSelectedPanel(null);
    },
    onError: (error) => {
      console.error("Failed to update panel:", error);
      let errorMessage = "Failed to update panel. Please try again.";
      if (error instanceof Error && "response" in error) {
        const axiosError = error as Error & { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error ?? errorMessage;
      }
      setError(errorMessage);
    },
  });

  // Delete mutation
  const deletePanelMutation = useMutation({
    mutationFn: async (panelId: string) => {
      return apiClient.request(`/panels/${panelId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      // Invalidate and refetch panels data
      void queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
      setIsDeleteModalOpen(false);
      setSelectedPanel(null);
    },
    onError: (error) => {
      console.error("Failed to delete panel:", error);
      let errorMessage = "Failed to delete panel. Please try again.";
      if (error instanceof Error && "response" in error) {
        const axiosError = error as Error & { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error ?? errorMessage;
      }
      setError(errorMessage);
    },
  });

  const handleCreateNew = () => {
    setError(null);
    setCurrentView("create-flow");
  };

  const handleResend = async (panel: Panel) => {
    if (!selectedGuildId) return;

    try {
      setError(null);
      await apiClient.post(`/panels/${panel.id}/deploy`);
      // Invalidate and refetch panels data
      void queryClient.invalidateQueries({ queryKey: ["panels", selectedGuildId] });
    } catch (error) {
      console.error("Failed to resend panel:", error);
      let errorMessage = "Failed to resend panel. Please try again.";
      if (error instanceof Error && "response" in error) {
        const axiosError = error as Error & { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error ?? errorMessage;
      }
      setError(errorMessage);
    }
  };

  const handleEdit = (panel: Panel) => {
    setSelectedPanel(panel);
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleDelete = (panel: Panel) => {
    setSelectedPanel(panel);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = (data: {
    channel: string;
    category: string;
    questions: Question[];
    mention_on_open?: string;
    select_team?: string;
    hide_mentions?: boolean;
    ticket_category?: string;
    form?: string;
    naming_scheme?: boolean;
    exit_survey_form?: string;
    awaiting_response_category?: string;
    emoji?: string;
    button_text?: string;
    color?: string;
    welcome_message?: string;
    intro_title?: string;
    intro_description?: string;
    welcome_fields?: Array<{ id: string; name: string; value: string; inline: boolean }>;
    allow_everyone?: boolean;
    large_image_url?: string;
    small_image_url?: string;
  }) => {
    if (!data.channel.trim() || !data.category.trim() || !selectedGuildId) return;

    // Convert to new API format
    // Ensure channel ID is properly extracted (should be numeric ID)
    let channelId = data.channel;
    // If channel contains formatting, extract just the ID
    if (channelId.includes("|")) {
      // Format might be "# | 123456789" or similar
      const parts = channelId.split("|");
      channelId = parts[parts.length - 1]?.trim() ?? "";
    }
    channelId = channelId.replace(/[^0-9]/g, "");

    console.log("Submitting panel with channel ID:", channelId, "from:", data.channel);

    const apiPayload = {
      type: "SINGLE",
      guildId: selectedGuildId,
      channelId: channelId,
      welcomeMessage:
        data.welcome_message || data.intro_title
          ? {
              title: data.intro_title || data.category,
              content: data.welcome_message,
              fields: data.welcome_fields || [],
            }
          : undefined,
      singlePanel: {
        title: data.category,
        emoji: data.emoji,
        buttonText: data.button_text || data.category,
        buttonColor: data.color,
        categoryId: data.ticket_category,
        teamId: data.select_team,
        questions: data.questions,
        mentionOnOpen: data.mention_on_open,
        hideMentions: data.hide_mentions,
        ticketCategory: data.ticket_category,
        form: data.form,
        namingScheme: data.naming_scheme,
        exitSurveyForm: data.exit_survey_form,
        awaitingResponseCategory: data.awaiting_response_category,
        accessControl: {
          allowEveryone: data.allow_everyone !== false,
          roles: [],
        },
        largeImageUrl: data.large_image_url,
        smallImageUrl: data.small_image_url,
      },
    };

    createPanelMutation.mutate(apiPayload);
  };

  const handleEditSubmit = (data: {
    channel: string;
    category: string;
    questions: Question[];
    mention_on_open?: string;
    select_team?: string;
    hide_mentions?: boolean;
    ticket_category?: string;
    form?: string;
    naming_scheme?: boolean;
    exit_survey_form?: string;
    awaiting_response_category?: string;
    emoji?: string;
    button_text?: string;
    color?: string;
    welcome_message?: string;
    intro_title?: string;
    intro_description?: string;
  }) => {
    if (!selectedPanel || !data.channel.trim() || !data.category.trim() || !selectedGuildId) return;

    const mutationData: PanelFormData = {
      channel: data.channel,
      title: data.category,
      category: data.category,
      questions: data.questions,
    };

    if (data.mention_on_open) mutationData.mention_on_open = data.mention_on_open;
    if (data.select_team) mutationData.select_team = data.select_team;
    if (data.hide_mentions !== undefined) mutationData.hide_mentions = data.hide_mentions;
    if (data.ticket_category) mutationData.ticket_category = data.ticket_category;
    if (data.form) mutationData.form = data.form;
    if (data.naming_scheme !== undefined) mutationData.naming_scheme = data.naming_scheme;
    if (data.exit_survey_form) mutationData.exit_survey_form = data.exit_survey_form;
    if (data.awaiting_response_category)
      mutationData.awaiting_response_category = data.awaiting_response_category;
    if (data.emoji) mutationData.emoji = data.emoji;
    if (data.button_text) mutationData.button_text = data.button_text;
    if (data.color) mutationData.color = data.color;
    if (data.welcome_message) mutationData.welcome_message = data.welcome_message;
    if (data.intro_title) mutationData.intro_title = data.intro_title;
    if (data.intro_description) mutationData.intro_description = data.intro_description;

    editPanelMutation.mutate(mutationData);
  };

  const handleDeleteConfirm = () => {
    if (!selectedPanel) return;
    deletePanelMutation.mutate(selectedPanel.id);
  };

  return (
    <div className={currentView === "create-flow" ? "h-screen p-4" : "h-screen p-4"}>
      <div className={currentView === "create-flow" ? "h-full" : "p-4 md:p-6 lg:p-10"}>
        <Card
          className={
            currentView === "create-flow"
              ? "h-full border-0 bg-white shadow-none"
              : "border-0 bg-white shadow-none"
          }
        >
          <CardContent className={currentView === "create-flow" ? "h-full p-0" : "p-0"}>
            {/* Conditional Content */}
            {currentView === "table" ? (
              <>
                {/* Error/Warning Display */}
                {error && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-800">{error}</p>
                      </div>
                      <button
                        onClick={() => {
                          setError(null);
                        }}
                        className="text-amber-600 hover:text-amber-700"
                      >
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

                {/* Header */}
                <div className="mb-6">
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Manage Panels</h1>
                      <p className="text-base text-gray-500">
                        Create, edit, or delete ticket categories to keep your workspace clean and
                        efficient.
                      </p>
                    </div>
                    {(console.log("Panel permissions debug:", {
                      userPermissions: userPermissions ? userPermissions.toString(16) : undefined,
                      PANEL_CREATE: PermissionFlags.PANEL_CREATE.toString(16),
                      hasPermission: hasPermission(PermissionFlags.PANEL_CREATE),
                      selectedGuildId,
                    }),
                    hasPermission(PermissionFlags.PANEL_CREATE)) && (
                      <Button
                        variant="outline"
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 rounded-xl border-[#103A71] bg-[#EBF1FF] font-medium text-[#103A71]"
                      >
                        <Plus className="size-4" />
                        Create New
                      </Button>
                    )}
                  </div>
                </div>

                {/* Table View */}
                <div className="overflow-hidden">
                  {/* Loading State */}
                  {panelsLoading && (
                    <div className="py-12 text-center">
                      <div className="text-gray-500">Loading panels...</div>
                    </div>
                  )}

                  {/* Error State */}
                  {panelsError && (
                    <div className="py-12 text-center">
                      <div className="text-red-500">Failed to load panels</div>
                    </div>
                  )}

                  {/* Desktop Table */}
                  {!panelsLoading && !panelsError && (
                    <div className="hidden md:block">
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        {/* Table Header */}
                        <div className="border-b border-gray-200 bg-gray-50">
                          <div className="grid grid-cols-12 gap-4 px-6 py-2">
                            <div className="col-span-4 flex items-center gap-1">
                              <span className="text-sm font-medium text-gray-700">Channel</span>
                              <RiExpandUpDownFill className="size-4 text-[#525866]" />
                            </div>
                            <div className="col-span-4 flex items-center gap-1">
                              <span className="text-sm font-medium text-gray-700">
                                Ticket Category
                              </span>
                              <RiExpandUpDownFill className="size-4 text-[#525866]" />
                            </div>
                          </div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-gray-200">
                          {panels.length > 0 ? (
                            panels.map((panel) => (
                              <div
                                key={panel.id}
                                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50"
                              >
                                <div className="col-span-4 flex items-center">
                                  <span className="text-sm text-gray-900">{panel.channel}</span>
                                </div>
                                <div className="col-span-4 flex items-center gap-2">
                                  <span className="text-sm text-gray-900">{panel.title}</span>
                                  {!panel.message_id && (
                                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                      Not deployed
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-4 flex items-center justify-between gap-2">
                                  {hasPermission(PermissionFlags.PANEL_DEPLOY) && (
                                    <Button
                                      variant="outline"
                                      className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
                                      onClick={() => {
                                        void handleResend(panel);
                                      }}
                                    >
                                      <RiRefreshLine className="size-4" />
                                      <span>Resend</span>
                                    </Button>
                                  )}
                                  {hasPermission(PermissionFlags.PANEL_EDIT) && (
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        handleEdit(panel);
                                      }}
                                      className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
                                    >
                                      <RiEditLine className="size-4" />
                                      <span>Edit</span>
                                    </Button>
                                  )}
                                  {hasPermission(PermissionFlags.PANEL_DELETE) && (
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        handleDelete(panel);
                                      }}
                                      className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
                                    >
                                      <RiDeleteBin4Line className="size-4" />
                                      <span>Delete</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-6 py-8 text-center text-gray-500">
                              No panels found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile Cards */}
                  {!panelsLoading && !panelsError && (
                    <div className="space-y-4 md:hidden">
                      {panels.length > 0 ? (
                        panels.map((panel) => (
                          <div
                            key={panel.id}
                            className="rounded-lg border border-gray-200 bg-white p-4"
                          >
                            <div className="space-y-3">
                              <div>
                                <div className="mb-1 text-sm text-gray-500">Channel</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {panel.channel}
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 text-sm text-gray-500">Ticket Category</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium text-gray-900">
                                    {panel.title}
                                  </div>
                                  {!panel.message_id && (
                                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                      Not deployed
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                                <span className="text-sm text-gray-500">Actions</span>
                                <div className="flex items-center gap-2">
                                  {hasPermission(PermissionFlags.PANEL_DEPLOY) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        void handleResend(panel);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                    >
                                      <RotateCcw className="size-4" />
                                    </Button>
                                  )}
                                  {hasPermission(PermissionFlags.PANEL_EDIT) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        handleEdit(panel);
                                      }}
                                      className="p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-700"
                                    >
                                      <Edit className="size-4" />
                                    </Button>
                                  )}
                                  {hasPermission(PermissionFlags.PANEL_DELETE) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        handleDelete(panel);
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
                        ))
                      ) : (
                        <div className="py-8 text-center text-gray-500">No panels found</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col">
                {/* Header with Back Button */}
                <div className="mb-6 border-b border-gray-200 px-6 pb-5 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentView("table");
                    }}
                    className="nice-gray-border flex items-center gap-1 rounded-lg bg-white py-0.5 pl-2 pr-3 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </Button>
                </div>

                {/* Create Flow View */}
                <div className="flex-1 overflow-hidden">
                  <CreatePanelWizard
                    onSubmit={handleCreateSubmit}
                    onBack={() => {
                      setCurrentView("table");
                    }}
                    isLoading={createPanelMutation.isPending}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => {
                setError(null);
              }}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditPanelModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPanel(null);
          setError(null);
        }}
        onSubmit={handleEditSubmit}
        isLoading={editPanelMutation.isPending}
        panel={selectedPanel}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
        }}
      >
        <ModalHeader>
          <h2 className="text-lg font-semibold">Delete Ticket Category</h2>
          <ModalCloseButton
            onClose={() => {
              setIsDeleteModalOpen(false);
            }}
          />
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
          <Button
            variant="outline"
            onClick={() => {
              setIsDeleteModalOpen(false);
            }}
            disabled={deletePanelMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              handleDeleteConfirm();
            }}
            disabled={deletePanelMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deletePanelMutation.isPending ? (
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
    </div>
  );
}
