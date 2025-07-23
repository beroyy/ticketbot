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
  FormDescription,
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
import { notify } from "@/shared/stores/app-store";

// Settings schema
const SettingsSchema = z.object({
  prefix: z
    .string()
    .min(1, "Prefix is required")
    .max(5, "Prefix must be 5 characters or less")
    .regex(/^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~\w]+$/, "Invalid prefix character"),
  welcomeMessage: z.string().max(1000, "Welcome message too long").optional(),
  autoCloseTime: z
    .number()
    .min(0, "Auto-close time must be positive")
    .max(720, "Auto-close time cannot exceed 720 hours"),
  ticketCategory: z.string().min(1, "Please select a category"),
  maxOpenTickets: z
    .number()
    .min(1, "Must allow at least 1 ticket")
    .max(10, "Cannot exceed 10 open tickets"),
  language: z.enum(["en", "es", "fr", "de", "ja"]),
});

type SettingsData = z.infer<typeof SettingsSchema>;

interface SettingsFormExampleProps {
  defaultValues?: Partial<SettingsData>;
  onSubmit: (data: SettingsData) => Promise<void>;
  categories: Array<{ id: string; name: string }>;
}

export function SettingsFormExample({
  defaultValues,
  onSubmit,
  categories,
}: SettingsFormExampleProps) {
  const form = useForm<SettingsData>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      prefix: "!",
      autoCloseTime: 24,
      maxOpenTickets: 3,
      language: "en",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: SettingsData) => {
    try {
      await onSubmit(data);
      notify.success("Settings saved successfully!");
    } catch (error) {
      notify.error(
        "Failed to save settings",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Command Prefix *</FormLabel>
                  <FormControl>
                    <Input placeholder="!" {...field} />
                  </FormControl>
                  <FormDescription>The prefix for bot commands</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="welcomeMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Welcome Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Welcome to our support system! How can we help you today?"
                    rows={4}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>{field.value?.length || 0} / 1000 characters</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="autoCloseTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auto-close Time (hours) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={720}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                        field.onChange(isNaN(value) ? 0 : value);
                      }}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Time in hours before inactive tickets are closed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxOpenTickets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Open Tickets *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value === "" ? 1 : parseInt(e.target.value, 10);
                        field.onChange(isNaN(value) ? 1 : value);
                      }}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>Maximum tickets a user can have open</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="ticketCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ticket Category *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category for tickets" />
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
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
