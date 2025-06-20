
import React, { useState } from 'react';
import { AddIcon, DeleteIcon } from '../constants';

interface ListManagementSectionProps {
  title: string;
  items: string[];
  onAddItem: (item: string) => Promise<void>;
  onRemoveItem: (item: string) => Promise<void>;
  isLoading?: boolean; // This is for the parent page's loading state for this section's data
  placeholder?: string;
}

export const ListManagementSection: React.FC<ListManagementSectionProps> = ({
  title,
  items = [],
  onAddItem,
  onRemoveItem,
  isLoading = false,
  placeholder,
}) => {
  const [newItem, setNewItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Internal submitting state for add/remove actions

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddItem(newItem.trim());
      setNewItem('');
    } catch (error) {
      // Error already logged by caller, alert shown by caller
      console.error(`ListManagementSection: Error adding ${title.slice(0,-1)}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveItem = async (itemToRemove: string) => {
    // Confirmation can be handled by caller if preferred, or here.
    // For now, assuming caller handles confirmation or it's not needed for every list.
    // if (!window.confirm(`Are you sure you want to remove "${itemToRemove}"?`)) return;
    setIsSubmitting(true);
    try {
      await onRemoveItem(itemToRemove);
    } catch (error) {
      console.error(`ListManagementSection: Error removing ${title.slice(0,-1)}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isLoading || isSubmitting;

  return (
    <div className="p-6 bg-white shadow-card rounded-xl">
      <h3 className="text-xl font-bold text-brand-primary mb-5 pb-2 border-b border-slate-300">{title}</h3>
      <div className="mb-4 flex gap-2 items-center">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder || `New ${title.slice(0, -1)} Name`}
          className="input-base flex-grow"
          disabled={disabled}
          onKeyDown={(e) => e.key === 'Enter' && !disabled && newItem.trim() && handleAddItem()}
        />
        <button
          onClick={handleAddItem}
          disabled={disabled || !newItem.trim()}
          className="btn btn-secondary flex-shrink-0"
          type="button" // Ensure it doesn't submit parent form if nested
        >
          Add
        </button>
      </div>
      {isLoading && <p className="text-sm text-slate-500 py-3 text-center">Loading {title.toLowerCase()}...</p>}
      {!isLoading && items.length === 0 && <p className="text-sm text-slate-500 py-3 text-center">No {title.toLowerCase()} have been added yet.</p>}
      {items.length > 0 && (
        <ul className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-sleek pr-1">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between p-2.5 bg-slate-50 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <span className="text-sm text-slate-700">{item}</span>
              <button
                onClick={() => handleRemoveItem(item)}
                disabled={disabled}
                className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 disabled:opacity-50 transition-colors"
                title={`Remove ${item}`}
                type="button"
              >
                <DeleteIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
