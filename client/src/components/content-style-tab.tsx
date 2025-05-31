import React from 'react';

interface ContentStyle {
  tone: string;
  readingLevel: string;
  contentDensity: number;
  targetAudience: string;
}

interface ContentStyleTabProps {
  contentStyle: ContentStyle;
  onChange: (contentStyle: ContentStyle) => void;
}

const ContentStyleTab: React.FC<ContentStyleTabProps> = ({
  contentStyle,
  onChange,
}) => {
  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    onChange({
      ...contentStyle,
      [name]: value,
    });
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...contentStyle,
      contentDensity: parseInt(event.target.value),
    });
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">
        Content Style
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Customize the tone, style, and target audience for your article.
      </p>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
              Tone
            </label>
            <select
              id="tone"
              name="tone"
              value={contentStyle.tone}
              onChange={handleSelectChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="authoritative">Authoritative</option>
              <option value="conversational">Conversational</option>
              <option value="educational">Educational</option>
              <option value="persuasive">Persuasive</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The overall tone of voice for your article
            </p>
          </div>

          <div>
            <label htmlFor="readingLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Reading Level
            </label>
            <select
              id="readingLevel"
              name="readingLevel"
              value={contentStyle.readingLevel}
              onChange={handleSelectChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="basic">Basic (Grade 6-8)</option>
              <option value="intermediate">Intermediate (Grade 9-12)</option>
              <option value="advanced">Advanced (College Level)</option>
              <option value="expert">Expert (Specialized Knowledge)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The complexity level of the language used
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="contentDensity" className="block text-sm font-medium text-gray-700 mb-1">
              Content Density: {
                contentStyle.contentDensity === 1 ? 'Concise' :
                contentStyle.contentDensity === 2 ? 'Somewhat Concise' :
                contentStyle.contentDensity === 3 ? 'Balanced' :
                contentStyle.contentDensity === 4 ? 'Somewhat Comprehensive' :
                'Comprehensive'
              }
            </label>
            <input
              type="range"
              id="contentDensity"
              name="contentDensity"
              min="1"
              max="5"
              step="1"
              value={contentStyle.contentDensity}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Concise</span>
              <span>Balanced</span>
              <span>Comprehensive</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Adjust how detailed and in-depth the content should be
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">
              Target Audience
            </label>
            <select
              id="targetAudience"
              name="targetAudience"
              value={contentStyle.targetAudience}
              onChange={handleSelectChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="beginners">Beginners (New to the topic)</option>
              <option value="intermediate">Intermediate (Some knowledge)</option>
              <option value="advanced">Advanced (Experienced users)</option>
              <option value="experts">Experts (Professional level)</option>
              <option value="general">General Audience (Mixed knowledge levels)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Who the article is primarily written for
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h4 className="text-sm font-semibold mb-3">
          Style Preview
        </h4>
        <div className="text-sm space-y-1">
          <div>
            <strong>Tone:</strong> {contentStyle.tone.charAt(0).toUpperCase() + contentStyle.tone.slice(1)}
          </div>
          <div>
            <strong>Reading Level:</strong> {contentStyle.readingLevel.charAt(0).toUpperCase() + contentStyle.readingLevel.slice(1)}
          </div>
          <div>
            <strong>Content Density:</strong> {
              contentStyle.contentDensity === 1 ? 'Concise' :
              contentStyle.contentDensity === 2 ? 'Somewhat Concise' :
              contentStyle.contentDensity === 3 ? 'Balanced' :
              contentStyle.contentDensity === 4 ? 'Somewhat Comprehensive' :
              'Comprehensive'
            }
          </div>
          <div>
            <strong>Target Audience:</strong> {contentStyle.targetAudience.charAt(0).toUpperCase() + contentStyle.targetAudience.slice(1)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentStyleTab;
