import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { startOfISOWeek, addWeeks, format, getISOWeek, getISOWeekYear } from "date-fns";
import { nb } from "date-fns/locale";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface WeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  maxDate?: Date;
  showFastButtons?: boolean;
}

export const WeekSelector = ({ selectedDate, onDateChange, maxDate, showFastButtons = false }: WeekSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const weekStart = startOfISOWeek(selectedDate);
  const weekEnd = addWeeks(weekStart, 1);
  const weekNumber = getISOWeek(selectedDate);
  const year = getISOWeekYear(selectedDate);

  const handlePreviousWeek = () => {
    onDateChange(addWeeks(selectedDate, -1));
  };

  const handleNextWeek = () => {
    const nextWeek = addWeeks(selectedDate, 1);
    if (!maxDate || nextWeek <= maxDate) {
      onDateChange(nextWeek);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateChange(date);
      setIsOpen(false);
    }
  };

  const isCurrentWeek = getISOWeek(new Date()) === weekNumber && getISOWeekYear(new Date()) === year;
  const canGoNext = !maxDate || addWeeks(selectedDate, 1) <= maxDate;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousWeek}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[200px] justify-start text-left font-normal",
              isCurrentWeek && "border-primary"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                Uke {weekNumber}, {year}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(weekStart, "d. MMM", { locale: nb })} - {format(addWeeks(weekStart, 1), "d. MMM", { locale: nb })}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            defaultMonth={selectedDate}
            ISOWeek
            showWeekNumber
            disabled={maxDate ? (date) => date > maxDate : undefined}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextWeek}
        disabled={!canGoNext}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
