import { type ReactNode, useEffect } from "react";
import { type UseFormReturn, useForm, type FieldValues, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { useFormDraft, useFormActions } from "@/shared/stores/app-store";
import { toast } from "sonner";
import { formatZodError } from "@/lib/zod-config";

interface FormWrapperProps<TFieldValues extends FieldValues = FieldValues> {
  schema: z.ZodSchema<TFieldValues>;
  defaultValues?: DefaultValues<TFieldValues>;
  onSubmit: (data: TFieldValues) => Promise<void>;
  formId?: string; // For draft persistence
  children: (form: UseFormReturn<TFieldValues>) => ReactNode;
  className?: string;
  onValidationError?: (errors: any) => void; // Optional error handler
}

/**
 * Helper function to extract metadata from a Zod schema
 * @param schema - The Zod schema to extract metadata from
 * @param fieldName - The field name to get metadata for
 * @returns The metadata object or undefined
 */
export function getSchemaMetadata(schema: z.ZodSchema<any>, fieldName: string): any {
  try {
    // Try to get the shape if it's an object schema
    const schemaAsAny = schema as any;
    if (schemaAsAny.shape && typeof schemaAsAny.shape === "object" && fieldName in schemaAsAny.shape) {
      const fieldSchema = schemaAsAny.shape[fieldName];
      return fieldSchema?.meta?.();
    }
  } catch {
    // Silently fail if we can't extract metadata
  }
  return undefined;
}

/**
 * FormWrapper component that integrates React Hook Form with Zod validation
 * and optional draft persistence via the app store.
 *
 * @example
 * ```tsx
 * const schema = z.object({
 *   title: z.string().min(1, "Title is required"),
 *   description: z.string().optional(),
 * });
 *
 * <FormWrapper
 *   schema={schema}
 *   formId="my-form"
 *   onSubmit={async (data) => {
 *     await createMutation.mutateAsync(data);
 *   }}
 * >
 *   {(form) => (
 *     <>
 *       <TextField name="title" label="Title" />
 *       <TextAreaField name="description" label="Description" />
 *       <Button type="submit" disabled={form.formState.isSubmitting}>
 *         {form.formState.isSubmitting ? "Saving..." : "Save"}
 *       </Button>
 *     </>
 *   )}
 * </FormWrapper>
 * ```
 */
export function FormWrapper<TFieldValues extends FieldValues = FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  formId,
  children,
  className = "",
  onValidationError,
}: FormWrapperProps<TFieldValues>) {
  // Get draft data if formId is provided
  const draft = formId ? useFormDraft(formId) : undefined;
  const { updateDraft, clearDraft } = useFormActions();

  // Initialize form with draft data or default values
  const form = useForm<TFieldValues>({
    resolver: zodResolver(schema as any),
    defaultValues: (draft || defaultValues || {}) as DefaultValues<TFieldValues>,
    mode: "onChange", // Validate on change for better UX
  });

  // Auto-save drafts when form values change
  useEffect(() => {
    if (!formId) return;

    const subscription = form.watch((data) => {
      updateDraft(formId, data);
    });

    return () => subscription.unsubscribe();
  }, [form, formId, updateDraft]);

  // Handle form submission
  const handleSubmit = form.handleSubmit(
    async (data) => {
      try {
        await onSubmit(data);

        // Clear draft on successful submission
        if (formId) {
          clearDraft(formId);
        }

        // Reset form to default values
        form.reset(defaultValues);
      } catch (error) {
        // Handle Zod validation errors specially
        if (error instanceof z.ZodError) {
          const formattedError = formatZodError(error);
          toast.error("Validation Error", {
            description: formattedError,
          });
        }
        // Other form submission errors are handled by mutations
        // which show notifications via the global error handler
        console.error("Form submission error:", error);
      }
    },
    (errors) => {
      // Log validation errors for debugging
      console.error("Form validation errors:", errors);
      
      // Call custom error handler if provided
      if (onValidationError) {
        onValidationError(errors);
      } else {
        // Show first error in toast
        const firstError = Object.values(errors)[0];
        if (firstError && "message" in firstError) {
          toast.error("Validation Error", {
            description: firstError.message as string,
          });
        }
      }
    }
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className={className}>
        {children(form)}
      </form>
    </Form>
  );
}
