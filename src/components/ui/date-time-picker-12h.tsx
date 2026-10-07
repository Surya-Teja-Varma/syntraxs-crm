import * as React from "react";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "./utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./select";
import { Label } from "./label";

interface DateTimePicker12hProps {
    value?: Date;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function DateTimePicker12h({
    value,
    onChange,
    placeholder = "Pick a date & time",
    disabled = false,
}: DateTimePicker12hProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
    const [hour, setHour] = React.useState<string>("12");
    const [minute, setMinute] = React.useState<string>("00");
    const [period, setPeriod] = React.useState<"AM" | "PM">("AM");

    // Initialize state from value prop when it changes
    React.useEffect(() => {
        if (value) {
            setSelectedDate(value);
            let h = value.getHours();
            const m = value.getMinutes();
            const p = h >= 12 ? "PM" : "AM";

            // Convert to 12-hour format
            h = h % 12;
            h = h ? h : 12; // the hour '0' should be '12'

            setHour(h.toString());
            setMinute(m.toString().padStart(2, "0"));
            setPeriod(p);
        } else {
            const now = new Date();
            let h = now.getHours();
            const m = now.getMinutes();
            const p = h >= 12 ? "PM" : "AM";

            h = h % 12;
            h = h ? h : 12;

            setSelectedDate(undefined);
            setHour(h.toString());
            setMinute(m.toString().padStart(2, "0")); // Keep exact minute or round? exact is fine, user can change.
            setPeriod(p);
        }
    }, [value]);

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) {
            onChange(undefined);
            return;
        }

        const newDate = new Date(date);
        updateTime(newDate, hour, minute, period);
    };

    const handleTimeChange = (
        newHour: string,
        newMinute: string,
        newPeriod: "AM" | "PM"
    ) => {
        setHour(newHour);
        setMinute(newMinute);
        setPeriod(newPeriod);

        if (selectedDate) {
            const newDate = new Date(selectedDate);
            updateTime(newDate, newHour, newMinute, newPeriod);
        }
    };

    const updateTime = (
        date: Date,
        h: string,
        m: string,
        p: "AM" | "PM"
    ) => {
        let hours = parseInt(h);
        const minutes = parseInt(m);

        // Convert back to 24-hour format
        if (p === "PM" && hours !== 12) {
            hours += 12;
        } else if (p === "AM" && hours === 12) {
            hours = 0;
        }

        date.setHours(hours);
        date.setMinutes(minutes);
        date.setSeconds(0);
        date.setMilliseconds(0);

        setSelectedDate(date);
        onChange(date);
    };

    // Generate hours 1-12
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
    // Generate minutes 00-55 with step 5
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0"));

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? (
                        format(value, "PP p") // e.g. "Apr 29, 2023 2:30 PM"
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                <div className="p-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-xs font-medium text-muted-foreground">Time</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={hour}
                            onValueChange={(v: string) => handleTimeChange(v, minute, period)}
                        >
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent>
                                {hours.map((h) => (
                                    <SelectItem key={h} value={h}>
                                        {h}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">:</span>
                        <Select
                            value={minute}
                            onValueChange={(v: string) => handleTimeChange(hour, v, period)}
                        >
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="Min" />
                            </SelectTrigger>
                            <SelectContent>
                                {minutes.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={period}
                            onValueChange={(v: "AM" | "PM") =>
                                handleTimeChange(hour, minute, v)
                            }
                        >
                            <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="AM/PM" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AM">AM</SelectItem>
                                <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
