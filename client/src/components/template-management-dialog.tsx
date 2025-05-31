import React from 'react';

interface ArticleStructureTemplate {
  id: string;
  name: string;
  sections: any;
  visualElements: any;
  seoFeatures: any;
  contentStyle: any;
  isDefault: boolean;
}

interface TemplateManagementDialogProps {
  open: boolean;
  onClose: () => void;
  templates: ArticleStructureTemplate[];
  onImportTemplate: (template: ArticleStructureTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

const TemplateManagementDialog: React.FC<TemplateManagementDialogProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Template Management</h2>
          <p className="text-gray-600">
            Template management features are temporarily disabled during the build process.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateManagementDialog;
