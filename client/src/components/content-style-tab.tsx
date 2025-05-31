import React from 'react';
import {
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Typography,
  Slider,
  Grid,
} from '@mui/material';

interface ContentStyle {
  tone: string;
  readingLevel: string;
  contentDensity: number;
  targetAudience: string;
}

interface ContentStyleTabProps {
  contentStyle: ContentStyle;
  onChange: (contentStyle: ContentStyle) => void;
}

const ContentStyleTab: React.FC<ContentStyleTabProps> = ({
  contentStyle,
  onChange,
}) => {
  const handleSelectChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    onChange({
      ...contentStyle,
      [name]: value,
    });
  };

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    onChange({
      ...contentStyle,
      contentDensity: newValue as number,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Content Style
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customize the tone, style, and target audience for your article.
      </Typography>

      <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper', mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
              <InputLabel id="tone-label">Tone</InputLabel>
              <Select
                labelId="tone-label"
                id="tone"
                name="tone"
                value={contentStyle.tone}
                onChange={handleSelectChange}
                label="Tone"
              >
                <MenuItem value="professional">Professional</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="friendly">Friendly</MenuItem>
                <MenuItem value="authoritative">Authoritative</MenuItem>
                <MenuItem value="conversational">Conversational</MenuItem>
                <MenuItem value="educational">Educational</MenuItem>
                <MenuItem value="persuasive">Persuasive</MenuItem>
              </Select>
              <FormHelperText>
                The overall tone of voice for your article
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
              <InputLabel id="reading-level-label">Reading Level</InputLabel>
              <Select
                labelId="reading-level-label"
                id="readingLevel"
                name="readingLevel"
                value={contentStyle.readingLevel}
                onChange={handleSelectChange}
                label="Reading Level"
              >
                <MenuItem value="basic">Basic (Grade 6-8)</MenuItem>
                <MenuItem value="intermediate">Intermediate (Grade 9-12)</MenuItem>
                <MenuItem value="advanced">Advanced (College Level)</MenuItem>
                <MenuItem value="expert">Expert (Specialized Knowledge)</MenuItem>
              </Select>
              <FormHelperText>
                The complexity level of the language used
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography id="content-density-slider" gutterBottom>
              Content Density
            </Typography>
            <Slider
              value={contentStyle.contentDensity}
              onChange={handleSliderChange}
              aria-labelledby="content-density-slider"
              valueLabelDisplay="auto"
              step={1}
              marks={[
                {
                  value: 1,
                  label: 'Concise',
                },
                {
                  value: 3,
                  label: 'Balanced',
                },
                {
                  value: 5,
                  label: 'Comprehensive',
                },
              ]}
              min={1}
              max={5}
            />
            <FormHelperText>
              Adjust how detailed and in-depth the content should be
            </FormHelperText>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth variant="outlined" sx={{ mt: 2 }}>
              <InputLabel id="target-audience-label">Target Audience</InputLabel>
              <Select
                labelId="target-audience-label"
                id="targetAudience"
                name="targetAudience"
                value={contentStyle.targetAudience}
                onChange={handleSelectChange}
                label="Target Audience"
              >
                <MenuItem value="beginners">Beginners (New to the topic)</MenuItem>
                <MenuItem value="intermediate">Intermediate (Some knowledge)</MenuItem>
                <MenuItem value="advanced">Advanced (Experienced users)</MenuItem>
                <MenuItem value="experts">Experts (Professional level)</MenuItem>
                <MenuItem value="general">General Audience (Mixed knowledge levels)</MenuItem>
              </Select>
              <FormHelperText>
                Who the article is primarily written for
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Style Preview
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Tone:</strong> {contentStyle.tone.charAt(0).toUpperCase() + contentStyle.tone.slice(1)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Reading Level:</strong> {contentStyle.readingLevel.charAt(0).toUpperCase() + contentStyle.readingLevel.slice(1)}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Content Density:</strong> {
            contentStyle.contentDensity === 1 ? 'Concise' :
            contentStyle.contentDensity === 2 ? 'Somewhat Concise' :
            contentStyle.contentDensity === 3 ? 'Balanced' :
            contentStyle.contentDensity === 4 ? 'Somewhat Comprehensive' :
            'Comprehensive'
          }
        </Typography>
        <Typography variant="body2">
          <strong>Target Audience:</strong> {contentStyle.targetAudience.charAt(0).toUpperCase() + contentStyle.targetAudience.slice(1)}
        </Typography>
      </Box>
    </Box>
  );
};

export default ContentStyleTab;
