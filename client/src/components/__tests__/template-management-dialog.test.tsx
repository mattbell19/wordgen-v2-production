import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TemplateManagementDialog from '../template-management-dialog';
import { ArticleStructureTemplate } from '../../types/article-types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
});

describe('TemplateManagementDialog', () => {
  // Sample templates for testing
  const mockTemplates: ArticleStructureTemplate[] = [
    {
      id: 'template-1',
      name: 'Test Template',
      sections: {
        whatIs: true,
        whyMatters: true,
        howTo: true,
        bestPractices: false,
        challenges: false,
        caseStudies: false,
        comparison: false,
        futureTrends: false,
      },
      visualElements: {
        quickTakeaways: true,
        proTips: false,
        statHighlights: false,
        comparisonTables: false,
        calloutBoxes: false,
        imageSuggestions: false,
      },
      seoFeatures: {
        tableOfContents: true,
        faqSection: false,
        relatedTopics: true,
        metaDescription: true,
      },
      contentStyle: {
        tone: 'professional',
        readingLevel: 'basic',
        contentDensity: 2,
        targetAudience: 'general',
      },
      isDefault: false,
    },
  ];

  // Mock functions
  const mockOnClose = jest.fn();
  const mockOnImportTemplate = jest.fn();
  const mockOnDeleteTemplate = jest.fn();

  // Default props
  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    templates: mockTemplates,
    onImportTemplate: mockOnImportTemplate,
    onDeleteTemplate: mockOnDeleteTemplate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog with templates', () => {
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Check dialog title
    expect(screen.getByText('Template Management')).toBeInTheDocument();
    
    // Check if template is displayed
    expect(screen.getByText('Test Template')).toBeInTheDocument();
    
    // Check if export/import sections are present
    expect(screen.getByText('Export Template')).toBeInTheDocument();
    expect(screen.getByText('Import Template')).toBeInTheDocument();
  });

  it('displays empty state when no templates are available', () => {
    render(<TemplateManagementDialog {...defaultProps} templates={[]} />);
    
    expect(screen.getByText('No templates saved yet')).toBeInTheDocument();
  });

  it('exports a template when clicked', () => {
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Click on the template
    fireEvent.click(screen.getByText('Test Template'));
    
    // Check if the template JSON is displayed in the export field
    const exportField = screen.getByLabelText('Template JSON');
    expect(exportField).toHaveValue(expect.stringContaining('Test Template'));
  });

  it('copies template to clipboard when copy button is clicked', async () => {
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Click on the template to select it
    fireEvent.click(screen.getByText('Test Template'));
    
    // Click copy button
    fireEvent.click(screen.getByText('Copy to Clipboard'));
    
    // Check if clipboard API was called
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('validates template on import', async () => {
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Enter invalid JSON
    const importField = screen.getByLabelText('Paste template JSON here');
    fireEvent.change(importField, { target: { value: 'invalid json' } });
    
    // Click import button
    fireEvent.click(screen.getByText('Import Template'));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON format/i)).toBeInTheDocument();
    });
    
    // Verify import function wasn't called
    expect(mockOnImportTemplate).not.toHaveBeenCalled();
  });

  it('validates template structure on import', async () => {
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Enter valid JSON but invalid structure
    const importField = screen.getByLabelText('Paste template JSON here');
    fireEvent.change(importField, { 
      target: { value: JSON.stringify({ name: 'Invalid Template' }) } 
    });
    
    // Click import button
    fireEvent.click(screen.getByText('Import Template'));
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Sections configuration is required/i)).toBeInTheDocument();
    });
    
    // Verify import function wasn't called
    expect(mockOnImportTemplate).not.toHaveBeenCalled();
  });

  it('successfully imports a valid template', async () => {
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Create a valid template
    const validTemplate = {
      name: 'Valid Template',
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
        statHighlights: false,
        comparisonTables: false,
        calloutBoxes: false,
        imageSuggestions: false,
      },
      seoFeatures: {
        tableOfContents: true,
        faqSection: false,
        relatedTopics: true,
        metaDescription: true,
      },
      contentStyle: {
        tone: 'professional',
        readingLevel: 'basic',
        contentDensity: 2,
        targetAudience: 'general',
      },
    };
    
    // Enter valid template JSON
    const importField = screen.getByLabelText('Paste template JSON here');
    fireEvent.change(importField, { 
      target: { value: JSON.stringify(validTemplate) } 
    });
    
    // Click import button
    fireEvent.click(screen.getByText('Import Template'));
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Template imported successfully!')).toBeInTheDocument();
    });
    
    // Verify import function was called with the correct data
    expect(mockOnImportTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Valid Template',
        isDefault: false
      })
    );
  });

  it('deletes a template when delete button is clicked', () => {
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Find and click the delete button
    const deleteButton = screen.getByLabelText('Delete template Test Template');
    fireEvent.click(deleteButton);
    
    // Verify delete function was called with the correct ID
    expect(mockOnDeleteTemplate).toHaveBeenCalledWith('template-1');
  });

  it('downloads a template as a file when download button is clicked', () => {
    // Mock URL.createObjectURL and document methods
    const mockCreateObjectURL = jest.fn().mockReturnValue('blob-url');
    const mockRevokeObjectURL = jest.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
    
    // Mock document.createElement and related methods
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    document.createElement = jest.fn().mockReturnValue(mockAnchor);
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    
    render(<TemplateManagementDialog {...defaultProps} />);
    
    // Find and click the download button
    const downloadButton = screen.getByLabelText('Download template Test Template as file');
    fireEvent.click(downloadButton);
    
    // Verify URL.createObjectURL was called
    expect(mockCreateObjectURL).toHaveBeenCalled();
    
    // Verify anchor was created with correct attributes
    expect(mockAnchor.download).toBe('test-template-template.json');
    expect(mockAnchor.click).toHaveBeenCalled();
    
    // Verify cleanup was performed
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
});
