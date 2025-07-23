import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useFormDraft, useFormStep, useFormActions, notify } from "@/shared/stores/app-store";
import { useCreatePanelMutation } from "@/hooks/use-panel-query";

// Panel schema
const PanelFormSchema = z.object({
  // Step 1: Basic Info
  title: z.string().min(1, "Panel title is required").max(100, "Title too long"),
  buttonText: z.string().min(1, "Button text is required").max(50, "Button text too long"),
  emoji: z.string().optional(),
  type: z.enum(["SINGLE", "MULTI"]).refine((val) => val, {
    message: "Please select a panel type",
  }),

  // Step 2: Content
  content: z.string().optional(),
  welcomeMessage: z.string().optional(),
  introTitle: z.string().optional(),
  introDescription: z.string().optional(),

  // Step 3: Configuration
  channelId: z.string().min(1, "Channel is required"),
  categoryId: z.string().optional(),
  channelPrefix: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

type PanelFormData = z.infer<typeof PanelFormSchema>;

interface PanelFormExampleProps {
  guildId: string;
  channels: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PanelFormExample({
  guildId,
  channels,
  categories,
  onSuccess,
  onCancel,
}: PanelFormExampleProps) {
  const formId = "panel-form";
  const currentStep = useFormStep(formId);
  const { updateDraft, setStep, clearDraft } = useFormActions();
  const draft = useFormDraft(formId);

  const createMutation = useCreatePanelMutation();

  const form = useForm<PanelFormData>({
    resolver: zodResolver(PanelFormSchema),
    defaultValues: draft || {
      type: "SINGLE",
      color: "#103A71",
    },
  });

  // Watch form changes and save to draft
  React.useEffect(() => {
    const subscription = form.watch((data) => {
      updateDraft(formId, data);
    });
    return () => subscription.unsubscribe();
  }, [form, updateDraft]);

  const nextStep = () => {
    const fields = getStepFields(currentStep);
    form.trigger(fields).then((isValid) => {
      if (isValid) {
        setStep(formId, currentStep + 1);
      }
    });
  };

  const prevStep = () => {
    setStep(formId, currentStep - 1);
  };

  const onSubmit = async (data: PanelFormData) => {
    try {
      // Transform the simple form data to match the CreatePanelDto structure
      const panelData = {
        type: data.type,
        guildId,
        channelId: data.channelId,
        welcomeMessage: data.welcomeMessage
          ? {
              title: data.welcomeMessage,
              content: data.content,
            }
          : undefined,
        singlePanel: {
          title: data.title,
          buttonText: data.buttonText,
          emoji: data.emoji,
          categoryId: data.categoryId,
          channelPrefix: data.channelPrefix,
          buttonColor: data.color,
          questions: [],
        },
      };

      await createMutation.mutateAsync(panelData);
      notify.success("Panel created successfully!");
      clearDraft(formId);
      onSuccess?.();
    } catch (error) {
      notify.error(
        "Failed to create panel",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const getStepFields = (step: number): (keyof PanelFormData)[] => {
    switch (step) {
      case 1:
        return ["title", "buttonText", "emoji", "type"];
      case 2:
        return ["content", "welcomeMessage", "introTitle", "introDescription"];
      case 3:
        return ["channelId", "categoryId", "channelPrefix", "color"];
      default:
        return [];
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Panel Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Support Tickets" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buttonText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Text *</FormLabel>
                  <FormControl>
                    <Input placeholder="Create Ticket" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="emoji"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emoji</FormLabel>
                  <FormControl>
                    <Input placeholder="🎫" maxLength={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Panel Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a panel type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single Panel</SelectItem>
                      <SelectItem value="MULTI">Multi Panel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Content & Messages</h3>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Panel Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Click the button below to create a support ticket..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="welcomeMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Welcome! How can we help you today?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="introTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Introduction Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Need Help?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="introDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Introduction Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Our support team is here to assist you..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuration</h3>
            <FormField
              control={form.control}
              name="channelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a channel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channels.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          #{ch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channelPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Prefix</FormLabel>
                  <FormControl>
                    <Input placeholder="ticket-" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Color</FormLabel>
                  <FormControl>
                    <Input type="color" defaultValue="#103A71" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Progress indicator */}
        <div className="mb-8 flex justify-between">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`mx-1 h-2 flex-1 rounded-full ${
                step <= currentStep ? "bg-primary" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {renderStep()}

        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {createMutation.isPending ? "Creating..." : "Create Panel"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
