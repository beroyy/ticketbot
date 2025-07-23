import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { TextField, TextAreaField, SelectField, SwitchField } from "@/components/forms/form-fields";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import type { PanelFormData } from "../../../schemas/panel-form-schema";

interface ContentStepProps {
  form: UseFormReturn<PanelFormData>;
}

export function ContentStep({ form }: ContentStepProps) {
  const questions = form.watch("questions");
  const textSections = form.watch("textSections") || [];

  const addQuestion = () => {
    const currentQuestions = form.getValues("questions");
    form.setValue("questions", [
      ...currentQuestions,
      {
        id: Date.now().toString(),
        type: "short_answer",
        label: "New question",
        placeholder: "",
        enabled: true,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    const currentQuestions = form.getValues("questions");
    form.setValue(
      "questions",
      currentQuestions.filter((_, i) => i !== index)
    );
  };

  const addTextSection = () => {
    const currentSections = form.getValues("textSections") || [];
    form.setValue("textSections", [
      ...currentSections,
      {
        id: Date.now().toString(),
        name: "",
        value: "",
      },
    ]);
  };

  const removeTextSection = (index: number) => {
    const currentSections = form.getValues("textSections") || [];
    form.setValue(
      "textSections",
      currentSections.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6">
      {/* Questions Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Questions</h3>
            <p className="text-muted-foreground text-sm">
              Questions users must answer when creating a ticket
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="text-muted-foreground h-4 w-4" />
                    <CardTitle className="text-base">Question {index + 1}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`questions.${index}.enabled`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormLabel className="text-sm">Enabled</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <SelectField
                  name={`questions.${index}.type`}
                  label="Type"
                  options={[
                    { label: "Short Text", value: "short_answer" },
                    { label: "Paragraph", value: "paragraph" },
                  ]}
                />
                <TextField
                  name={`questions.${index}.label`}
                  label="Question"
                  placeholder="What is your issue?"
                  required
                />
                <TextField
                  name={`questions.${index}.placeholder`}
                  label="Placeholder"
                  placeholder="Enter placeholder text..."
                />
                {question.type === "paragraph" && (
                  <TextField
                    name={`questions.${index}.characterLimit`}
                    label="Character Limit"
                    type="number"
                    placeholder="500"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Text Sections */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Text Sections</h3>
            <p className="text-muted-foreground text-sm">
              Additional information displayed on the panel
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addTextSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>

        <div className="space-y-4">
          {textSections.map((section, index) => (
            <Card key={section.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Section {index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTextSection(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <TextField
                  name={`textSections.${index}.name`}
                  label="Section Title"
                  placeholder="Important Information"
                  required
                />
                <TextAreaField
                  name={`textSections.${index}.value`}
                  label="Content"
                  placeholder="Enter section content..."
                  rows={3}
                  required
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Image URLs */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Images</h3>
        <TextField
          name="largeImageUrl"
          label="Large Image URL"
          placeholder="https://example.com/image.png"
          type="url"
        />
        <TextField
          name="smallImageUrl"
          label="Thumbnail URL"
          placeholder="https://example.com/thumbnail.png"
          type="url"
        />
      </div>
    </div>
  );
}
