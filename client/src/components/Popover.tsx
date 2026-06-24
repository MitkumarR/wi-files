import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PopoverProps {
  /** The trigger element (button) */
  trigger: React.ReactNode;
  /** Popover content */
  children: React.ReactNode;
  /** Alignment relative to trigger: 'start' | 'end' (default: 'end') */
  align?: 'start' | 'end';
  /** Optional extra className on the popover panel */
  className?: string;
}

/**
 * GNOME-style Popover component.
 * Renders a trigger button that toggles a floating panel below it,
 * with a small arrow/caret pointing at the trigger — just like
 * GTK4 GtkPopover used in Nautilus / GNOME Files.
 *
 * Closes on outside click or Escape key.
 */
export default function Popover({ trigger, children, align = 'end', className = '' }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    // Use setTimeout so the current click event doesn't immediately close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  return (
    <div className="popover-container" ref={containerRef}>
      {/* Trigger — clone the trigger element and attach onClick */}
      <div className="popover-trigger" onClick={() => setOpen(v => !v)}>
        {trigger}
      </div>

      {/* Panel */}
      {open && (
        <div className={`popover-panel popover-align-${align} ${className}`}>
          <div className="popover-arrow" />
          <div className="popover-body">
            {typeof children === 'function' ? (children as (close: () => void) => React.ReactNode)(close) : children}
          </div>
        </div>
      )}
    </div>
  );
}
