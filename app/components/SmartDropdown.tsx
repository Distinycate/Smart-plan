'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  value: string;
  selected?: boolean;
}

interface SmartDropdownProps {
  options: Option[];
  placeholder?: string;
  onSelect: (option: Option) => void;
  emptyText?: string;
}

export default function SmartDropdown({ 
  options, 
  placeholder = "ค้นหาจากคลัง...", 
  onSelect,
  emptyText = "ไม่พบตัวเลือก"
}: SmartDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter options based on search text
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) || 
    opt.value.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!options || options.length === 0) return null;

  return (
    <div className="sd-wrap" ref={wrapperRef} style={{ marginTop: '8px', marginBottom: '14px' }}>
      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          style={{ width: '100%', paddingLeft: '34px', fontSize: '13.5px', padding: '10px 14px 10px 34px', borderRadius: 'var(--r-md)', border: '1.5px solid var(--c-gray-200)' }}
        />
        <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {isOpen && (
        <div className="sd-panel">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div 
                key={opt.id} 
                className={`sd-option ${opt.selected ? 'hl' : ''}`}
                onClick={() => {
                  onSelect(opt);
                  setSearch('');
                  setIsOpen(false);
                }}
              >
                {opt.selected && <span style={{ marginRight: '6px' }}>✓</span>}
                <strong style={{ color: 'var(--c-primary)', marginRight: '6px' }}>{opt.label}</strong>
                {opt.value && <span style={{ fontSize: '12.5px', color: 'var(--c-gray-500)' }}>{opt.value}</span>}
              </div>
            ))
          ) : (
            <div className="sd-empty">{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}
