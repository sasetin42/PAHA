import React, { useState, useRef, useEffect } from 'react';

export interface SelectOption {
    value: string;
    label: string;
    icon?: string;
    iconColor?: string;
    iconBg?: string;
    badge?: string;
    description?: string;
}

export interface CustomSelectProps {
    id: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    id,
    value,
    onChange,
    options,
    placeholder = 'Select option...',
    label,
    disabled = false,
    required = false,
    className = '',
    size = 'md'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Outside click handler to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen && focusedIndex >= 0 && focusedIndex < options.length) {
                onChange(options[focusedIndex].value);
                setIsOpen(false);
            } else {
                setIsOpen(!isOpen);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
                setFocusedIndex(0);
            } else {
                setFocusedIndex(prev => (prev < options.length - 1 ? prev + 1 : 0));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
                setFocusedIndex(options.length - 1);
            } else {
                setFocusedIndex(prev => (prev > 0 ? prev - 1 : options.length - 1));
            }
        }
    };

    const sizeClasses = {
        sm: 'h-9 px-3 text-xs rounded-xl',
        md: 'h-11 px-4 text-sm rounded-xl',
        lg: 'h-12 px-5 text-base rounded-2xl'
    };

    return (
        <div ref={containerRef} className={`relative w-full text-left ${className}`}>
            {label && (
                <label 
                    htmlFor={id} 
                    className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
                >
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <button
                id={id}
                name={id}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`w-full flex items-center justify-between gap-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium transition-all shadow-sm hover:border-primary focus:border-primary focus:ring-4 focus:ring-primary/15 ${sizeClasses[size]} ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : 'cursor-pointer hover:shadow-md'}`}
            >
                <div className="flex items-center gap-2.5 truncate">
                    {selectedOption?.icon && (
                        <div className={`flex items-center justify-center size-6 rounded-md shrink-0 ${selectedOption.iconBg || 'bg-primary/10'} ${selectedOption.iconColor || 'text-primary'}`}>
                            <span className="material-symbols-outlined text-base">
                                {selectedOption.icon}
                            </span>
                        </div>
                    )}
                    <span className={`truncate ${!selectedOption ? 'text-slate-400 dark:text-slate-500 font-normal' : 'font-semibold'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {selectedOption?.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider">
                            {selectedOption.badge}
                        </span>
                    )}
                    <span className={`material-symbols-outlined text-primary text-xl transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                    </span>
                </div>
            </button>

            {isOpen && (
                <div 
                    role="listbox" 
                    className="absolute z-[150] left-0 right-0 mt-2 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-modal-pop backdrop-blur-xl max-h-60 overflow-y-auto custom-scrollbar p-1.5"
                >
                    {options.map((option, idx) => {
                        const isSelected = option.value === value;
                        const isFocused = idx === focusedIndex;
                        return (
                            <div
                                key={option.value || idx}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setFocusedIndex(idx)}
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                                    isSelected 
                                        ? 'bg-primary text-white font-bold shadow-md shadow-primary/20' 
                                        : isFocused 
                                            ? 'bg-primary/10 text-primary font-semibold' 
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 truncate">
                                    {option.icon && (
                                        <div className={`flex items-center justify-center size-6 rounded-md shrink-0 ${isSelected ? 'bg-white/20 text-white' : (option.iconBg || 'bg-primary/10') + ' ' + (option.iconColor || 'text-primary')}`}>
                                            <span className="material-symbols-outlined text-base">
                                                {option.icon}
                                            </span>
                                        </div>
                                    )}
                                    <div className="truncate">
                                        <div className="truncate text-xs md:text-sm">{option.label}</div>
                                        {option.description && (
                                            <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isSelected && (
                                    <span className="material-symbols-outlined text-white text-base shrink-0 ml-2">
                                        check_circle
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
