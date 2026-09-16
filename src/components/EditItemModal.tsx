import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Item, Category } from '../types';
import { X, Save, Upload, AlertCircle } from 'lucide-react';

interface Props {
  item: Item;
  onClose: () => void;
}

const CATEGORIES: Category[] = [
  'Electronics',
  'Documents',
  'Wallet',
  'Keys',
  'Bags',
  'Clothing',
  'Books & Stationery',
  'Other'
];

export const EditItemModal: React.FC<Props> = ({ item, onClose }) => {
  const { updateItem } = useApp();

  const [itemName, setItemName] = useState(item.itemName);
  const [category, setCategory] = useState<Category>(item.category);
  const [description, setDescription] = useState(item.description);
  const [location, setLocation] = useState(item.location);
  const [date, setDate] = useState(item.date);
  const [color, setColor] = useState(item.color);
  const [currentStorageLocation, setCurrentStorageLocation] = useState(item.currentStorageLocation || '');
  const [additionalInfo, setAdditionalInfo] = useState(item.additionalInfo || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateItem({
      ...item,
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      location: location.trim(),
      date,
      color: color.trim(),
      currentStorageLocation: item.type === 'FOUND' ? currentStorageLocation.trim() : undefined,
      additionalInfo: additionalInfo.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h3 className="font-bold text-base">Edit {item.type} Report</h3>
            <p className="text-xs text-slate-400">Update listing details</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Item Name</label>
            <input
              type="text"
              required
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Category)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Color</label>
              <input
                type="text"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>
          </div>

          {item.type === 'FOUND' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Where is the item currently?
              </label>
              <input
                type="text"
                value={currentStorageLocation}
                onChange={e => setCurrentStorageLocation(e.target.value)}
                placeholder="e.g. Library Front Desk, Security Guard Cabin"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Additional Notes</label>
            <input
              type="text"
              value={additionalInfo}
              onChange={e => setAdditionalInfo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
