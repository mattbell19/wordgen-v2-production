import React, { useState } from 'react';

interface ArticleStructureTemplate {
  id: string;
  name: string;
  isDefault: boolean;
}

interface SavedTemplatesDropdownProps {
  templates: ArticleStructureTemplate[];
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  onSaveTemplate: (name: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onSetDefaultTemplate: (templateId: string) => void;
  onImportTemplate: (template: ArticleStructureTemplate) => void;
}

const SavedTemplatesDropdown: React.FC<SavedTemplatesDropdownProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onSaveTemplate,
}) => {
  const [newTemplateName, setNewTemplateName] = useState('');

  const handleTemplateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onSelectTemplate(event.target.value);
  };

  const handleSaveTemplate = () => {
    if (newTemplateName.trim()) {
      onSaveTemplate(newTemplateName.trim());
      setNewTemplateName('');
    }
  };

  return (
    <div className="flex items-center mb-6 space-x-2">
      <div className="flex-1">
        <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">
          Article Structure Template
        </label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={handleTemplateChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} {template.isDefault ? '⭐' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Template name"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleSaveTemplate}
          disabled={!newTemplateName.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default SavedTemplatesDropdown;
