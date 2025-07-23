"use client";

import * as React from "react";
import { Check, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(selected.filter((v) => v !== value));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto min-h-[44px] w-full justify-between rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm font-normal",
            className
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap items-center gap-1 text-left">
            {selected.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              selected.map((value) => {
                const option = options.find((opt) => opt.value === value);
                return (
                  <span
                    key={value}
                    className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {option?.label}
                    <div
                      onClick={(e) => {
                        handleRemove(value, e);
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      className="cursor-pointer rounded p-0.5 hover:bg-blue-200/60"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleRemove(value, e);
                        }
                      }}
                    >
                      <X className="size-3" strokeWidth={2} />
                    </div>
                  </span>
                );
              })
            )}
          </div>
          <ChevronDown className="size-4 flex-shrink-0 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[300px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => {
              handleSelect(option.value);
            }}
          >
            <div className="flex w-full items-center justify-between">
              <span>{option.label}</span>
              {selected.includes(option.value) && <Check className="size-4 text-blue-600" />}
            </div>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
