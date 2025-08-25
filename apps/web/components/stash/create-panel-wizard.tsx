import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { EmojiInput } from "@/components/ui/emoji-input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, ChevronDown, ChevronRight, ChevronLeft, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import DiscordPreview from "@/components/discord-preview";
import TicketChannelPreview from "@/components/ticket-channel-preview";
import { useDiscordChannels, useDiscordRoles, useForms, useTeamRoles } from "@/lib/queries";
import { useSelectServer } from "@/components/select-server-provider";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Question {
  id: string;
  type: "short_answer" | "paragraph";
  label: string;
  placeholder: string;
  enabled: boolean;
  characterLimit?: number;
}

interface Field {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

interface CreatePanelWizardProps {
  onSubmit: (data: {
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
    welcome_fields?: Field[];
    allow_everyone?: boolean;
    large_image_url?: string;
    small_image_url?: string;
  }) => void;
  onBack?: () => void;
  isLoading?: boolean;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="overflow-hidden rounded-lg bg-gray-50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-100"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <ChevronRight
          className={`size-4 text-gray-400 transition-transform duration-200 ${
            isExpanded ? "rotate-90" : ""
          }`}
        />
      </button>
      {isExpanded && <div className="space-y-4 border-t border-gray-200 px-4 pb-4">{children}</div>}
    </div>
  );
};

export default function CreatePanelWizard({
  onSubmit,
  onBack,
  isLoading = false,
  defaultValue = "content",
  onValueChange,
}: CreatePanelWizardProps) {
  // Get current guild
  const { selectedGuildId } = useSelectServer();

  // Fetch Discord channels - request all types including categories (type 4)
  const {
    data: discordChannels,
    isLoading: channelsLoading,
    error: channelsError,
  } = useDiscordChannels(selectedGuildId, [0, 4, 5, 15], false); // Text (0), Category (4), Announcement (5), Forum (15)

  // Fetch Discord roles
  const {
    data: discordRoles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useDiscordRoles(selectedGuildId);

  // Fetch forms
  const { data: forms, isLoading: formsLoading, error: formsError } = useForms(selectedGuildId);

  // Fetch team roles
  const { data: rolesData, isLoading: teamRolesLoading } = useTeamRoles(selectedGuildId);
  const teamRoles = rolesData?.roles || [];

  // Debug logging
  console.log("Discord Roles Debug:", {
    selectedGuildId,
    discordRoles,
    rolesLoading,
    rolesError,
  });
  const [formData, setFormData] = useState({
    channel: "",
    category: "",
    panel_title: "General Support",
    panel_content:
      "Feel free to open a ticket if you need any help. Our Support Team will review it and get back to you as soon as possible!",
    panel_color: "#335CFF",
    button_color: "#335CFF",
    button_emoji: "",
    use_custom_emoji: false,
    large_image_url: "",
    small_image_url: "",
    mention_on_open: "",
    select_team: "",
    hide_mentions: false,
    ticket_category: "",
    form: "None",
    naming_scheme: true,
    exit_survey_form: "",
    awaiting_response_category: "",
    emoji: "📧",
    button_text: "Open Ticket",
    color: "",
    welcome_message: "",
    intro_title: "",
    intro_description: "",
    embed_color: "",
    title_url: "",
    author_name: "",
    author_icon_url: "",
    footer_text: "",
    footer_icon_url: "",
    footer_timestamp: "",
    allow_everyone: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      type: "short_answer",
      label: "Why you are creating this ticket?",
      placeholder: "Why you are creating this ticket?",
      enabled: true,
    },
    {
      id: "2",
      type: "paragraph",
      label: "Enter your Reason...",
      placeholder: "Enter your Reason...",
      enabled: true,
      characterLimit: 200,
    },
  ]);

  const [currentStep, setCurrentStep] = useState(defaultValue);
  const [errors, setErrors] = useState<{
    channel?: string;
    category?: string;
    panel_title?: string;
    color?: string;
    general?: string;
    select_team?: string;
    welcome_message?: string;
  }>({});
  const [fields, setFields] = useState<Field[]>([]);
  const [expandedSections, setExpandedSections] = useState<{
    title: boolean;
    description: boolean;
    author: boolean;
    image: boolean;
    footer: boolean;
    fields: boolean;
  }>({
    title: false,
    description: false,
    author: false,
    image: false,
    footer: false,
    fields: false,
  });

  const [footerDate, setFooterDate] = useState<Date | undefined>(undefined);
  const [footerTime, setFooterTime] = useState("00:00");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Debug logging
  useEffect(() => {
    if (channelsError) {
      console.error("Failed to load Discord channels:", channelsError);
    }
    if (discordChannels) {
      console.log("Loaded Discord channels:", discordChannels);
      const categories = discordChannels.filter((ch) => ch.type === 4);
      console.log("Category channels:", categories);
    }
  }, [discordChannels, channelsError]);

  useEffect(() => {
    if (rolesError) {
      console.error("Failed to load Discord roles:", rolesError);
    }
    if (discordRoles) {
      console.log("Loaded Discord roles:", discordRoles);
    }
  }, [discordRoles, rolesError]);

  // Set default channel to first text channel when channels are loaded
  useEffect(() => {
    if (discordChannels && discordChannels.length > 0 && !formData.channel) {
      const textChannels = discordChannels.filter((channel) => channel.type === 0);
      if (textChannels.length > 0) {
        const firstChannel = textChannels[0];
        if (firstChannel?.id) {
          setFormData((prev) => ({ ...prev, channel: firstChannel.id || "" }));
        }
      }
    }
  }, [discordChannels, formData.channel, setFormData]);

  // Set default ticket category to first category channel when channels are loaded
  useEffect(() => {
    if (discordChannels && discordChannels.length > 0 && !formData.ticket_category) {
      const categoryChannels = discordChannels.filter((channel) => channel.type === 4);
      if (categoryChannels.length > 0) {
        setFormData((prev) => ({
          ...prev,
          ticket_category: categoryChannels[0]?.id || "",
        }));
      }
    }
  }, [discordChannels, formData.ticket_category, setFormData]);

  const steps = [
    { value: "content", title: "Panel Content" },
    { value: "properties", title: "Ticket Properties" },
    { value: "welcome", title: "Welcome Message" },
    { value: "access", title: "Access Control" },
  ];

  const validateCurrentStep = () => {
    const newErrors: typeof errors = {};

    if (currentStep === "content") {
      if (!formData.channel.trim()) {
        newErrors.channel = "Please select a channel";
      }
      if (!formData.panel_title.trim()) {
        newErrors.panel_title = "Panel title is required";
      }
    } else if (currentStep === "properties") {
      if (teamRoles.length > 0 && !formData.select_team.trim()) {
        newErrors.select_team = "Please select a role";
      }
    } else if (currentStep === "welcome") {
      if (!formData.welcome_message.trim()) {
        newErrors.welcome_message = "Welcome message is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.value === currentStep);
  };

  const handleStepChange = (value: string) => {
    setCurrentStep(value);
    onValueChange?.(value);
  };

  const nextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (validateCurrentStep() && currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      if (nextStep) {
        handleStepChange(nextStep.value);
      }
    }
  };

  const validateForm = () => {
    // Validate all steps for final submission
    const newErrors: typeof errors = {};

    if (!formData.channel.trim()) {
      newErrors.channel = "Channel name is required";
    }

    if (!formData.panel_title.trim()) {
      newErrors.category = "Panel title is required";
    }

    if (formData.color.trim() && !/^#[0-9A-Fa-f]{6}$/.test(formData.color.trim())) {
      newErrors.color = "Color must be a valid hex format (e.g., #1B4F72)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // Prepare welcome message fields
    const welcomeMessageData = {
      title: formData.panel_title || formData.category,
      content: formData.panel_content || undefined,
      fields: fields.filter((f) => f.name && f.value),
    };

    const submitData: Parameters<typeof onSubmit>[0] = {
      channel: formData.channel,
      category: formData.panel_title || formData.category,
      questions: questions.filter((q) => q.enabled),
    };

    // Add optional properties only if they have values
    const mentionOnOpen = formData.mention_on_open.trim();
    if (mentionOnOpen) submitData.mention_on_open = mentionOnOpen;

    const selectTeam = formData.select_team.trim();
    if (selectTeam) submitData.select_team = selectTeam;

    if (formData.hide_mentions) submitData.hide_mentions = formData.hide_mentions;

    const ticketCategory = formData.ticket_category.trim();
    if (ticketCategory) submitData.ticket_category = ticketCategory;

    const form = formData.form.trim();
    if (form) submitData.form = form;

    if (formData.naming_scheme) submitData.naming_scheme = formData.naming_scheme;

    const exitSurveyForm = formData.exit_survey_form.trim();
    if (exitSurveyForm) submitData.exit_survey_form = exitSurveyForm;

    const awaitingResponseCategory = formData.awaiting_response_category.trim();
    if (awaitingResponseCategory) submitData.awaiting_response_category = awaitingResponseCategory;

    const emoji = formData.emoji.trim();
    if (emoji) submitData.emoji = emoji;

    const buttonText = formData.button_text.trim();
    if (buttonText) submitData.button_text = buttonText;

    const color = formData.button_color.trim();
    if (color) submitData.color = color;

    if (welcomeMessageData.content) submitData.welcome_message = welcomeMessageData.content;
    if (welcomeMessageData.title) submitData.intro_title = welcomeMessageData.title;

    const introDescription = formData.intro_description.trim();
    if (introDescription) submitData.intro_description = introDescription;

    if (welcomeMessageData.fields.length > 0) {
      submitData.welcome_fields = welcomeMessageData.fields;
    }

    submitData.allow_everyone = formData.allow_everyone;

    const largeImageUrl = formData.large_image_url.trim();
    if (largeImageUrl) submitData.large_image_url = largeImageUrl;

    const smallImageUrl = formData.small_image_url.trim();
    if (smallImageUrl) submitData.small_image_url = smallImageUrl;

    onSubmit(submitData);
  };

  return (
    <div className="grid h-[80vh] grid-cols-12">
      {/* Sidebar */}
      <div className="nice-gray-border col-span-2 h-full bg-white p-4">
        <div className="mb-3">
          <h2 className="text-xs tracking-wide text-[#99A0AE]">CREATE PANEL</h2>
        </div>

        <nav className="space-y-1">
          {steps.map((step, index) => (
            <Button
              key={step.value}
              variant="ghost"
              onClick={() => {
                handleStepChange(step.value);
              }}
              data-state={
                currentStep === step.value
                  ? "active"
                  : getCurrentStepIndex() > steps.findIndex((s) => s.value === step.value)
                    ? "completed"
                    : "inactive"
              }
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl p-2 pr-3 text-left transition-all duration-300 ease-in-out hover:bg-gray-50 data-[state=active]:bg-[#F5F7FA] data-[state=active]:text-gray-900 data-[state=completed]:text-gray-700 data-[state=inactive]:text-gray-500"
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex size-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 data-[state=active]:bg-[#335CFF] data-[state=active]:text-white"
                  data-state={currentStep === step.value ? "active" : "inactive"}
                >
                  {index + 1}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              {currentStep === step.value && <ChevronRight className="size-4 text-gray-900" />}
            </Button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="col-span-10 grid h-full grid-cols-10 overflow-scroll bg-white">
        {/* Form Section */}
        <div className="col-span-5 flex h-full flex-col">
          <div className="flex-1 overflow-hidden px-6 py-6">
            {currentStep === "properties" && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 border-b border-gray-200 pb-4 font-semibold text-gray-900">
                    Ticket Properties
                  </h3>
                </div>

                {/* Mention on Open */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Mention on Open
                  </label>
                  <MultiSelect
                    options={[
                      { value: "ticket-opener", label: "Ticket Opener" },
                      { value: "here", label: "@here" },
                      { value: "everyone", label: "@everyone" },
                      ...(discordRoles?.map((role) => ({
                        value: role.id,
                        label: role.name,
                      })) || []),
                    ]}
                    selected={selectedRoles}
                    onChange={(selected) => {
                      setSelectedRoles(selected);
                      // Store role IDs in formData
                      setFormData({
                        ...formData,
                        mention_on_open: selected.join(","),
                      });
                    }}
                    placeholder={
                      rolesLoading
                        ? "Loading roles..."
                        : rolesError
                          ? "Error loading roles"
                          : "Select roles..."
                    }
                    disabled={rolesLoading || !!rolesError}
                  />
                  {rolesError && (
                    <p className="mt-1 text-xs text-red-500">
                      Failed to load roles. Make sure the bot is installed in the server.
                    </p>
                  )}
                </div>

                {/* Select Team */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Select Role <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.select_team}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        select_team: value,
                      });
                    }}
                    disabled={teamRolesLoading || teamRoles.length === 0}
                  >
                    <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
                      <SelectValue
                        placeholder={
                          teamRolesLoading
                            ? "Loading roles..."
                            : teamRoles.length === 0
                              ? "No roles available"
                              : "Select a role"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {teamRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: role.color }}
                            />
                            <span>{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</span>
                            {role.isDefault && (
                              <span className="text-xs text-gray-500">(Default)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.select_team && (
                    <p className="mt-1 text-xs text-red-500">{errors.select_team}</p>
                  )}
                  {teamRoles.length === 0 && !teamRolesLoading && (
                    <p className="mt-1 text-xs text-gray-500">
                      No roles have been created for this server yet.
                    </p>
                  )}
                </div>

                {/* Hide Mentions */}
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Hide Mentions</span>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            hide_mentions: !formData.hide_mentions,
                          });
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                          formData.hide_mentions ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.hide_mentions ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Mentioned users will receive a notification, but their handles won&apos;t be
                    shown in the message. The message highlighting is also removed.
                  </p>
                </div>

                {/* Ticket Category and Form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Ticket Category
                    </label>
                    <Select
                      value={formData.ticket_category}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          ticket_category: value,
                        });
                      }}
                      disabled={channelsLoading}
                    >
                      <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
                        <SelectValue
                          placeholder={
                            channelsLoading
                              ? "Loading categories..."
                              : channelsError
                                ? "Error loading categories"
                                : "Select a category"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!channelsLoading && !channelsError && discordChannels
                          ? discordChannels
                              .filter((channel) => channel.type === 4) // Filter for category channels only
                              .sort((a, b) => a.position - b.position)
                              .map((category) => (
                                <SelectItem key={category.id} value={category.id || ""}>
                                  {category.name}
                                </SelectItem>
                              ))
                          : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Form</label>
                    <Select
                      value={formData.form || "none"}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          form: value === "none" ? "" : value,
                        });
                      }}
                      disabled={formsLoading}
                    >
                      <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
                        <SelectValue
                          placeholder={
                            formsLoading
                              ? "Loading forms..."
                              : formsError
                                ? "Error loading forms"
                                : "None"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {!formsLoading &&
                          !formsError &&
                          forms &&
                          forms.map((form) => (
                            <SelectItem key={form.id} value={form.id.toString()}>
                              {form.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Naming Scheme */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Naming Scheme</label>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Use Server Default</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          naming_scheme: !formData.naming_scheme,
                        });
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                        formData.naming_scheme ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.naming_scheme ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Exit Survey Form */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Exit Survey Form
                  </label>
                  <Select
                    value={formData.exit_survey_form || "none"}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        exit_survey_form: value === "none" ? "" : value,
                      });
                    }}
                    disabled={formsLoading}
                  >
                    <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
                      <SelectValue
                        placeholder={
                          formsLoading
                            ? "Loading forms..."
                            : formsError
                              ? "Error loading forms"
                              : "None"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {!formsLoading &&
                        !formsError &&
                        forms &&
                        forms.map((form) => (
                          <SelectItem key={form.id} value={form.id.toString()}>
                            {form.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Awaiting Response Category */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Awaiting Response Category
                  </label>
                  <Select
                    value={formData.awaiting_response_category || "none"}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        awaiting_response_category: value === "none" ? "" : value,
                      });
                    }}
                    disabled={channelsLoading}
                  >
                    <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
                      <SelectValue
                        placeholder={
                          channelsLoading
                            ? "Loading categories..."
                            : channelsError
                              ? "Error loading categories"
                              : "None"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {!channelsLoading &&
                        !channelsError &&
                        discordChannels &&
                        discordChannels
                          .filter((channel) => channel.type === 4) // Filter for category channels only
                          .sort((a, b) => a.position - b.position)
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id || ""}>
                              {category.name}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === "content" && (
              <div className="space-y-3">
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">Panel Content</h3>
                </div>

                {/* Panel Title */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.panel_title}
                    onChange={(e) => {
                      setFormData({ ...formData, panel_title: e.target.value });
                      if (errors.panel_title) {
                        setErrors((prev) => {
                          const { panel_title: _panel_title, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    placeholder="Panel Title"
                    className={cn(
                      "w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm",
                      errors.panel_title && "border-red-500"
                    )}
                  />
                  {errors.panel_title && (
                    <p className="mt-1 text-xs text-red-500">{errors.panel_title}</p>
                  )}
                </div>

                {/* Panel Content */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Content</label>
                  <div className="relative">
                    <textarea
                      value={formData.panel_content}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          panel_content: e.target.value,
                        });
                      }}
                      placeholder="By clicking the button, a ticket will be opened for you."
                      className="focus:ring-ring/20 focus:border-ring/50 min-h-[80px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pb-8 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
                      rows={3}
                    />
                    <div className="absolute bottom-2 right-3">
                      <span className="text-xs text-gray-500">
                        {formData.panel_content.length}/300
                      </span>
                    </div>
                  </div>
                </div>

                {/* Panel Color and Panel Channel */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Panel Color
                    </label>
                    <ColorPicker
                      value={formData.panel_color}
                      onChange={(color) => {
                        setFormData({
                          ...formData,
                          panel_color: color,
                        });
                      }}
                      placeholder="#1FC16B"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Channel <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.channel}
                      onValueChange={(value) => {
                        setFormData({
                          ...formData,
                          channel: value,
                        });
                        if (errors.channel) {
                          setErrors((prev) => {
                            const { channel: _channel, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      disabled={channelsLoading}
                    >
                      <SelectTrigger
                        className={cn(
                          "focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1",
                          errors.channel ? "border-red-500" : "nice-gray-border"
                        )}
                      >
                        <SelectValue
                          placeholder={
                            channelsLoading
                              ? "Loading channels..."
                              : channelsError
                                ? "Failed to load channels"
                                : "Select a channel"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!channelsLoading &&
                          !channelsError &&
                          discordChannels &&
                          discordChannels
                            .filter((channel) => channel.type === 0) // Filter for text channels only
                            .sort((a, b) => a.position - b.position)
                            .map((channel) => (
                              <SelectItem key={channel.id} value={channel.id || ""}>
                                # {channel.name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    {errors.channel && (
                      <p className="mt-1 text-xs text-red-500">{errors.channel}</p>
                    )}
                  </div>
                </div>

                {/* Button Settings */}
                <div className="nice-gray-border space-y-3 rounded-2xl p-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Button Text
                    </label>
                    <Input
                      value={formData.button_text}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          button_text: e.target.value,
                        });
                      }}
                      placeholder="Open ticket!"
                      className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Button Colour
                      </label>
                      <ColorPicker
                        value={formData.button_color}
                        onChange={(color) => {
                          setFormData({
                            ...formData,
                            button_color: color,
                          });
                        }}
                        placeholder="#2096FF"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Button Emoji
                      </label>
                      <EmojiInput
                        value={formData.emoji}
                        onChange={(emoji) => {
                          setFormData({
                            ...formData,
                            emoji: emoji,
                          });
                        }}
                        placeholder="Select an emoji..."
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Image (optional)
                  </label>
                  <Input
                    value={formData.large_image_url}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        large_image_url: e.target.value,
                      });
                    }}
                    placeholder="https://your-image-url.com"
                    className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                  />
                </div>

                {/* Thumbnail URL */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Thumbnail (optional)
                  </label>
                  <Input
                    value={formData.small_image_url}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        small_image_url: e.target.value,
                      });
                    }}
                    placeholder="https://your-thumbnail-url.com"
                    className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                  />
                </div>
              </div>
            )}

            {currentStep === "welcome" && (
              <div className="space-y-3">
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-gray-900">Welcome Message</h3>
                </div>

                {/* Welcome Message */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Welcome Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.welcome_message}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        welcome_message: e.target.value,
                      });
                    }}
                    placeholder="Thank you for contacting support. Please describe your issue and we'll wait for a response."
                    className="focus:ring-ring/20 focus:border-ring/50 min-h-[60px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
                    rows={2}
                  />
                  {errors.welcome_message && (
                    <p className="mt-1 text-xs text-red-500">{errors.welcome_message}</p>
                  )}
                </div>

                {/* Embed Colour */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Embed Colour
                  </label>
                  <ColorPicker
                    value={formData.embed_color}
                    onChange={(color) => {
                      setFormData({
                        ...formData,
                        embed_color: color,
                      });
                    }}
                    placeholder="#1FC16B"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Title <span className="text-gray-400">(optional)</span>
                  </label>
                  <Input
                    value={formData.intro_title}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        intro_title: e.target.value,
                      });
                    }}
                    placeholder="Embed Title"
                    className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                  />
                </div>

                {/* Title URL */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Title URL <span className="text-gray-400">(optional)</span>
                  </label>
                  <Input
                    value={formData.title_url}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        title_url: e.target.value,
                      });
                    }}
                    placeholder="https://example.com"
                    className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.intro_description}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          intro_description: e.target.value,
                        });
                      }}
                      placeholder="Thank you for contacting support.
Please describe your issue and wait for a response."
                      className="focus:ring-ring/20 focus:border-ring/50 min-h-[80px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pb-8 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
                      rows={3}
                    />
                    <div className="absolute bottom-2 right-3">
                      <span className="text-xs text-gray-500">
                        {formData.intro_description.length}/2048
                      </span>
                    </div>
                  </div>
                </div>

                {/* Author Section */}
                <CollapsibleSection
                  title="Author"
                  isExpanded={expandedSections.author}
                  onToggle={() => {
                    setExpandedSections({
                      ...expandedSections,
                      author: !expandedSections.author,
                    });
                  }}
                >
                  <div className="pt-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Author Name <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={formData.author_name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          author_name: e.target.value,
                        });
                      }}
                      placeholder="Author Name"
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Author Name <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={formData.author_name}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          author_name: e.target.value,
                        });
                      }}
                      placeholder="Author Name"
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Author Icon URL <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={formData.author_icon_url}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          author_icon_url: e.target.value,
                        });
                      }}
                      placeholder="https://example.com"
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                </CollapsibleSection>

                {/* Image Section */}
                <CollapsibleSection
                  title="Image"
                  isExpanded={expandedSections.image}
                  onToggle={() => {
                    setExpandedSections({
                      ...expandedSections,
                      image: !expandedSections.image,
                    });
                  }}
                >
                  <div className="pt-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Image <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={formData.large_image_url}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          large_image_url: e.target.value,
                        });
                      }}
                      placeholder="https://example.com/image.png"
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Thumbnail <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={formData.small_image_url}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          small_image_url: e.target.value,
                        });
                      }}
                      placeholder="https://example.com/image.png"
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                </CollapsibleSection>

                {/* Footer Section */}
                <CollapsibleSection
                  title="Footer"
                  isExpanded={expandedSections.footer}
                  onToggle={() => {
                    setExpandedSections({
                      ...expandedSections,
                      footer: !expandedSections.footer,
                    });
                  }}
                >
                  <div className="pt-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Footer Text
                    </label>
                    <Input
                      value={formData.footer_text}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          footer_text: e.target.value,
                        });
                      }}
                      placeholder="Footer Text"
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Footer Icon URL <span className="text-gray-400">(optional)</span>
                    </label>
                    <Input
                      value={formData.footer_icon_url}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          footer_icon_url: e.target.value,
                        });
                      }}
                      placeholder="https://example.com/image.png"
                      className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Footer Timestamp <span className="text-gray-400">(optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-auto flex-1 justify-start rounded-lg border-gray-200 bg-white px-4 py-3 text-left font-normal",
                              !footerDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {footerDate ? format(footerDate, "yyyy-MM-dd") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={footerDate}
                            onSelect={(date) => {
                              setFooterDate(date);
                              if (date && footerTime) {
                                const timestamp = format(date, "yyyy-MM-dd") + ", " + footerTime;
                                setFormData({
                                  ...formData,
                                  footer_timestamp: timestamp,
                                });
                              }
                              setDatePickerOpen(false);
                            }}
                            captionLayout="dropdown"
                            startMonth={new Date(2020, 0)}
                            endMonth={new Date(2030, 11)}
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={footerTime}
                        onChange={(e) => {
                          const time = e.target.value;
                          setFooterTime(time);
                          if (footerDate && time) {
                            const timestamp = format(footerDate, "yyyy-MM-dd") + ", " + time;
                            setFormData({
                              ...formData,
                              footer_timestamp: timestamp,
                            });
                          }
                        }}
                        className="w-32 rounded-lg border-gray-200 bg-white px-4 py-3"
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Fields Section */}
                <CollapsibleSection
                  title="Fields"
                  isExpanded={expandedSections.fields}
                  onToggle={() => {
                    setExpandedSections({
                      ...expandedSections,
                      fields: !expandedSections.fields,
                    });
                  }}
                >
                  <div className="space-y-3 pt-2">
                    {fields.map((field) => (
                      <div key={field.id} className="space-y-3">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Field Name
                          </label>
                          <Input
                            value={field.name}
                            onChange={(e) => {
                              setFields(
                                fields.map((f) =>
                                  f.id === field.id ? { ...f, name: e.target.value } : f
                                )
                              );
                            }}
                            placeholder="Field Name"
                            className="w-full rounded-lg border-gray-200 bg-white px-4 py-3 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Field Value
                          </label>
                          <div className="relative">
                            <textarea
                              value={field.value}
                              onChange={(e) => {
                                setFields(
                                  fields.map((f) =>
                                    f.id === field.id ? { ...f, value: e.target.value } : f
                                  )
                                );
                              }}
                              placeholder="Describe..."
                              className="focus:ring-ring/20 focus:border-ring/50 min-h-[80px] w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 pb-8 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
                              rows={3}
                            />
                            <div className="absolute bottom-2 right-3">
                              <span className="text-xs text-gray-500">
                                {field.value.length}/200
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">Inline</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFields(
                                  fields.map((f) =>
                                    f.id === field.id ? { ...f, inline: !f.inline } : f
                                  )
                                );
                              }}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                                field.inline ? "bg-blue-600" : "bg-gray-200"
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                  field.inline ? "translate-x-5" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFields(fields.filter((f) => f.id !== field.id));
                            }}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="size-3" />
                            Delete Field
                          </button>
                        </div>
                        {fields.indexOf(field) < fields.length - 1 && (
                          <div className="border-b border-gray-200" />
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newField: Field = {
                          id: Date.now().toString(),
                          name: "",
                          value: "",
                          inline: false,
                        };
                        setFields([...fields, newField]);
                      }}
                      className="w-full rounded-lg border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="mr-2 size-4" />
                      Add Field
                    </Button>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {currentStep === "access" && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900">Access Control</h3>
                  <p className="text-sm text-gray-500">
                    Control who can open tickets with form this panel. Rules are evaluated form top
                    to be bottom, stopping after the first match.
                  </p>
                </div>

                {/* Add Role Section */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Add Role <span className="text-gray-400">@</span>
                  </label>
                  <div className="relative">
                    <select
                      className="focus:ring-ring/20 focus:border-ring/50 w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Add another role...
                      </option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 transform text-gray-400" />
                  </div>
                </div>

                {/* Allow Everyone Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Allow Everyone</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        allow_everyone: !formData.allow_everyone,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                      formData.allow_everyone ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.allow_everyone ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={onBack}
                    variant="outline"
                    className="flex-1 rounded-lg border-gray-200 py-3 text-gray-700 hover:bg-gray-50"
                  >
                    <ChevronLeft className="mr-2 size-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !formData.channel.trim() || !formData.panel_title.trim()}
                    className="flex-1 rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
                  >
                    Create Panel
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {currentStep !== "access" && (
            <div className="mt-auto p-4">
              {getCurrentStepIndex() < steps.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={
                    (currentStep === "content" &&
                      (!formData.channel.trim() || !formData.panel_title.trim())) ||
                    (currentStep === "properties" && !formData.select_team.trim()) ||
                    (currentStep === "welcome" && !formData.welcome_message.trim())
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.channel.trim() || !formData.panel_title.trim()}
                  className="w-full rounded-lg bg-[#1B4F72] py-3 text-white hover:bg-[#154360]"
                >
                  {isLoading ? "Creating..." : "Save"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Discord Preview Section */}
        <div className="col-span-5 mr-5 overflow-hidden rounded-3xl bg-gray-50 px-8 py-7">
          <div className="mx-auto flex max-w-2xl flex-col gap-8">
            {/* Panel Preview */}
            <div>
              <h3 className="mb-3 text-xs font-medium tracking-wide text-gray-700">
                PANEL PREVIEW
              </h3>
              <DiscordPreview
                content={formData.panel_content}
                embedColor={formData.panel_color || "#5865F2"}
                embedTitle={formData.panel_title}
                fields={fields}
                footerText={formData.footer_text || "Powered by ticketsbot.cloud"}
                buttonText={formData.button_text || "Open ticket"}
                buttonEmoji={formData.emoji || "📧"}
                buttonColor={formData.button_color || "#335CFF"}
                channelName={
                  formData.channel
                    ? discordChannels?.find((ch) => ch.id === formData.channel)?.name || "general"
                    : "general"
                }
                largeImageUrl={formData.large_image_url}
                smallImageUrl={formData.small_image_url}
              />
            </div>

            {/* Ticket Channel Preview */}
            <div>
              <h3 className="mb-3 text-xs font-medium tracking-wide text-gray-700">
                TICKET PREVIEW
              </h3>
              <TicketChannelPreview
                welcomeMessage={formData.welcome_message}
                embedColor={formData.embed_color || "#5865F2"}
                ticketNumber={9}
                mentionedRoles={
                  selectedRoles.length > 0
                    ? selectedRoles.map((roleId) => {
                        // Handle special mention types
                        if (roleId === "ticket-opener") return "@ticket-opener";
                        if (roleId === "here") return "@here";
                        if (roleId === "everyone") return "@everyone";
                        // Handle regular role IDs
                        return discordRoles?.find((r) => r.id === roleId)?.name || roleId;
                      })
                    : [] // No mentions when no roles selected
                }
                showMentions={!formData.hide_mentions}
                useNamingScheme={formData.naming_scheme}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
