import React, { useState, useEffect, useRef } from 'react';

interface CalendarPickerProps {
    id: string;
    label?: string;
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    minYear?: number;
    maxYear?: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
    id,
    label,
    value,
    onChange,
    required = false,
    disabled = false,
    placeholder = 'mm/dd/yyyy',
    minYear = 1930,
    maxYear = new Date().getFullYear() + 5
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [isMonthOpen, setIsMonthOpen] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const monthDropdownRef = useRef<HTMLDivElement>(null);
    const yearDropdownRef = useRef<HTMLDivElement>(null);

    // Sync current view with value when opened or when value changes
    useEffect(() => {
        if (value) {
            const parts = value.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1; // 0-indexed
                if (!isNaN(y) && !isNaN(m)) {
                    setCurrentYear(y);
                    setCurrentMonth(m);
                }
            }
        } else {
            const today = new Date();
            setCurrentYear(today.getFullYear());
            setCurrentMonth(today.getMonth());
        }
    }, [value, isOpen]);

    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsMonthOpen(false);
                setIsYearOpen(false);
            }
            if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
                setIsMonthOpen(false);
            }
            if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
                setIsYearOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Generate years array based on minYear and maxYear
    const YEARS = Array.from(
        { length: maxYear - minYear + 1 },
        (_, i) => maxYear - i
    );

    // Format selected date for display
    const getFormattedDisplay = () => {
        if (!value) return placeholder;
        const parts = value.split('-');
        if (parts.length === 3) {
            return `${parts[1]}/${parts[2]}/${parts[0]}`; // mm/dd/yyyy
        }
        return value;
    };

    const handleDayClick = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    // Styling classes matching PaymentPage
    const labelCls = 'block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-white/40 mb-2';
    const inputCls = 'w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-slate-400';

    return (
        <div className="relative w-full" ref={containerRef}>
            {label && (
                <label htmlFor={id} className={labelCls}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            
            <button
                id={id}
                type="button"
                disabled={disabled}
                className={`${inputCls} h-[46px] flex items-center justify-between cursor-pointer text-left transition-all ${
                    disabled ? 'bg-slate-50 dark:bg-white/[0.03] text-slate-400 cursor-not-allowed' : ''
                } ${
                    !value ? 'text-slate-400 font-normal' : 'text-slate-800 font-semibold dark:text-white'
                } ${label ? 'mt-1.5' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs border ${
                        value ? 'bg-primary/5 text-primary border-primary/20' : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-white/5 dark:border-white/10'
                    }`}>
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    </span>
                    <span>{getFormattedDisplay()}</span>
                </div>
                <span className={`material-symbols-outlined transition-transform duration-300 text-slate-400 ${isOpen ? 'text-primary' : ''}`}>
                    calendar_month
                </span>
            </button>

            {/* Calendar Overlay */}
            {isOpen && (
                <div className="absolute left-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] p-4 w-72 transition-all duration-300 origin-top opacity-100 translate-y-0 scale-100">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button 
                            type="button" 
                            onClick={() => {
                                if (currentMonth === 0) {
                                    setCurrentMonth(11);
                                    setCurrentYear(y => Math.max(minYear, y - 1));
                                } else {
                                    setCurrentMonth(m => m - 1);
                                }
                            }}
                            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
                        </button>

                        <div className="flex gap-2">
                            {/* Month Selector */}
                            <div className="relative" ref={monthDropdownRef}>
                                <button
                                    type="button"
                                    className="w-28 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200/60 dark:border-slate-600 rounded-xl flex items-center justify-between transition-all select-none cursor-pointer"
                                    onClick={() => {
                                        setIsMonthOpen(!isMonthOpen);
                                        setIsYearOpen(false);
                                    }}
                                >
                                    <span>{MONTHS[currentMonth]}</span>
                                    <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${isMonthOpen ? 'rotate-180 text-primary' : ''}`}>
                                        keyboard_arrow_down
                                    </span>
                                </button>
                                
                                {isMonthOpen && (
                                    <div className="absolute left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl z-[10005] max-h-48 overflow-y-auto w-full transition-all duration-200 origin-top opacity-100 translate-y-0 scale-100">
                                        <ul className="py-1 text-xs">
                                            {MONTHS.map((m, idx) => (
                                                <li key={m}>
                                                    <button
                                                        type="button"
                                                        className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between ${
                                                            currentMonth === idx 
                                                                ? 'bg-primary/5 text-primary font-bold' 
                                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                                        }`}
                                                        onClick={() => {
                                                            setCurrentMonth(idx);
                                                            setIsMonthOpen(false);
                                                        }}
                                                    >
                                                        <span>{m}</span>
                                                        {currentMonth === idx && (
                                                            <span className="material-symbols-outlined text-primary text-xs font-bold">check</span>
                                                        )}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Year Selector */}
                            <div className="relative" ref={yearDropdownRef}>
                                <button
                                    type="button"
                                    className="w-24 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200/60 dark:border-slate-600 rounded-xl flex items-center justify-between transition-all select-none cursor-pointer"
                                    onClick={() => {
                                        setIsYearOpen(!isYearOpen);
                                        setIsMonthOpen(false);
                                    }}
                                >
                                    <span>{currentYear}</span>
                                    <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${isYearOpen ? 'rotate-180 text-primary' : ''}`}>
                                        keyboard_arrow_down
                                    </span>
                                </button>
                                
                                {isYearOpen && (
                                    <div className="absolute left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl z-[10005] max-h-48 overflow-y-auto w-full transition-all duration-200 origin-top opacity-100 translate-y-0 scale-100">
                                        <ul className="py-1 text-xs">
                                            {YEARS.map((y) => (
                                                <li key={y}>
                                                    <button
                                                        type="button"
                                                        className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between ${
                                                            currentYear === y 
                                                                ? 'bg-primary/5 text-primary font-bold' 
                                                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                                                        }`}
                                                        onClick={() => {
                                                            setCurrentYear(y);
                                                            setIsYearOpen(false);
                                                        }}
                                                    >
                                                        <span>{y}</span>
                                                        {currentYear === y && (
                                                            <span className="material-symbols-outlined text-primary text-xs font-bold">check</span>
                                                        )}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            type="button" 
                            onClick={() => {
                                if (currentMonth === 11) {
                                    setCurrentMonth(0);
                                    setCurrentYear(y => Math.min(maxYear, y + 1));
                                } else {
                                    setCurrentMonth(m => m + 1);
                                }
                            }}
                            className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
                        </button>
                    </div>

                    <div className="text-sm font-extrabold text-slate-800 dark:text-white mb-3 px-1">
                        {MONTHS[currentMonth]} {currentYear}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-2">
                        {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => (
                            <div key={d} className="py-1">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {(() => {
                            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                            const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                            const cells = [];
                            
                            for (let i = 0; i < firstDay; i++) {
                                cells.push(<div key={`empty-${i}`} />);
                            }
                            
                            for (let day = 1; day <= daysInMonth; day++) {
                                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = value === dateStr;
                                
                                cells.push(
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => handleDayClick(day)}
                                        className={`py-1.5 rounded-lg font-semibold transition-all ${
                                            isSelected 
                                                ? 'bg-primary text-white font-bold' 
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                );
                            }
                            return cells;
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPicker;
