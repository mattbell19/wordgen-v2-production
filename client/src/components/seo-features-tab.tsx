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
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

interface SeoFeatures {
  tableOfContents: boolean;
  faqSection: boolean;
  relatedTopics: boolean;
  metaDescription: boolean;
}

interface SeoFeaturesTabProps {
  seoFeatures: SeoFeatures;
  onChange: (seoFeatures: SeoFeatures) => void;
}

const SeoFeaturesTab: React.FC<SeoFeaturesTabProps> = ({
  seoFeatures,
  onChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    onChange({
      ...seoFeatures,
      [name]: checked,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        SEO Features
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customize which SEO features to include in your article to improve search engine visibility.
      </Typography>

      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', mb: 3 }}>
        <FormControl component="fieldset" variant="standard">
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={seoFeatures.tableOfContents}
                  onChange={handleChange}
                  name="tableOfContents"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1">Table of Contents</Typography>
                  <Tooltip title="Adds a navigable table of contents at the beginning of the article, which helps with user experience and SEO.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Structured navigation for longer articles
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={seoFeatures.faqSection}
                  onChange={handleChange}
                  name="faqSection"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1">FAQ Section</Typography>
                  <Tooltip title="Adds a frequently asked questions section with proper schema markup that can appear in Google's rich results.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              Frequently asked questions with schema markup
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={seoFeatures.relatedTopics}
                  onChange={handleChange}
                  name="relatedTopics"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1">Related Topics</Typography>
                  <Tooltip title="Adds a section with related keywords and topics that helps with semantic SEO and internal linking opportunities.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              LSI keywords and related concepts
            </Typography>
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={seoFeatures.metaDescription}
                  onChange={handleChange}
                  name="metaDescription"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body1">Meta Description Suggestion</Typography>
                  <Tooltip title="Adds a suggested meta description at the end of the article that you can use for your page's SEO.">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
              SEO-optimized description suggestion
            </Typography>
          </FormGroup>
          <FormHelperText>
            These features can significantly improve your article's search engine visibility
          </FormHelperText>
        </FormControl>
      </Paper>

      <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          SEO Benefits
        </Typography>
        <Typography variant="body2">
          • <strong>Table of Contents:</strong> Improves navigation and user experience
        </Typography>
        <Typography variant="body2">
          • <strong>FAQ Section:</strong> Can appear in Google's rich results
        </Typography>
        <Typography variant="body2">
          • <strong>Related Topics:</strong> Helps with semantic SEO and topic clustering
        </Typography>
        <Typography variant="body2">
          • <strong>Meta Description:</strong> Improves click-through rates from search results
        </Typography>
      </Box>
    </Box>
  );
};

export default SeoFeaturesTab;
