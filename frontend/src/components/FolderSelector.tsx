import React, { useState } from 'react';

interface FolderSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helpText?: string;
  allowDefault?: boolean;
  onSetDefault?: () => void;
}

export default function FolderSelector({
  value,
  onChange,
  placeholder = "Enter folder path",
  label = "Folder Path",
  helpText,
  allowDefault = false,
  onSetDefault
}: FolderSelectorProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // Try to get the folder path from the dropped item
    const items = Array.from(e.dataTransfer.items);
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          // This won't work due to browser security, but we can show a message
          alert('Due to browser security restrictions, you cannot drag and drop folders directly. Please copy the folder path and paste it manually.');
          return;
        }
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.includes('\\') || pastedText.includes('/')) {
      // Likely a file path, use it
      onChange(pastedText.trim());
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      
      <div className="flex gap-2">
        <div 
          className={`flex-1 border-2 border-dashed rounded-md px-3 py-2 transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            className="w-full border-none outline-none bg-transparent"
            placeholder={placeholder}
          />
        </div>
        
        <button
          type="button"
          onClick={() => {
            // Show instructions for folder selection
            const instructions = `To select a folder:
            
1. Open File Explorer (Windows) or Finder (Mac)
2. Navigate to your desired folder
3. Click in the address bar to select the full path
4. Copy the path (Ctrl+C)
5. Paste it here (Ctrl+V)

Example: C:\\Users\\YourName\\Documents\\JobFiles`;
            
            alert(instructions);
          }}
          className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-sm whitespace-nowrap"
          title="Click for folder selection instructions"
        >
          📁 Browse
        </button>
        
        {allowDefault && onSetDefault && (
          <button
            type="button"
            onClick={onSetDefault}
            className="px-3 py-2 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 text-sm text-blue-700 whitespace-nowrap"
            title="Use default Downloads/JobDescriptionDownloads folder"
          >
            🔄 Default
          </button>
        )}
      </div>
      
      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
      
      <div className="text-xs text-gray-400">
        💡 Tip: You can paste folder paths directly from File Explorer's address bar
      </div>
    </div>
  );
}





