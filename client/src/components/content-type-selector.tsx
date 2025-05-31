import React from 'react';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
} from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import MenuBookIcon from '@mui/icons-material/MenuBook';

interface ContentType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
}

interface ContentTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelectContentType: (contentTypeId: string) => void;
}

const contentTypes: ContentType[] = [
  {
    id: 'how-to',
    name: 'How-To Guide',
    description: 'Step-by-step instructions to help readers accomplish a specific task.',
    icon: <HelpOutlineIcon sx={{ fontSize: 60, color: '#2196f3' }} />,
    examples: [
      'How to Create a Social Media Strategy',
      'How to Train for a Marathon',
      'How to Start Investing in Stocks'
    ]
  },
  {
    id: 'product-review',
    name: 'Product Review',
    description: 'Detailed evaluation of a product or service with pros, cons, and recommendations.',
    icon: <ShoppingCartIcon sx={{ fontSize: 60, color: '#f44336' }} />,
    examples: [
      'Best Coffee Machines for Home Use',
      'Top 10 Project Management Tools Compared',
      'iPhone 14 Pro Review: Is It Worth the Upgrade?'
    ]
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: 'Article organized as a numbered or bulleted list of items or tips.',
    icon: <ListAltIcon sx={{ fontSize: 60, color: '#4caf50' }} />,
    examples: [
      '10 Ways to Improve Your SEO Rankings',
      '7 Habits of Highly Effective People',
      '15 Must-Visit Destinations in Europe'
    ]
  },
  {
    id: 'industry-guide',
    name: 'Industry Guide',
    description: 'Comprehensive overview of an industry, trend, or complex topic.',
    icon: <MenuBookIcon sx={{ fontSize: 60, color: '#9c27b0' }} />,
    examples: [
      'The Complete Guide to Artificial Intelligence',
      'Understanding Blockchain Technology',
      'Digital Marketing in 2023: Trends and Predictions'
    ]
  }
];

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  open,
  onClose,
  onSelectContentType,
}) => {
  const handleSelectContentType = (contentTypeId: string) => {
    onSelectContentType(contentTypeId);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="content-type-selector-title"
    >
      <DialogTitle id="content-type-selector-title">
        <Typography variant="h6">Choose a Content Type</Typography>
        <Typography variant="body2" color="text.secondary">
          Select the type of content you want to create to get an optimized article structure
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={2}>
          {contentTypes.map((contentType) => (
            <Grid item xs={12} sm={6} key={contentType.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => handleSelectContentType(contentType.id)}
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                    {contentType.icon}
                  </Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="div">
                      {contentType.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {contentType.description}
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Examples:
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, mt: 0 }}>
                      {contentType.examples.map((example, index) => (
                        <Typography component="li" variant="body2" key={index}>
                          {example}
                        </Typography>
                      ))}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContentTypeSelector;
