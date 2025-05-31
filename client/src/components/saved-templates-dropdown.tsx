import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import TemplateManagementDialog from './template-management-dialog';

interface ArticleStructureTemplate {
  id: string;
  name: string;
  isDefault: boolean;
}

interface SavedTemplatesDropdownProps {
  templates: ArticleStructureTemplate[];
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  onSaveTemplate: (name: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onSetDefaultTemplate: (templateId: string) => void;
  onImportTemplate: (template: ArticleStructureTemplate) => void;
}

const SavedTemplatesDropdown: React.FC<SavedTemplatesDropdownProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onSetDefaultTemplate,
  onImportTemplate,
}) => {
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openManageDialog, setOpenManageDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');

  const handleTemplateChange = (event: SelectChangeEvent) => {
    onSelectTemplate(event.target.value);
  };

  const handleOpenSaveDialog = () => {
    setNewTemplateName('');
    setOpenSaveDialog(true);
  };

  const handleCloseSaveDialog = () => {
    setOpenSaveDialog(false);
  };

  const handleSaveTemplate = () => {
    if (newTemplateName.trim()) {
      onSaveTemplate(newTemplateName.trim());
      setOpenSaveDialog(false);
    }
  };

  const handleOpenDeleteDialog = (templateId: string) => {
    setTemplateToDelete(templateId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setTemplateToDelete(null);
  };

  const handleDeleteTemplate = () => {
    if (templateToDelete) {
      onDeleteTemplate(templateToDelete);
      setOpenDeleteDialog(false);
      setTemplateToDelete(null);
    }
  };

  const handleSetDefaultTemplate = (templateId: string) => {
    onSetDefaultTemplate(templateId);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
      <FormControl variant="outlined" sx={{ minWidth: 250, mr: 1 }}>
        <InputLabel id="template-select-label">Article Structure Template</InputLabel>
        <Select
          labelId="template-select-label"
          id="template-select"
          value={selectedTemplate}
          onChange={handleTemplateChange}
          label="Article Structure Template"
        >
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {template.name}
                {template.isDefault && (
                  <Tooltip title="Default Template">
                    <StarIcon fontSize="small" sx={{ ml: 1, color: 'warning.main' }} />
                  </Tooltip>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title="Save Current Settings as Template">
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleOpenSaveDialog}
          size="small"
          sx={{ mr: 1 }}
        >
          Save
        </Button>
      </Tooltip>

      <Tooltip title="Manage Templates">
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setOpenManageDialog(true)}
          size="small"
          sx={{ mr: 1 }}
        >
          Manage
        </Button>
      </Tooltip>

      {selectedTemplate && (
        <>
          <Tooltip title="Delete Template">
            <IconButton
              color="error"
              onClick={() => handleOpenDeleteDialog(selectedTemplate)}
              size="small"
              sx={{ mr: 1 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Set as Default Template">
            <IconButton
              color="warning"
              onClick={() => handleSetDefaultTemplate(selectedTemplate)}
              size="small"
              disabled={templates.find(t => t.id === selectedTemplate)?.isDefault}
            >
              {templates.find(t => t.id === selectedTemplate)?.isDefault ? (
                <StarIcon fontSize="small" />
              ) : (
                <StarOutlineIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </>
      )}

      {/* Save Template Dialog */}
      <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog}>
        <DialogTitle>Save Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Save your current article structure settings as a template for future use.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="template-name"
            label="Template Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog}>Cancel</Button>
          <Button
            onClick={handleSaveTemplate}
            variant="contained"
            disabled={!newTemplateName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Template Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this template? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteTemplate} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Management Dialog */}
      <TemplateManagementDialog
        open={openManageDialog}
        onClose={() => setOpenManageDialog(false)}
        templates={templates}
        onImportTemplate={onImportTemplate}
        onDeleteTemplate={onDeleteTemplate}
      />
    </Box>
  );
};

export default SavedTemplatesDropdown;
