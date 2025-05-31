import React from 'react';

interface VisualElements {
  quickTakeaways: boolean;
  proTips: boolean;
  statHighlights: boolean;
  comparisonTables: boolean;
  calloutBoxes: boolean;
  imageSuggestions: boolean;
}

interface VisualElementsTabProps {
  visualElements: VisualElements;
  onChange: (visualElements: VisualElements) => void;
}

const VisualElementsTab: React.FC<VisualElementsTabProps> = ({
  visualElements,
  onChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    onChange({
      ...visualElements,
      [name]: checked,
    });
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">
        Visual Elements
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Customize which visual elements to include in your article to enhance readability and engagement.
      </p>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={visualElements.quickTakeaways}
              onChange={handleChange}
              name="quickTakeaways"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Quick Takeaways</div>
              <div className="text-sm text-gray-600">
                Key points highlighted in teal boxes
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={visualElements.proTips}
              onChange={handleChange}
              name="proTips"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Pro Tips</div>
              <div className="text-sm text-gray-600">
                Expert advice highlighted in amber boxes
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={visualElements.statHighlights}
              onChange={handleChange}
              name="statHighlights"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Stat Highlights</div>
              <div className="text-sm text-gray-600">
                Important statistics highlighted in purple boxes
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={visualElements.comparisonTables}
              onChange={handleChange}
              name="comparisonTables"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Comparison Tables</div>
              <div className="text-sm text-gray-600">
                Structured tables for comparing options or features
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={visualElements.calloutBoxes}
              onChange={handleChange}
              name="calloutBoxes"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Callout Boxes</div>
              <div className="text-sm text-gray-600">
                Important notes or warnings in gray boxes
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3">
            <input
              type="checkbox"
              checked={visualElements.imageSuggestions}
              onChange={handleChange}
              name="imageSuggestions"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Image Suggestions</div>
              <div className="text-sm text-gray-600">
                Recommendations for images at appropriate points
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Visual elements make your content more engaging and easier to scan
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-semibold mb-3">
          Preview of Visual Elements
        </h4>

        {visualElements.quickTakeaways && (
          <div className="mt-3 p-3 bg-teal-50 border-l-4 border-teal-400 rounded">
            <div className="text-sm">
              <strong>Quick Takeaway:</strong> This is an example of how quick takeaways will appear in your article.
            </div>
          </div>
        )}

        {visualElements.proTips && (
          <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
            <div className="text-sm">
              <strong>Pro Tip:</strong> This is an example of how pro tips will appear in your article.
            </div>
          </div>
        )}

        {visualElements.statHighlights && (
          <div className="mt-3 p-3 bg-purple-50 border-l-4 border-purple-400 rounded">
            <div className="text-sm">
              <strong>Stat Highlight:</strong> This is an example of how stat highlights will appear in your article.
            </div>
          </div>
        )}

        {visualElements.calloutBoxes && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-300 rounded-lg">
            <div className="text-sm font-medium">Important Note</div>
            <div className="text-sm">
              This is an example of how callout boxes will appear in your article.
            </div>
          </div>
        )}

        {visualElements.imageSuggestions && (
          <div className="mt-3 p-3 bg-purple-50 border border-dashed border-purple-400 rounded italic text-purple-700">
            <div className="text-sm">
              Suggest an image showing an example of the topic in action
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualElementsTab;
