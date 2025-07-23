"use client";

import { forwardRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, EmojiPickerContent, EmojiPickerSearch } from "@/components/ui/emoji-picker";
import { cn } from "@/lib/utils";

interface EmojiInputProps {
  value?: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const EmojiInput = forwardRef<HTMLButtonElement, EmojiInputProps>(
  ({ value, onChange, placeholder = "Select an emoji...", disabled, className }, ref) => {
    const [open, setOpen] = useState(false);

    return (
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            className={cn(
              "focus:ring-ring/20 focus:border-ring/50 flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
          >
            <span className={cn(!value && "text-muted-foreground")}>{value || placeholder}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="h-[400px] w-[320px] overflow-hidden p-0"
          align="start"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <EmojiPicker
            onEmojiSelect={(data: { emoji: string }) => {
              onChange(data.emoji);
              setOpen(false);
            }}
            className="flex h-full flex-col"
          >
            <EmojiPickerSearch placeholder="Search emoji..." />
            <EmojiPickerContent className="overflow-y-auto" />
          </EmojiPicker>
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiInput.displayName = "EmojiInput";

export { EmojiInput };
