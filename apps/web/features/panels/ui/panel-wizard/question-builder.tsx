import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, User, MessageSquare, Info, Trash2 } from "lucide-react";
import type { Question } from "../../types";

interface QuestionBuilderProps {
  questions: Question[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Question>) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

export default function QuestionBuilder({
  questions,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
}: QuestionBuilderProps) {
  const [questionsEnabled, setQuestionsEnabled] = useState(true);

  return (
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
              setQuestionsEnabled(!questionsEnabled);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              questionsEnabled ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                questionsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {questionsEnabled && (
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
                      onToggle(question.id);
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      question.enabled ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                        question.enabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(question.id);
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
                    onUpdate(question.id, { placeholder: e.target.value });
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
            onClick={onAdd}
            className="w-full rounded-lg border-blue-200 bg-blue-50 py-3 text-blue-600 hover:bg-blue-100"
          >
            <Plus className="mr-2 size-4" />
            Add new Questions
          </Button>
        </div>
      )}
    </div>
  );
}
