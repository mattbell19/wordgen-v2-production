import React from 'react';
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Paper,
  Typography,
} from '@mui/material';

interface VisualElements {
  quickTakeaways: boolean;
  proTips: boolean;
  statHighlights: boolean;
  comparisonTables: boolean;
  calloutBoxes: boolean;
  imageSuggestions: boolean;
}

interface VisualElementsTabProps {
  visualElements: VisualElements;
  onChange: (visualElements: VisualElements) => void;
}

const VisualElementsTab: React.FC<VisualElementsTabProps> = ({
  visualElements,
  onChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    onChange({
      ...visualElements,
      [name]: checked,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Visual Elements
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customize which visual elements to include in your article to enhance readability and engagement.
      </Typography>

      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', mb: 3 }}>
        <FormControl component="fieldset" variant="standard">
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={visualElements.quickTakeaways}
                  onChange={handleChange}
                  name="quickTakeaways"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Quick Takeaways</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Key points highlighted in teal boxes
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={visualElements.proTips}
                  onChange={handleChange}
                  name="proTips"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Pro Tips</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Expert advice highlighted in amber boxes
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={visualElements.statHighlights}
                  onChange={handleChange}
                  name="statHighlights"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Stat Highlights</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Important statistics highlighted in purple boxes
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={visualElements.comparisonTables}
                  onChange={handleChange}
                  name="comparisonTables"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Comparison Tables</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Structured tables for comparing options or features
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={visualElements.calloutBoxes}
                  onChange={handleChange}
                  name="calloutBoxes"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Callout Boxes</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Important notes or warnings in gray boxes
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={visualElements.imageSuggestions}
                  onChange={handleChange}
                  name="imageSuggestions"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Image Suggestions</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Recommendations for images at appropriate points
                  </Typography>
                </Box>
              }
            />
          </FormGroup>
          <FormHelperText>
            Visual elements make your content more engaging and easier to scan
          </FormHelperText>
        </FormControl>
      </Paper>

      <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Preview of Visual Elements
        </Typography>
        
        {visualElements.quickTakeaways && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: '#f0fdfa', 
            borderLeft: '4px solid #2dd4bf',
            borderRadius: '0.375rem'
          }}>
            <Typography variant="body2">
              <strong>Quick Takeaway:</strong> This is an example of how quick takeaways will appear in your article.
            </Typography>
          </Box>
        )}
        
        {visualElements.proTips && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: '#fef3c7', 
            borderLeft: '4px solid #f59e0b',
            borderRadius: '0.375rem'
          }}>
            <Typography variant="body2">
              <strong>Pro Tip:</strong> This is an example of how pro tips will appear in your article.
            </Typography>
          </Box>
        )}
        
        {visualElements.statHighlights && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: '#ede9fe', 
            borderLeft: '4px solid #8b5cf6',
            borderRadius: '0.375rem'
          }}>
            <Typography variant="body2">
              <strong>Stat Highlight:</strong> This is an example of how stat highlights will appear in your article.
            </Typography>
          </Box>
        )}
        
        {visualElements.calloutBoxes && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: '#f3f4f6', 
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem'
          }}>
            <Typography variant="subtitle2">Important Note</Typography>
            <Typography variant="body2">
              This is an example of how callout boxes will appear in your article.
            </Typography>
          </Box>
        )}
        
        {visualElements.imageSuggestions && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: '#faf5ff', 
            border: '1px dashed #a855f7',
            borderRadius: '0.375rem',
            fontStyle: 'italic',
            color: '#7e22ce'
          }}>
            <Typography variant="body2">
              Suggest an image showing an example of the topic in action
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default VisualElementsTab;
