import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import { validateTemplateImport } from '../utils/template-validator';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';

// Template interface
interface ArticleStructureTemplate {
  id: string;
  name: string;
  sections: any;
  visualElements: any;
  seoFeatures: any;
  contentStyle: any;
  isDefault: boolean;
}

interface TemplateManagementDialogProps {
  open: boolean;
  onClose: () => void;
  templates: ArticleStructureTemplate[];
  onImportTemplate: (template: ArticleStructureTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

const TemplateManagementDialog: React.FC<TemplateManagementDialogProps> = ({
  open,
  onClose,
  templates,
  onImportTemplate,
  onDeleteTemplate,
}) => {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [exportText, setExportText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Handle exporting a template
  const handleExportTemplate = (template: ArticleStructureTemplate) => {
    const templateJson = JSON.stringify(template, null, 2);
    setExportText(templateJson);
    setSelectedTemplate(template.id);
  };

  // Handle copying export text to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportText);
  };

  // State for import/export operations
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  // Handle importing a template
  const handleImportTemplate = () => {
    setIsLoading(true);
    setImportError('');

    try {
      // Validate the template
      const validation = validateTemplateImport(importText, templates);

      if (!validation.isValid) {
        // Join all validation errors
        setImportError(validation.errors.join('\n'));
        setIsLoading(false);
        return;
      }

      // Generate a new ID for the imported template
      const newTemplate = {
        ...validation.template!,
        id: `template-${Date.now()}`,
        isDefault: false,
      };

      onImportTemplate(newTemplate);
      setImportText('');
      setImportSuccess('Template imported successfully!');
      setTimeout(() => setImportSuccess(''), 3000);
    } catch (error) {
      console.error('Template import error:', error);
      setImportError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle pasting from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setImportText(text);
      setImportError('');
    } catch (error) {
      setImportError('Failed to read from clipboard. Please paste manually.');
    }
  };

  // Download template as JSON file
  const handleDownloadTemplate = (template: ArticleStructureTemplate) => {
    const templateJson = JSON.stringify(template, null, 2);
    const blob = new Blob([templateJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}-template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="template-management-dialog-title"
    >
      <DialogTitle id="template-management-dialog-title">
        Template Management
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          {/* Template List */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" gutterBottom>
              Your Templates
            </Typography>
            <List sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {templates.length === 0 ? (
                <ListItem>
                  <ListItemText primary="No templates saved yet" />
                </ListItem>
              ) : (
                templates.map((template) => (
                  <React.Fragment key={template.id}>
                    <ListItem
                      secondaryAction={
                        <Box>
                          <Tooltip title="Export as JSON">
                            <IconButton
                              edge="end"
                              aria-label={`Export template ${template.name}`}
                              onClick={() => handleExportTemplate(template)}
                            >
                              <ContentCopyIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download as file">
                            <IconButton
                              edge="end"
                              aria-label={`Download template ${template.name} as file`}
                              onClick={() => handleDownloadTemplate(template)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete template">
                            <IconButton
                              edge="end"
                              aria-label={`Delete template ${template.name}`}
                              onClick={() => onDeleteTemplate(template.id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemButton
                        selected={selectedTemplate === template.id}
                        onClick={() => handleExportTemplate(template)}
                        aria-label={`Select template ${template.name}`}
                        role="button"
                      >
                        <ListItemText
                          primary={template.name}
                          secondary={template.isDefault ? 'Default template' : null}
                        />
                      </ListItemButton>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))
              )}
            </List>
          </Box>

          {/* Export/Import Section */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Export Template
              </Typography>
              <TextField
                label="Template JSON"
                multiline
                rows={8}
                value={exportText}
                fullWidth
                variant="outlined"
                InputProps={{
                  readOnly: true,
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyToClipboard}
                  disabled={!exportText}
                  aria-label="Copy template JSON to clipboard"
                >
                  Copy to Clipboard
                </Button>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Import Template
              </Typography>
              <TextField
                label="Paste template JSON here"
                multiline
                rows={8}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError('');
                }}
                fullWidth
                variant="outlined"
                error={!!importError}
                helperText={importError}
              />
              {importSuccess && (
                <Box sx={{ mt: 1, p: 1, bgcolor: '#e6f4ea', borderRadius: 1, color: '#1e8e3e' }}>
                  {importSuccess}
                </Box>
              )}
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  startIcon={<ContentPasteIcon />}
                  onClick={handlePasteFromClipboard}
                  disabled={isLoading}
                  aria-label="Paste template JSON from clipboard"
                >
                  Paste from Clipboard
                </Button>
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
                  onClick={handleImportTemplate}
                  disabled={!importText || isLoading}
                  aria-label="Import template from JSON"
                >
                  {isLoading ? 'Importing...' : 'Import Template'}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" color="info" />
            Template Sharing
          </Typography>
          <DialogContentText>
            You can share templates with other users by exporting them and sending the JSON data.
            Recipients can then import the template using the import function above.
          </DialogContentText>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateManagementDialog;
