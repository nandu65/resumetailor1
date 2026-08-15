import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Type, Plus, Minus, X, Paintbrush, Copy } from 'lucide-react';
import { Button } from './ui/button';

interface FormattingToolbarProps {
  onFormat: (command: string, value?: string) => void;
  onClose: () => void;
  onCopyFormat?: () => void;
  onPasteFormat?: () => void;
  copiedFormatLabel?: string | null;
}

export const FormattingToolbar = ({ onFormat, onClose, onCopyFormat, onPasteFormat, copiedFormatLabel }: FormattingToolbarProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        onClose();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate position (centered above selection)
      const top = rect.top + window.scrollY - 50;
      const left = rect.left + window.scrollX + rect.width / 2;

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [onClose]);

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[9999] flex items-center gap-1 p-1 bg-background border shadow-xl rounded-lg animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Bold" onClick={() => onFormat('bold')}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Italic" onClick={() => onFormat('italic')}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Underline" onClick={() => onFormat('underline')}>
        <Underline className="h-4 w-4" />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Increase font size" onClick={() => onFormat('fontSize', 'increase')}>
        <Plus className="h-4 w-4" />
      </Button>
      <div className="flex items-center px-1">
        <Type className="h-3 w-3 text-muted-foreground" />
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Decrease font size" onClick={() => onFormat('fontSize', 'decrease')}>
        <Minus className="h-4 w-4" />
      </Button>
      {(onCopyFormat || onPasteFormat) && <div className="w-px h-4 bg-border mx-1" />}
      {onCopyFormat && (
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy formatting" onClick={onCopyFormat}>
          <Copy className="h-4 w-4" />
        </Button>
      )}
      {onPasteFormat && (
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${copiedFormatLabel ? 'text-primary' : 'text-muted-foreground'}`}
          title={copiedFormatLabel ? `Paste formatting (${copiedFormatLabel})` : 'Copy a format first'}
          disabled={!copiedFormatLabel}
          onClick={onPasteFormat}
        >
          <Paintbrush className="h-4 w-4" />
        </Button>
      )}
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title="Close"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
