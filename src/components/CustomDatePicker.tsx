import React, { useState, useRef, useEffect } from 'react';

interface CustomDatePickerProps {
    id?: string;
    value: string; // YYYY-MM-DD format
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    leftIcon?: string;
    iconColor?: string;
    iconBg?: string;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    id,
    value,
    onChange,
    placeholder = 'Month DD, YYYY',
    className = '',
    inputClassName,
    leftIcon,
    iconColor = 'text-blue-500',
    iconBg = 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [showMonthDropdown, setShowMonthDropdown] = useState(false);
    const [showYearDropdown, setShowYearDropdown] = useState(false);

    // Initial calendar view state based on current value or default (today / 1985 for birthdate)
    const initialDate = value ? new Date(value) : new Date(1995, 0, 1);
    const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowMonthDropdown(false);
                setShowYearDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Format display string e.g. "January 01, 2026"
    const formatDisplay = (val: string) => {
        if (!val) return '';
        const parts = val.split('-');
        if (parts.length !== 3) return val;
        const [y, m, d] = parts;
        const monthIdx = parseInt(m, 10) - 1;
        const monthName = MONTHS[monthIdx] || m;
        const dayStr = String(parseInt(d, 10)).padStart(2, '0');
        return `${monthName} ${dayStr}, ${y}`;
    };

    // Calculate days in month and starting weekday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

    // Year options (100 years back from current year)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

    // Helper functions for month navigation
    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(prev => prev - 1);
        } else {
            setViewMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(prev => prev + 1);
        } else {
            setViewMonth(prev => prev + 1);
        }
    };

    const handleSelectDay = (day: number) => {
        const monthStr = String(viewMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const formatted = `${viewYear}-${monthStr}-${dayStr}`;
        onChange(formatted);
        setIsOpen(false);
        setShowMonthDropdown(false);
        setShowYearDropdown(false);
    };

    // Selected values for rendering highlighted day
    let selectedYear: number | null = null;
    let selectedMonth: number | null = null;
    let selectedDay: number | null = null;

    if (value) {
        const parts = value.split('-');
        if (parts.length === 3) {
            selectedYear = parseInt(parts[0], 10);
            selectedMonth = parseInt(parts[1], 10) - 1;
            selectedDay = parseInt(parts[2], 10);
        }
    }

    return (
        <div ref={containerRef} className="relative inline-block w-full text-left font-sans">
            {/* Input Trigger */}
            <div className="relative flex items-center">
                {leftIcon && (
                    <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center size-7 rounded-lg ${iconBg} ${iconColor} pointer-events-none z-10 shadow-sm`}>
                        <span className="material-symbols-outlined text-base font-medium">{leftIcon}</span>
                    </div>
                )}
                <input
                    id={id || 'date-picker-input'}
                    name={id || 'datePickerInput'}
                    type="text"
                    readOnly
                    value={formatDisplay(value)}
                    placeholder={placeholder}
                    onClick={() => setIsOpen(!isOpen)}
                    className={inputClassName || (className ? `${className} cursor-pointer pr-10 ${leftIcon ? 'pl-11' : ''}` : `w-full cursor-pointer pr-10 ${leftIcon ? 'pl-11' : 'px-4'} py-3 text-sm font-medium bg-white dark:bg-white/5 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-slate-400 hover:border-primary/50`)}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/70 hover:text-primary transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">calendar_today</span>
                </button>
            </div>

            {/* Calendar Popover */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-2xl w-80 animate-fade-in text-slate-800 dark:text-slate-100">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between gap-1.5 mb-4">
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            className="size-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>

                        <div className="flex items-center gap-2">
                            {/* Month Select */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }}
                                    className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white hover:border-primary/50 transition-all shadow-sm"
                                >
                                    <span>{MONTHS[viewMonth]}</span>
                                    <span className={`material-symbols-outlined text-primary text-sm transition-transform duration-200 ${showMonthDropdown ? 'rotate-180' : ''}`}>
                                        keyboard_arrow_down
                                    </span>
                                </button>
                                {showMonthDropdown && (
                                    <div className="absolute top-full left-0 mt-2 w-44 max-h-56 overflow-y-auto bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] p-1.5 animate-modal-pop backdrop-blur-xl custom-scrollbar">
                                        {MONTHS.map((m, idx) => {
                                            const isSelected = idx === viewMonth;
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => { setViewMonth(idx); setShowMonthDropdown(false); }}
                                                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs rounded-xl font-medium transition-all ${isSelected ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                >
                                                    <span>{m}</span>
                                                    {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Year Select */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }}
                                    className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white hover:border-primary/50 transition-all shadow-sm"
                                >
                                    <span>{viewYear}</span>
                                    <span className={`material-symbols-outlined text-primary text-sm transition-transform duration-200 ${showYearDropdown ? 'rotate-180' : ''}`}>
                                        keyboard_arrow_down
                                    </span>
                                </button>
                                {showYearDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-32 max-h-56 overflow-y-auto bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[70] p-1.5 animate-modal-pop backdrop-blur-xl custom-scrollbar">
                                        {years.map(y => {
                                            const isSelected = y === viewYear;
                                            return (
                                                <button
                                                    key={y}
                                                    type="button"
                                                    onClick={() => { setViewYear(y); setShowYearDropdown(false); }}
                                                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs rounded-xl font-medium transition-all ${isSelected ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                                                >
                                                    <span>{y}</span>
                                                    {isSelected && <span className="material-symbols-outlined text-white text-sm">check</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            className="size-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>

                    {/* Month Year Title Heading */}
                    <div className="mb-4 px-1">
                        <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                            {MONTHS[viewMonth]} {viewYear}
                        </h4>
                    </div>

                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {DAYS_OF_WEEK.map(d => (
                            <span key={d} className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                                {d}
                            </span>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {/* Empty padding slots before first day */}
                        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="size-9" />
                        ))}

                        {/* Month Days */}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const day = idx + 1;
                            const isSelected =
                                selectedYear === viewYear &&
                                selectedMonth === viewMonth &&
                                selectedDay === day;

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => handleSelectDay(day)}
                                    className={`size-9 rounded-2xl text-sm font-semibold flex items-center justify-center transition-all ${
                                        isSelected
                                            ? 'bg-primary text-white font-bold shadow-md shadow-primary/30 scale-105'
                                            : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200'
                                    }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
