import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

interface ArticleSettings {
  wordCount: number;
  writingStyle: 'professional' | 'casual' | 'friendly';
  language: 'english' | 'spanish' | 'french' | 'german';
  enableInternalLinking: boolean;
  enableExternalLinking: boolean;
  callToAction?: string;
  structure?: {
    sections: ArticleStructureSections;
    visualElements: VisualElements;
    seoFeatures: SeoFeatures;
    contentStyle: ContentStyle;
  };
}

interface ArticleSettingsStore {
  settings: ArticleSettings;
  updateSettings: (settings: Partial<ArticleSettings>) => void;
}

const defaultSettings: ArticleSettings = {
  wordCount: 1750,
  writingStyle: 'professional',
  language: 'english',
  enableInternalLinking: true,
  enableExternalLinking: true,
  callToAction: '',
  structure: {
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
      contentDensity: 3,
      targetAudience: 'general',
    },
  },
};

export const useArticleSettings = create<ArticleSettingsStore>(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'article-settings-storage',
      getStorage: () => localStorage,
    }
  )
);