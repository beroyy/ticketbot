import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { TextField, TextAreaField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { PanelFormData } from "../../../schemas/panel-form-schema";

interface WelcomeStepProps {
  form: UseFormReturn<PanelFormData>;
}

export function WelcomeStep({ form }: WelcomeStepProps) {
  const welcomeFields = form.watch("welcomeMessage.fields") || [];

  const addField = () => {
    const currentFields = form.getValues("welcomeMessage.fields") || [];
    form.setValue("welcomeMessage.fields", [...currentFields, { name: "", value: "" }]);
  };

  const removeField = (index: number) => {
    const currentFields = form.getValues("welcomeMessage.fields") || [];
    form.setValue(
      "welcomeMessage.fields",
      currentFields.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium">Welcome Message</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Configure the message sent when a user creates a ticket
        </p>

        <div className="space-y-4">
          <TextField
            name="welcomeMessage.title"
            label="Welcome Title"
            placeholder="Welcome to Support"
            description="Title shown in the ticket channel"
          />

          <TextAreaField
            name="welcomeMessage.content"
            label="Welcome Message"
            placeholder="Thank you for creating a ticket. Our team will respond shortly..."
            description="Message sent when the ticket is created"
            rows={4}
          />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Custom Fields</h3>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </div>

        {welcomeFields.length > 0 ? (
          <div className="space-y-4">
            {welcomeFields.map((field, index) => (
              <Card key={index}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Field {index + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeField(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TextField
                    name={`welcomeMessage.fields.${index}.name`}
                    label="Field Name"
                    placeholder="Status"
                  />
                  <TextField
                    name={`welcomeMessage.fields.${index}.value`}
                    label="Field Value"
                    placeholder="Open"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No custom fields added. Click "Add Field" to create one.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium">Ticket Introduction</h3>
        <div className="space-y-4">
          <TextField
            name="introTitle"
            label="Introduction Title"
            placeholder="How can we help?"
            description="Title shown at the start of the ticket"
          />

          <TextAreaField
            name="introDescription"
            label="Introduction Description"
            placeholder="Please describe your issue in detail..."
            description="Message shown before the questions"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
