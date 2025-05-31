import React from 'react';

interface SeoFeatures {
  tableOfContents: boolean;
  faqSection: boolean;
  relatedTopics: boolean;
  metaDescription: boolean;
}

interface SeoFeaturesTabProps {
  seoFeatures: SeoFeatures;
  onChange: (seoFeatures: SeoFeatures) => void;
}

const SeoFeaturesTab: React.FC<SeoFeaturesTabProps> = ({
  seoFeatures,
  onChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    onChange({
      ...seoFeatures,
      [name]: checked,
    });
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">
        SEO Features
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Customize which SEO features to include in your article to improve search engine visibility.
      </p>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={seoFeatures.tableOfContents}
              onChange={handleChange}
              name="tableOfContents"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Table of Contents</div>
              <div className="text-sm text-gray-600">
                Structured navigation for longer articles
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={seoFeatures.faqSection}
              onChange={handleChange}
              name="faqSection"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">FAQ Section</div>
              <div className="text-sm text-gray-600">
                Frequently asked questions with schema markup
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={seoFeatures.relatedTopics}
              onChange={handleChange}
              name="relatedTopics"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Related Topics</div>
              <div className="text-sm text-gray-600">
                LSI keywords and related concepts
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3">
            <input
              type="checkbox"
              checked={seoFeatures.metaDescription}
              onChange={handleChange}
              name="metaDescription"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Meta Description Suggestion</div>
              <div className="text-sm text-gray-600">
                SEO-optimized description suggestion
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          These features can significantly improve your article's search engine visibility
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-semibold mb-3">
          SEO Benefits
        </h4>
        <div className="text-sm space-y-1">
          <div>• <strong>Table of Contents:</strong> Improves navigation and user experience</div>
          <div>• <strong>FAQ Section:</strong> Can appear in Google's rich results</div>
          <div>• <strong>Related Topics:</strong> Helps with semantic SEO and topic clustering</div>
          <div>• <strong>Meta Description:</strong> Improves click-through rates from search results</div>
        </div>
      </div>
    </div>
  );
};

export default SeoFeaturesTab;
