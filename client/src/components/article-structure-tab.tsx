import React from 'react';

interface ArticleStructureSections {
  whatIs: boolean;
  whyMatters: boolean;
  howTo: boolean;
  bestPractices: boolean;
  challenges: boolean;
  caseStudies: boolean;
  comparison: boolean;
  futureTrends: boolean;
}

interface ArticleStructureTabProps {
  sections: ArticleStructureSections;
  onChange: (sections: ArticleStructureSections) => void;
}

const ArticleStructureTab: React.FC<ArticleStructureTabProps> = ({
  sections,
  onChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    onChange({
      ...sections,
      [name]: checked,
    });
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">
        Article Sections
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Customize which sections to include in your article. Introduction and Conclusion are always included.
      </p>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={true}
              disabled
              name="introduction"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Introduction</div>
              <div className="text-sm text-gray-600">
                Opening paragraph that introduces the topic
              </div>
            </div>
          </div>
            
          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.whatIs}
              onChange={handleChange}
              name="whatIs"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">What is [Topic]</div>
              <div className="text-sm text-gray-600">
                Definition and explanation of the main concept
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.whyMatters}
              onChange={handleChange}
              name="whyMatters"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Why [Topic] Matters</div>
              <div className="text-sm text-gray-600">
                Benefits and importance of the topic
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.howTo}
              onChange={handleChange}
              name="howTo"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">How to Use [Topic]</div>
              <div className="text-sm text-gray-600">
                Implementation steps and practical guidance
              </div>
            </div>
          </div>
            
          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.bestPractices}
              onChange={handleChange}
              name="bestPractices"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Best Practices</div>
              <div className="text-sm text-gray-600">
                Tips and recommendations for optimal results
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.challenges}
              onChange={handleChange}
              name="challenges"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Common Challenges</div>
              <div className="text-sm text-gray-600">
                Problems and solutions related to the topic
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.caseStudies}
              onChange={handleChange}
              name="caseStudies"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Case Studies/Examples</div>
              <div className="text-sm text-gray-600">
                Real-world applications and examples
              </div>
            </div>
          </div>
            
          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.comparison}
              onChange={handleChange}
              name="comparison"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Comparison</div>
              <div className="text-sm text-gray-600">
                Comparing with alternatives or competitors
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={sections.futureTrends}
              onChange={handleChange}
              name="futureTrends"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Future Trends</div>
              <div className="text-sm text-gray-600">
                Upcoming developments and predictions
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3">
            <input
              type="checkbox"
              checked={true}
              disabled
              name="conclusion"
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium">Conclusion</div>
              <div className="text-sm text-gray-600">
                Summary and closing thoughts
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Select at least 2 sections for a well-structured article
        </div>
      </div>
    </div>
  );
};

export default ArticleStructureTab;
