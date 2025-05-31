import React from 'react';

interface ContentType {
  id: string;
  name: string;
  description: string;
}

interface ContentTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectContentType: (contentTypeId: string) => void;
}

const contentTypes: ContentType[] = [
  {
    id: 'how-to',
    name: 'How-To Guide',
    description: 'Step-by-step instructions to help readers accomplish a specific task.',
  },
  {
    id: 'product-review',
    name: 'Product Review',
    description: 'Detailed evaluation of a product or service with pros, cons, and recommendations.',
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: 'Article organized as a numbered or bulleted list of items or tips.',
  },
  {
    id: 'industry-guide',
    name: 'Industry Guide',
    description: 'Comprehensive overview of an industry, trend, or complex topic.',
  }
];

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  open,
  onClose,
  onSelectContentType,
}) => {
  const handleSelectContentType = (contentTypeId: string) => {
    onSelectContentType(contentTypeId);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Choose a Content Type</h2>
          <p className="text-gray-600">
            Select the type of content you want to create to get an optimized article structure
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {contentTypes.map((contentType) => (
            <div
              key={contentType.id}
              onClick={() => handleSelectContentType(contentType.id)}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-lg mb-2">{contentType.name}</h3>
              <p className="text-gray-600 text-sm">{contentType.description}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentTypeSelector;
