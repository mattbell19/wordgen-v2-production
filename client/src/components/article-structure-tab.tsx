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

interface ArticleStructureTabProps {
  sections: ArticleStructureSections;
  onChange: (sections: ArticleStructureSections) => void;
}

const ArticleStructureTab: React.FC<ArticleStructureTabProps> = ({
  sections,
  onChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    onChange({
      ...sections,
      [name]: checked,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Article Sections
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customize which sections to include in your article. Introduction and Conclusion are always included.
      </Typography>

      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', mb: 3 }}>
        <FormControl component="fieldset" variant="standard">
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={true}
                  disabled
                  name="introduction"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Introduction</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Opening paragraph that introduces the topic
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.whatIs}
                  onChange={handleChange}
                  name="whatIs"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">What is [Topic]</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Definition and explanation of the main concept
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.whyMatters}
                  onChange={handleChange}
                  name="whyMatters"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Why [Topic] Matters</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Benefits and importance of the topic
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.howTo}
                  onChange={handleChange}
                  name="howTo"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">How to Use [Topic]</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Implementation steps and practical guidance
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.bestPractices}
                  onChange={handleChange}
                  name="bestPractices"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Best Practices</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tips and recommendations for optimal results
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.challenges}
                  onChange={handleChange}
                  name="challenges"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Common Challenges</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Problems and solutions related to the topic
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.caseStudies}
                  onChange={handleChange}
                  name="caseStudies"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Case Studies/Examples</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Real-world applications and examples
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.comparison}
                  onChange={handleChange}
                  name="comparison"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Comparison</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comparing with alternatives or competitors
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={sections.futureTrends}
                  onChange={handleChange}
                  name="futureTrends"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Future Trends</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming developments and predictions
                  </Typography>
                </Box>
              }
            />
            <Divider sx={{ my: 1 }} />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={true}
                  disabled
                  name="conclusion"
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Conclusion</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Summary and closing thoughts
                  </Typography>
                </Box>
              }
            />
          </FormGroup>
          <FormHelperText>
            Select at least 2 sections for a well-structured article
          </FormHelperText>
        </FormControl>
      </Paper>
    </Box>
  );
};

export default ArticleStructureTab;
