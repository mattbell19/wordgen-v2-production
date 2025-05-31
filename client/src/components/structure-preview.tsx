import React, { useMemo } from 'react';
import { Box, Text, Card } from '@radix-ui/themes';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  TextIcon,
  QuestionMarkCircledIcon,
  StarIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  SpeakerLoudIcon,
  ReaderIcon,
  TargetIcon,
  LayersIcon,
  LightningBoltIcon,
  RocketIcon,
  HeartIcon,
  ChatBubbleIcon,
  FileTextIcon,
  GlobeIcon,
  BarChartIcon,
  MixerVerticalIcon,
  PlusIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";

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

interface StructurePreviewProps {
  sections: ArticleStructureSections;
  visualElements: VisualElements;
  seoFeatures: SeoFeatures;
  contentStyle: ContentStyle;
}

const StructurePreview: React.FC<StructurePreviewProps> = ({
  sections,
  visualElements,
  seoFeatures,
  contentStyle,
}) => {
  // Memoize calculations to prevent recalculating on every render
  const statistics = useMemo(() => {
    // Count the number of sections
    const sectionCount = Object.values(sections).filter(Boolean).length + 2; // +2 for intro and conclusion

    // Count the number of visual elements
    const visualElementCount = Object.values(visualElements).filter(Boolean).length;

    // Count the number of SEO features
    const seoFeatureCount = Object.values(seoFeatures).filter(Boolean).length;

    // Calculate estimated reading time based on sections and visual elements
    const estimatedReadingTime = Math.round((sectionCount * 2 + visualElementCount) * 1.5);

    // Calculate estimated word count based on sections and visual elements
    const estimatedWordCount = sectionCount * 300 + visualElementCount * 100;

    return {
      sectionCount,
      visualElementCount,
      seoFeatureCount,
      estimatedReadingTime,
      estimatedWordCount
    };
  }, [sections, visualElements, seoFeatures]);

  return (
    <Box style={{ padding: 'var(--space-2)' }}>
      <Text size="6" weight="bold">Article Structure Preview</Text>
      <Text size="2" color="gray" style={{ marginBottom: 'var(--space-2)' }}>
        This is a preview of how your article will be structured based on your selections.
      </Text>

      {/* Article Stats Card */}
      <Card style={{ marginBottom: 'var(--space-3)', backgroundColor: 'var(--gray-2)' }}>
        <Box style={{ padding: 'var(--space-3)' }}>
          <Text size="4" weight="bold">Article Statistics</Text>
          <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Box style={{ backgroundColor: 'var(--accent-3)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="2">{`~${statistics.estimatedWordCount.toLocaleString()} words`}</Text>
                </Box>
              </Tooltip.Trigger>
              <Tooltip.Content>Estimated based on selected sections and elements</Tooltip.Content>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Box style={{ backgroundColor: 'var(--accent-4)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="2">{`~${statistics.estimatedReadingTime} min read`}</Text>
                </Box>
              </Tooltip.Trigger>
              <Tooltip.Content>Approximate reading time</Tooltip.Content>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Box style={{ backgroundColor: 'var(--accent-5)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="2">{`${statistics.sectionCount} sections`}</Text>
                </Box>
              </Tooltip.Trigger>
              <Tooltip.Content>Number of main sections</Tooltip.Content>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Box style={{ backgroundColor: 'var(--accent-6)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="2">{`${statistics.visualElementCount} visual elements`}</Text>
                </Box>
              </Tooltip.Trigger>
              <Tooltip.Content>Number of visual elements</Tooltip.Content>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Box style={{ backgroundColor: 'var(--accent-7)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-2)' }}>
                  <Text size="2">{`${statistics.seoFeatureCount} SEO features`}</Text>
                </Box>
              </Tooltip.Trigger>
              <Tooltip.Content>Number of SEO features</Tooltip.Content>
            </Tooltip.Root>
          </Box>
        </Box>
      </Card>

      <Card style={{ padding: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Text size="4" weight="bold">Article Outline</Text>

        <Box style={{ marginTop: 'var(--space-2)' }}>
          {/* Introduction - Always included */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <TextIcon />
            <Box>
              <Text size="3" weight="medium">Introduction</Text>
              <Text size="2" color="gray">Opening paragraph that introduces the topic</Text>
            </Box>
          </Box>

          {/* Table of Contents - Optional */}
          {seoFeatures.tableOfContents && (
            <Box style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', marginLeft: 'var(--space-4)' }}>
              <FileTextIcon />
              <Box>
                <Text size="3" weight="medium">Table of Contents</Text>
                <Text size="2" color="gray">Navigable list of article sections</Text>
              </Box>
            </Box>
          )}

          {/* What is Section - Optional */}
          {sections.whatIs && (
            <Box style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <QuestionMarkCircledIcon />
              <Box>
                <Text size="3" weight="medium">What is [Topic]</Text>
                <Text size="2" color="gray">Definition and explanation of the main concept</Text>
              </Box>
            </Box>
          )}

          {/* Why Matters Section - Optional */}
          {sections.whyMatters && (
            <Box style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <StarIcon />
              <Box>
                <Text size="3" weight="medium">Why [Topic] Matters</Text>
                <Text size="2" color="gray">Importance and impact of the topic</Text>
              </Box>
            </Box>
          )}

          {/* Content Style Information */}
          <Box style={{ marginTop: 'var(--space-4)', padding: 'var(--space-2)', backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-2)' }}>
            <Text size="3" weight="bold">Content Style</Text>
            <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Text size="2">Tone: {contentStyle.tone}</Text>
              <Text size="2">Reading Level: {contentStyle.readingLevel}</Text>
              <Text size="2">Content Density: {contentStyle.contentDensity}/5</Text>
              <Text size="2">Target Audience: {contentStyle.targetAudience}</Text>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default StructurePreview;
