import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { ScrollArea } from "./scroll-area";
import { cn } from "./utils";

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
  maxDisplay?: number;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Выберите...",
  className,
  maxDisplay = 2,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleClear = () => {
    onChange([]);
  };

  const displayText = React.useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === options.length) return "Все";
    if (selected.length <= maxDisplay) {
      return selected
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .join(", ");
    }
    return `${selected.length} выбрано`;
  }, [selected, options, placeholder, maxDisplay]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between font-normal min-w-[140px] h-9 text-sm",
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex items-center justify-between p-2 border-b">
          <button
            onClick={handleSelectAll}
            className="text-xs text-cyan-600 hover:underline"
          >
            Выбрать всё
          </button>
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-red-500"
          >
            Очистить
          </button>
        </div>
        <ScrollArea className="h-[280px]">
          <div className="p-2 space-y-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => handleSelect(option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="p-2 border-t bg-slate-50 text-xs text-slate-500">
            Выбрано: {selected.length} из {options.length}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
