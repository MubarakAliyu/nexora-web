"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "flowbite-react-icons/outline";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/** react-day-picker themed to the Nexora palette + Flowbite chevrons. */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "relative flex h-9 items-center justify-center pt-1",
        caption_label: "font-heading text-sm font-medium text-foreground",
        nav: "absolute inset-x-0 top-1 flex items-center justify-between px-1",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7"),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-caption font-normal text-muted",
        week: "mt-1 flex w-full",
        day: "relative p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "h-9 w-9 rounded-md p-0 font-normal aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-accent aria-selected:hover:text-accent-foreground",
        ),
        today: "font-semibold text-primary",
        outside: "text-muted opacity-50",
        disabled: "opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft size={16} {...rest} />
          ) : (
            <ChevronRight size={16} {...rest} />
          ),
      }}
      {...props}
    />
  );
}
