import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ModalCloseButton,
} from "@/components/ui/modal";
import { Plus, User, MessageSquare, Info, Trash2, ChevronDown, AlertCircle } from "lucide-react";
import type { Panel } from "@/lib/queries";

interface Question {
  id: string;
  type: "short_answer" | "paragraph";
  label: string;
  placeholder: string;
  enabled: boolean;
  characterLimit?: number;
}

interface EditPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    channel: string;
    category: string;
    questions: Question[];
    emoji?: string;
    button_text?: string;
    color?: string;
    welcome_message?: string;
    intro_title?: string;
    intro_description?: string;
  }) => void;
  isLoading?: boolean;
  panel: Panel | null;
}

export default function EditPanelModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  panel,
}: EditPanelModalProps) {
  const [formData, setFormData] = useState({
    channel: "",
    category: "",
    emoji: "",
    button_text: "",
    color: "",
    welcome_message: "",
    intro_title: "",
    intro_description: "",
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [addQuestionsEnabled, setAddQuestionsEnabled] = useState(true);
  const [errors, setErrors] = useState<{
    channel?: string;
    category?: string;
    color?: string;
    general?: string;
  }>({});

  // Load panel data when panel changes
  useEffect(() => {
    if (panel && isOpen) {
      // Convert panel data to form format
      const channelName = panel.channel.replace("# | ", "");

      setFormData({
        channel: channelName,
        category: panel.title,
        emoji: panel.emoji || "",
        button_text: panel.button_text || "",
        color: panel.color || "",
        welcome_message: panel.welcome_message || "",
        intro_title: panel.intro_title || "",
        intro_description: panel.intro_description || "",
      });

      // Convert form fields to questions format
      if (panel.form?.fields) {
        const convertedQuestions: Question[] = panel.form.fields.map((field) => ({
          id: field.id.toString(),
          type: field.type === "SHORT_ANSWER" ? "short_answer" : "paragraph",
          label: field.label,
          placeholder: field.placeholder || "",
          enabled: true,
          characterLimit: field.validation_rules
            ? JSON.parse(field.validation_rules).maxLength
            : undefined,
        }));
        setQuestions(convertedQuestions);
        setAddQuestionsEnabled(convertedQuestions.length > 0);
      } else {
        // Default questions if no form exists
        setQuestions([
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
        setAddQuestionsEnabled(true);
      }

      setErrors({});
    }
  }, [panel, isOpen]);

  const resetForm = () => {
    setFormData({
      channel: "",
      category: "",
      emoji: "",
      button_text: "",
      color: "",
      welcome_message: "",
      intro_title: "",
      intro_description: "",
    });
    setQuestions([
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
    setAddQuestionsEnabled(true);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.channel.trim()) {
      newErrors.channel = "Channel name is required";
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category name is required";
    }

    // Validate hex color format if provided
    if (formData.color.trim() && !/^#[0-9A-Fa-f]{6}$/.test(formData.color.trim())) {
      newErrors.color = "Color must be a valid hex format (e.g., #1B4F72)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData: {
      channel: string;
      category: string;
      questions: Question[];
      emoji?: string;
      button_text?: string;
      color?: string;
      welcome_message?: string;
      intro_title?: string;
      intro_description?: string;
    } = {
      channel: formData.channel,
      category: formData.category,
      questions: questions.filter((q) => q.enabled),
    };

    if (formData.emoji.trim()) submitData.emoji = formData.emoji.trim();
    if (formData.button_text.trim()) submitData.button_text = formData.button_text.trim();
    if (formData.color.trim()) submitData.color = formData.color.trim();
    if (formData.welcome_message.trim())
      submitData.welcome_message = formData.welcome_message.trim();
    if (formData.intro_title.trim()) submitData.intro_title = formData.intro_title.trim();
    if (formData.intro_description.trim())
      submitData.intro_description = formData.intro_description.trim();

    onSubmit(submitData);
  };

  const toggleQuestion = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, enabled: !q.enabled } : q))
    );
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const addNewQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: "short_answer",
      label: "New question",
      placeholder: "Enter question...",
      enabled: true,
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, ...updates } : q)));
  };

  if (!panel) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold text-gray-900">Edit Panel</h2>
        <ModalCloseButton onClose={handleClose} />
      </ModalHeader>
      <ModalContent className="space-y-6">
        {/* Channel Name */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Name the Channel</label>
            <Info className="size-4 text-gray-400" />
          </div>
          <Input
            value={formData.channel}
            onChange={(e) => {
              setFormData({ ...formData, channel: e.target.value });
              if (errors.channel) {
                setErrors((prev) => {
                  const { channel: _channel, ...rest } = prev;
                  return rest;
                });
              }
            }}
            placeholder="e.g. Support"
            className={`w-full rounded-lg bg-gray-50 px-4 py-3 ${
              errors.channel
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-200"
            }`}
          />
          {errors.channel && (
            <div className="mt-1 flex items-center gap-2">
              <AlertCircle className="size-4 text-red-500" />
              <span className="text-sm text-red-600">{errors.channel}</span>
            </div>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Select or Name the Category</label>
            <Info className="size-4 text-gray-400" />
          </div>
          <div className="relative">
            <Input
              value={formData.category}
              onChange={(e) => {
                setFormData({ ...formData, category: e.target.value });
                if (errors.category) {
                  setErrors((prev) => {
                    const { category: _category, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="e.g. General Support"
              className={`w-full rounded-lg bg-gray-50 px-4 py-3 pr-10 ${
                errors.category
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200"
              }`}
            />
            <ChevronDown className="absolute right-3 top-1/2 size-4 -translate-y-1/2 transform text-gray-400" />
          </div>
          {errors.category && (
            <div className="mt-1 flex items-center gap-2">
              <AlertCircle className="size-4 text-red-500" />
              <span className="text-sm text-red-600">{errors.category}</span>
            </div>
          )}
        </div>

        {/* Panel Customization */}
        <div className="space-y-4 rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900">Panel Customization</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Emoji */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Emoji (Optional)
              </label>
              <Input
                value={formData.emoji}
                onChange={(e) => {
                  setFormData({ ...formData, emoji: e.target.value });
                }}
                placeholder="🎫"
                className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3"
              />
            </div>

            {/* Button Text */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Button Text (Optional)
              </label>
              <Input
                value={formData.button_text}
                onChange={(e) => {
                  setFormData({ ...formData, button_text: e.target.value });
                }}
                placeholder="Create Ticket"
                className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Color (Optional)</label>
            <Input
              value={formData.color}
              onChange={(e) => {
                setFormData({ ...formData, color: e.target.value });
                if (errors.color) {
                  setErrors((prev) => {
                    const { color: _color, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              placeholder="#1B4F72"
              className={`w-full rounded-lg bg-gray-50 px-4 py-3 ${
                errors.color
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-200"
              }`}
            />
            {errors.color && (
              <div className="mt-1 flex items-center gap-2">
                <AlertCircle className="size-4 text-red-500" />
                <span className="text-sm text-red-600">{errors.color}</span>
              </div>
            )}
          </div>

          {/* Welcome Message */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Welcome Message (Optional)
            </label>
            <Input
              value={formData.welcome_message}
              onChange={(e) => {
                setFormData({ ...formData, welcome_message: e.target.value });
              }}
              placeholder="Welcome! Please describe your issue..."
              className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Intro Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Intro Title (Optional)
              </label>
              <Input
                value={formData.intro_title}
                onChange={(e) => {
                  setFormData({ ...formData, intro_title: e.target.value });
                }}
                placeholder="Get Support"
                className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3"
              />
            </div>

            {/* Intro Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Intro Description (Optional)
              </label>
              <Input
                value={formData.intro_description}
                onChange={(e) => {
                  setFormData({ ...formData, intro_description: e.target.value });
                }}
                placeholder="Describe what this panel is for..."
                className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3"
              />
            </div>
          </div>
        </div>

        {/* Add Questions Section */}
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="size-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Edit Questions for Users</span>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setAddQuestionsEnabled(!addQuestionsEnabled);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  addQuestionsEnabled ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    addQuestionsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {addQuestionsEnabled && (
            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {question.type === "short_answer" ? "Short Answer" : "Paragraph"}
                      </span>
                      <Info className="size-3 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          toggleQuestion(question.id);
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          question.enabled ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            question.enabled ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          deleteQuestion(question.id);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 size-4 text-gray-400" />
                    <Input
                      value={question.placeholder}
                      onChange={(e) => {
                        updateQuestion(question.id, {
                          placeholder: e.target.value,
                        });
                      }}
                      className="w-full rounded-lg border-gray-200 bg-gray-50 py-3 pl-10 pr-4"
                      disabled={!question.enabled}
                    />
                  </div>

                  {question.type === "paragraph" && question.characterLimit && (
                    <div className="text-right">
                      <span className="text-xs text-gray-500">0/{question.characterLimit}</span>
                    </div>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addNewQuestion}
                className="w-full rounded-lg border-blue-200 bg-blue-50 py-3 text-blue-600 hover:bg-blue-100"
              >
                <Plus className="mr-2 size-4" />
                Add new Questions
              </Button>
            </div>
          )}
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isLoading} className="mr-2">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !formData.channel.trim() || !formData.category.trim()}
          className="rounded-lg bg-[#1B4F72] py-3 font-medium text-white hover:bg-[#154360]"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
