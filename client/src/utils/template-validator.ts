/**
 * Utility functions for validating article structure templates
 */

import { ArticleStructureTemplate } from '../types/article-types';

/**
 * Validates a template structure
 * @param template The template to validate
 * @returns An object with validation result and errors
 */
export function validateTemplateStructure(template: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if template is an object
  if (!template || typeof template !== 'object') {
    return { isValid: false, errors: ['Template must be a valid object'] };
  }
  
  // Check required fields
  if (!template.name) errors.push('Template name is required');
  if (!template.sections) errors.push('Sections configuration is required');
  if (!template.visualElements) errors.push('Visual elements configuration is required');
  if (!template.seoFeatures) errors.push('SEO features configuration is required');
  if (!template.contentStyle) errors.push('Content style configuration is required');
  
  // Validate sections
  if (template.sections) {
    const requiredSectionProps = [
      'whatIs', 'whyMatters', 'howTo', 'bestPractices', 
      'challenges', 'caseStudies', 'comparison', 'futureTrends'
    ];
    
    requiredSectionProps.forEach(prop => {
      if (typeof template.sections[prop] !== 'boolean') {
        errors.push(`Section property "${prop}" must be a boolean`);
      }
    });
  }
  
  // Validate visual elements
  if (template.visualElements) {
    const requiredVisualProps = [
      'quickTakeaways', 'proTips', 'statHighlights', 
      'comparisonTables', 'calloutBoxes', 'imageSuggestions'
    ];
    
    requiredVisualProps.forEach(prop => {
      if (typeof template.visualElements[prop] !== 'boolean') {
        errors.push(`Visual element property "${prop}" must be a boolean`);
      }
    });
  }
  
  // Validate SEO features
  if (template.seoFeatures) {
    const requiredSeoProps = [
      'tableOfContents', 'faqSection', 'relatedTopics', 'metaDescription'
    ];
    
    requiredSeoProps.forEach(prop => {
      if (typeof template.seoFeatures[prop] !== 'boolean') {
        errors.push(`SEO feature property "${prop}" must be a boolean`);
      }
    });
  }
  
  // Validate content style
  if (template.contentStyle) {
    // Validate tone
    if (!template.contentStyle.tone) {
      errors.push('Content style tone is required');
    } else if (!['casual', 'friendly', 'professional', 'authoritative'].includes(template.contentStyle.tone)) {
      errors.push('Content style tone must be one of: casual, friendly, professional, authoritative');
    }
    
    // Validate reading level
    if (!template.contentStyle.readingLevel) {
      errors.push('Content style reading level is required');
    } else if (!['basic', 'intermediate', 'advanced'].includes(template.contentStyle.readingLevel)) {
      errors.push('Content style reading level must be one of: basic, intermediate, advanced');
    }
    
    // Validate content density
    if (template.contentStyle.contentDensity === undefined) {
      errors.push('Content style density is required');
    } else if (typeof template.contentStyle.contentDensity !== 'number' || 
               template.contentStyle.contentDensity < 1 || 
               template.contentStyle.contentDensity > 5) {
      errors.push('Content style density must be a number between 1 and 5');
    }
    
    // Validate target audience
    if (!template.contentStyle.targetAudience) {
      errors.push('Content style target audience is required');
    } else if (!['beginners', 'general', 'experts'].includes(template.contentStyle.targetAudience)) {
      errors.push('Content style target audience must be one of: beginners, general, experts');
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Sanitizes a template name to prevent XSS attacks
 * @param input The input string to sanitize
 * @returns The sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates a template for import
 * @param templateJson The JSON string to validate
 * @param existingTemplates Existing templates to check for duplicates
 * @returns An object with validation result, errors, and the validated template
 */
export function validateTemplateImport(
  templateJson: string,
  existingTemplates: ArticleStructureTemplate[]
): { 
  isValid: boolean; 
  errors: string[]; 
  template?: ArticleStructureTemplate;
  templateSize: number;
} {
  const errors: string[] = [];
  const MAX_TEMPLATE_SIZE = 100 * 1024; // 100KB
  
  // Check template size
  const templateSize = new Blob([templateJson]).size;
  if (templateSize > MAX_TEMPLATE_SIZE) {
    errors.push(`Template is too large (${Math.round(templateSize / 1024)}KB). Maximum size is ${MAX_TEMPLATE_SIZE / 1024}KB.`);
    return { isValid: false, errors, templateSize };
  }
  
  // Parse JSON
  let parsedTemplate;
  try {
    parsedTemplate = JSON.parse(templateJson);
  } catch (error) {
    errors.push('Invalid JSON format. Please check the template data.');
    return { isValid: false, errors, templateSize };
  }
  
  // Validate template structure
  const structureValidation = validateTemplateStructure(parsedTemplate);
  if (!structureValidation.isValid) {
    return { 
      isValid: false, 
      errors: structureValidation.errors,
      templateSize 
    };
  }
  
  // Check for duplicate names
  if (existingTemplates.some(t => t.name === parsedTemplate.name)) {
    errors.push(`A template with the name "${parsedTemplate.name}" already exists. Please use a different name.`);
    return { isValid: false, errors, templateSize };
  }
  
  // Sanitize template name
  parsedTemplate.name = sanitizeInput(parsedTemplate.name);
  
  return { 
    isValid: true, 
    errors: [], 
    template: parsedTemplate as ArticleStructureTemplate,
    templateSize
  };
}
