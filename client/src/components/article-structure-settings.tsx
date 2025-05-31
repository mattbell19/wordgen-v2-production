import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Box, Button, Text } from '@radix-ui/themes';
import ArticleStructureTab from './article-structure-tab';
import VisualElementsTab from './visual-elements-tab';
import SeoFeaturesTab from './seo-features-tab';
import ContentStyleTab from './content-style-tab';
import StructurePreview from './structure-preview';
import SavedTemplatesDropdown from './saved-templates-dropdown';
import ContentTypeSelector from './content-type-selector';
import { MagicWandIcon } from '@radix-ui/react-icons';
import AutoFixHighIcon from '@radix-ui/react-icons';

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

interface VisualElements {
  quickTakeaways: boolean;
  proTips: boolean;
  statHighlights: boolean;
  comparisonTables: boolean;
  calloutBoxes: boolean;
  imageSuggestions: boolean;
}

interface SeoFeatures {
  tableOfContents: boolean;
  faqSection: boolean;
  relatedTopics: boolean;
  metaDescription: boolean;
}

interface ContentStyle {
  tone: string;
  readingLevel: string;
  contentDensity: number;
  targetAudience: string;
}

interface ArticleStructureTemplate {
  id: string;
  name: string;
  sections: ArticleStructureSections;
  visualElements: VisualElements;
  seoFeatures: SeoFeatures;
  contentStyle: ContentStyle;
  isDefault: boolean;
}

interface ArticleStructureSettingsProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: {
    sections: ArticleStructureSections;
    visualElements: VisualElements;
    seoFeatures: SeoFeatures;
    contentStyle: ContentStyle;
  }) => void;
  initialSettings?: {
    sections?: Partial<ArticleStructureSections>;
    visualElements?: Partial<VisualElements>;
    seoFeatures?: Partial<SeoFeatures>;
    contentStyle?: Partial<ContentStyle>;
  };
}

// Default values
const defaultSections: ArticleStructureSections = {
  whatIs: true,
  whyMatters: true,
  howTo: true,
  bestPractices: true,
  challenges: true,
  caseStudies: false,
  comparison: false,
  futureTrends: false,
};

const defaultVisualElements: VisualElements = {
  quickTakeaways: true,
  proTips: true,
  statHighlights: true,
  comparisonTables: true,
  calloutBoxes: true,
  imageSuggestions: true,
};

const defaultSeoFeatures: SeoFeatures = {
  tableOfContents: true,
  faqSection: true,
  relatedTopics: true,
  metaDescription: true,
};

const defaultContentStyle: ContentStyle = {
  tone: 'professional',
  readingLevel: 'intermediate',
  contentDensity: 3,
  targetAudience: 'general',
};

// Content type presets - templates optimized for different content types
const contentTypePresets: Record<string, ArticleStructureTemplate> = {
  'how-to': {
    id: 'preset-how-to',
    name: 'How-To Guide',
    sections: {
      whatIs: true,
      whyMatters: true,
      howTo: true,
      bestPractices: true,
      challenges: true,
      caseStudies: false,
      comparison: false,
      futureTrends: false,
    },
    visualElements: {
      quickTakeaways: true,
      proTips: true,
      statHighlights: false,
      comparisonTables: false,
      calloutBoxes: true,
      imageSuggestions: true,
    },
    seoFeatures: {
      tableOfContents: true,
      faqSection: true,
      relatedTopics: true,
      metaDescription: true,
    },
    contentStyle: {
      tone: 'friendly',
      readingLevel: 'intermediate',
      contentDensity: 3,
      targetAudience: 'beginners',
    },
    isDefault: false,
  },
  'product-review': {
    id: 'preset-product-review',
    name: 'Product Review',
    sections: {
      whatIs: true,
      whyMatters: false,
      howTo: false,
      bestPractices: false,
      challenges: false,
      caseStudies: false,
      comparison: true,
      futureTrends: false,
    },
    visualElements: {
      quickTakeaways: true,
      proTips: true,
      statHighlights: true,
      comparisonTables: true,
      calloutBoxes: true,
      imageSuggestions: true,
    },
    seoFeatures: {
      tableOfContents: true,
      faqSection: true,
      relatedTopics: true,
      metaDescription: true,
    },
    contentStyle: {
      tone: 'professional',
      readingLevel: 'intermediate',
      contentDensity: 4,
      targetAudience: 'general',
    },
    isDefault: false,
  },
  'listicle': {
    id: 'preset-listicle',
    name: 'Listicle',
    sections: {
      whatIs: true,
      whyMatters: true,
      howTo: false,
      bestPractices: false,
      challenges: false,
      caseStudies: false,
      comparison: false,
      futureTrends: false,
    },
    visualElements: {
      quickTakeaways: true,
      proTips: false,
      statHighlights: true,
      comparisonTables: false,
      calloutBoxes: false,
      imageSuggestions: true,
    },
    seoFeatures: {
      tableOfContents: true,
      faqSection: false,
      relatedTopics: true,
      metaDescription: true,
    },
    contentStyle: {
      tone: 'casual',
      readingLevel: 'basic',
      contentDensity: 2,
      targetAudience: 'general',
    },
    isDefault: false,
  },
  'industry-guide': {
    id: 'preset-industry-guide',
    name: 'Industry Guide',
    sections: {
      whatIs: true,
      whyMatters: true,
      howTo: true,
      bestPractices: true,
      challenges: true,
      caseStudies: true,
      comparison: true,
      futureTrends: true,
    },
    visualElements: {
      quickTakeaways: true,
      proTips: true,
      statHighlights: true,
      comparisonTables: true,
      calloutBoxes: true,
      imageSuggestions: true,
    },
    seoFeatures: {
      tableOfContents: true,
      faqSection: true,
      relatedTopics: true,
      metaDescription: true,
    },
    contentStyle: {
      tone: 'authoritative',
      readingLevel: 'advanced',
      contentDensity: 5,
      targetAudience: 'experts',
    },
    isDefault: false,
  },
};

// Mock templates - in a real app, these would come from an API
const mockTemplates: ArticleStructureTemplate[] = [
  {
    id: 'default',
    name: 'Default Template',
    sections: defaultSections,
    visualElements: defaultVisualElements,
    seoFeatures: defaultSeoFeatures,
    contentStyle: defaultContentStyle,
    isDefault: true,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    sections: {
      ...defaultSections,
      bestPractices: false,
      challenges: false,
      caseStudies: false,
      comparison: false,
      futureTrends: false,
    },
    visualElements: {
      ...defaultVisualElements,
      statHighlights: false,
      comparisonTables: false,
      calloutBoxes: false,
      imageSuggestions: false,
    },
    seoFeatures: {
      ...defaultSeoFeatures,
      faqSection: false,
      relatedTopics: false,
    },
    contentStyle: {
      ...defaultContentStyle,
      contentDensity: 1,
    },
    isDefault: false,
  },
  {
    id: 'comprehensive',
    name: 'Comprehensive',
    sections: {
      ...defaultSections,
      caseStudies: true,
      comparison: true,
      futureTrends: true,
    },
    visualElements: defaultVisualElements,
    seoFeatures: defaultSeoFeatures,
    contentStyle: {
      ...defaultContentStyle,
      contentDensity: 5,
      readingLevel: 'advanced',
    },
    isDefault: false,
  },
  // Add content type presets
  contentTypePresets['how-to'],
  contentTypePresets['product-review'],
  contentTypePresets['listicle'],
  contentTypePresets['industry-guide'],
];

const ArticleStructureSettings: React.FC<ArticleStructureSettingsProps> = ({
  open,
  onClose,
  onSave,
  initialSettings,
}) => {
  const [tabValue, setTabValue] = useState('0');
  const [sections, setSections] = useState<ArticleStructureSections>({
    ...defaultSections,
    ...initialSettings?.sections,
  });
  const [visualElements, setVisualElements] = useState<VisualElements>({
    ...defaultVisualElements,
    ...initialSettings?.visualElements,
  });
  const [seoFeatures, setSeoFeatures] = useState<SeoFeatures>({
    ...defaultSeoFeatures,
    ...initialSettings?.seoFeatures,
  });
  const [contentStyle, setContentStyle] = useState<ContentStyle>({
    ...defaultContentStyle,
    ...initialSettings?.contentStyle,
  });
  const [templates, setTemplates] = useState<ArticleStructureTemplate[]>([]);
  const [showContentTypeSelector, setShowContentTypeSelector] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  const handleSaveTemplate = (name: string) => {
    const newTemplate: ArticleStructureTemplate = {
      id: `template-${Date.now()}`,
      name,
      sections,
      visualElements,
      seoFeatures,
      contentStyle,
      isDefault: false,
    };

    setTemplates([...templates, newTemplate]);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
  };

  const handleSetDefaultTemplate = (templateId: string) => {
    setTemplates(
      templates.map(t => ({
        ...t,
        isDefault: t.id === templateId,
      }))
    );
  };

  const handleImportTemplate = (template: ArticleStructureTemplate) => {
    setSections(template.sections);
    setVisualElements(template.visualElements);
    setSeoFeatures(template.seoFeatures);
    setContentStyle(template.contentStyle);
  };

  const handleSelectContentType = (contentTypeId: string) => {
    const contentTypeTemplate = contentTypePresets[contentTypeId];
    if (contentTypeTemplate) {
      setSections(contentTypeTemplate.sections);
      setVisualElements(contentTypeTemplate.visualElements);
      setSeoFeatures(contentTypeTemplate.seoFeatures);
      setContentStyle(contentTypeTemplate.contentStyle);
    }
    setShowContentTypeSelector(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <Dialog.Title>
          <Text size="6" weight="bold">Article Structure Settings</Text>
          <Text size="2" color="gray">Customize the structure and style of your generated article</Text>
        </Dialog.Title>

        <Box style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <SavedTemplatesDropdown
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onSetDefaultTemplate={handleSetDefaultTemplate}
            onImportTemplate={handleImportTemplate}
          />

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Button variant="outline" onClick={() => setShowContentTypeSelector(true)}>
                <MagicWandIcon /> Optimize for Content Type
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              Get a structure optimized for your content type
            </Tooltip.Content>
          </Tooltip.Root>
        </Box>

        <Box style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 'var(--space-2)' }}>
          <Box style={{ flex: 1, borderRight: isMobile ? 'none' : '1px solid var(--gray-6)' }}>
            <Tabs.Root value={tabValue} onValueChange={setTabValue}>
              <Tabs.List>
                <Tabs.Trigger value="0">Sections</Tabs.Trigger>
                <Tabs.Trigger value="1">Visual Elements</Tabs.Trigger>
                <Tabs.Trigger value="2">SEO Features</Tabs.Trigger>
                <Tabs.Trigger value="3">Style</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="0">
                <ArticleStructureTab
                  sections={sections}
                  onChange={setSections}
                />
              </Tabs.Content>

              <Tabs.Content value="1">
                <VisualElementsTab
                  visualElements={visualElements}
                  onChange={setVisualElements}
                />
              </Tabs.Content>

              <Tabs.Content value="2">
                <SeoFeaturesTab
                  seoFeatures={seoFeatures}
                  onChange={setSeoFeatures}
                />
              </Tabs.Content>

              <Tabs.Content value="3">
                <ContentStyleTab
                  contentStyle={contentStyle}
                  onChange={setContentStyle}
                />
              </Tabs.Content>
            </Tabs.Root>
          </Box>

          <Box style={{ flex: 1 }}>
            <StructurePreview
              sections={sections}
              visualElements={visualElements}
              seoFeatures={seoFeatures}
              contentStyle={contentStyle}
            />
          </Box>
        </Box>

        <Box style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <Dialog.Close asChild>
            <Button variant="outline">Cancel</Button>
          </Dialog.Close>
          <Button onClick={() => {
            onSave({
              sections,
              visualElements,
              seoFeatures,
              contentStyle,
            });
            onClose();
          }}>Save Settings</Button>
        </Box>
      </Dialog.Content>

      <ContentTypeSelector
        open={showContentTypeSelector}
        onClose={() => setShowContentTypeSelector(false)}
        onSelectContentType={handleSelectContentType}
      />
    </Dialog.Root>
  );
};

export default ArticleStructureSettings;
