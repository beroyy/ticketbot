"use client";

import { forwardRef, useMemo, useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { cn } from "@/lib/utils";
import { useForwardedRef } from "@/hooks/use-forwarded-ref";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ disabled, value, onChange, onBlur, placeholder = "#FFFFFF", className }, forwardedRef) => {
    const ref = useForwardedRef(forwardedRef);
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || "");

    const parsedValue = useMemo(() => {
      return value || "#FFFFFF";
    }, [value]);

    useEffect(() => {
      setInputValue(value || "");
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Only update if it's a valid hex color
      if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
        onChange(newValue);
      }
    };

    const handleColorChange = (color: string) => {
      onChange(color);
      setInputValue(color);
    };

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild disabled={disabled}>
          <div
            className={cn(
              "flex items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20",
              disabled && "cursor-not-allowed opacity-50",
              className
            )}
          >
            <div className="flex items-center justify-center border-r border-gray-200 p-2">
              <button
                className="size-6 flex-shrink-0 rounded focus:outline-none"
                style={{
                  backgroundColor: parsedValue,
                }}
                onClick={() => {
                  setOpen(true);
                }}
                type="button"
                disabled={disabled}
              />
            </div>
            <span className="select-none pl-4 pr-3 text-gray-700">#</span>
            <input
              ref={ref}
              value={inputValue.replace("#", "")}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9A-Fa-f]/g, "");
                const newValue = value ? `#${value}` : "";
                setInputValue(newValue);
                if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
                  onChange(newValue);
                }
              }}
              onBlur={onBlur}
              placeholder={placeholder.replace("#", "")}
              className="flex-1 border-none bg-transparent py-2.5 text-sm caret-gray-400 outline-none"
              maxLength={6}
              disabled={disabled}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="space-y-3">
            <HexColorPicker color={parsedValue} onChange={handleColorChange} />

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Hex:</span>
              <Input
                value={inputValue}
                onChange={handleInputChange}
                className="text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

ColorPicker.displayName = "ColorPicker";

export { ColorPicker };
