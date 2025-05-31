import { validateTemplateStructure, sanitizeInput, validateTemplateImport } from '../template-validator';
import { ArticleStructureTemplate } from '../../types/article-types';

describe('Template Validator', () => {
  // Valid template for testing
  const validTemplate: ArticleStructureTemplate = {
    id: 'test-template',
    name: 'Test Template',
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
      imageSuggestions: false,
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
    isDefault: false,
  };

  describe('validateTemplateStructure', () => {
    it('should validate a correct template structure', () => {
      const result = validateTemplateStructure(validTemplate);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null or undefined templates', () => {
      const result1 = validateTemplateStructure(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Template must be a valid object');

      const result2 = validateTemplateStructure(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Template must be a valid object');
    });

    it('should validate required fields', () => {
      const invalidTemplate = { ...validTemplate };
      delete (invalidTemplate as any).name;
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Template name is required');
    });

    it('should validate sections', () => {
      const invalidTemplate = { 
        ...validTemplate,
        sections: {
          ...validTemplate.sections,
          whatIs: 'true' // Should be boolean, not string
        }
      };
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Section property "whatIs" must be a boolean');
    });

    it('should validate visual elements', () => {
      const invalidTemplate = { 
        ...validTemplate,
        visualElements: {
          ...validTemplate.visualElements,
          quickTakeaways: 1 // Should be boolean, not number
        }
      };
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Visual element property "quickTakeaways" must be a boolean');
    });

    it('should validate SEO features', () => {
      const invalidTemplate = { 
        ...validTemplate,
        seoFeatures: {
          ...validTemplate.seoFeatures,
          tableOfContents: null // Should be boolean, not null
        }
      };
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SEO feature property "tableOfContents" must be a boolean');
    });

    it('should validate content style tone', () => {
      const invalidTemplate = { 
        ...validTemplate,
        contentStyle: {
          ...validTemplate.contentStyle,
          tone: 'invalid-tone' // Not in allowed values
        }
      };
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content style tone must be one of: casual, friendly, professional, authoritative');
    });

    it('should validate content style reading level', () => {
      const invalidTemplate = { 
        ...validTemplate,
        contentStyle: {
          ...validTemplate.contentStyle,
          readingLevel: 'expert' // Not in allowed values
        }
      };
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content style reading level must be one of: basic, intermediate, advanced');
    });

    it('should validate content style density', () => {
      const invalidTemplate = { 
        ...validTemplate,
        contentStyle: {
          ...validTemplate.contentStyle,
          contentDensity: 10 // Out of range
        }
      };
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content style density must be a number between 1 and 5');
    });

    it('should validate content style target audience', () => {
      const invalidTemplate = { 
        ...validTemplate,
        contentStyle: {
          ...validTemplate.contentStyle,
          targetAudience: 'professionals' // Not in allowed values
        }
      };
      
      const result = validateTemplateStructure(invalidTemplate);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content style target audience must be one of: beginners, general, experts');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML tags', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });

    it('should sanitize quotes', () => {
      const input = 'Template with "quotes" and \'single quotes\'';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('Template with &quot;quotes&quot; and &#039;single quotes&#039;');
    });
  });

  describe('validateTemplateImport', () => {
    it('should validate a correct template import', () => {
      const templateJson = JSON.stringify(validTemplate);
      const result = validateTemplateImport(templateJson, []);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.template).toBeDefined();
      expect(result.template?.name).toBe(validTemplate.name);
    });

    it('should reject templates that are too large', () => {
      // Create a large template by adding a lot of comments
      let largeTemplate = { ...validTemplate };
      let largeComment = '';
      for (let i = 0; i < 100000; i++) {
        largeComment += 'x';
      }
      (largeTemplate as any).comment = largeComment;
      
      const templateJson = JSON.stringify(largeTemplate);
      const result = validateTemplateImport(templateJson, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Template is too large');
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{ "name": "Invalid JSON" '; // Missing closing brace
      const result = validateTemplateImport(invalidJson, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid JSON format. Please check the template data.');
    });

    it('should reject templates with duplicate names', () => {
      const existingTemplates = [{ ...validTemplate }];
      const newTemplate = { ...validTemplate };
      
      const templateJson = JSON.stringify(newTemplate);
      const result = validateTemplateImport(templateJson, existingTemplates);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('A template with the name');
    });

    it('should sanitize template names', () => {
      const templateWithUnsafeName = { 
        ...validTemplate,
        name: '<script>alert("XSS")</script>'
      };
      
      const templateJson = JSON.stringify(templateWithUnsafeName);
      const result = validateTemplateImport(templateJson, []);
      
      expect(result.isValid).toBe(true);
      expect(result.template?.name).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });
  });
});
