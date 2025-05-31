# Article Writer Testing Tools

This directory contains tools for testing and analyzing the Article Writer feature. These tools help verify the functionality and quality of the content generation, visual elements, and styling improvements.

## Available Tools

### 1. Article Generation Test Script

**File:** `scripts/test-article-generation.js`

This script generates test articles with different keywords, tones, and word counts to verify the content quality improvements. It creates a comprehensive test report that shows how well the article generation is working.

#### Features:
- Generates articles with different keywords and settings
- Saves articles as HTML files for easy viewing
- Analyzes the presence of visual elements and SEO features
- Creates a detailed test report with statistics

#### Requirements:
- Node.js 14+
- `node-fetch` package
- Access to a running instance of the application

#### Usage:

```bash
# Install dependencies
npm install node-fetch

# Set environment variables for authentication
export TEST_USER_EMAIL=your-test-email@example.com
export TEST_USER_PASSWORD=your-test-password

# Run the test script
node scripts/test-article-generation.js
```

The script will:
1. Log in to the application
2. Generate articles for each test keyword
3. Save the articles to the `test-results` directory
4. Create a test report at `test-results/test-report.html`

### 2. Visual Element Analyzer

**File:** `scripts/analyze-visual-elements.js`

This tool analyzes the visual elements in generated articles and provides statistics on their usage and effectiveness. It creates a detailed report with charts and examples.

#### Features:
- Analyzes the presence and frequency of visual elements
- Provides statistics on content structure
- Shows examples of each visual element
- Creates charts to visualize the data

#### Requirements:
- Node.js 14+
- `cheerio` package
- Generated articles from the test script

#### Usage:

```bash
# Install dependencies
npm install cheerio

# Run the analyzer
node scripts/analyze-visual-elements.js
```

The analyzer will:
1. Read the HTML files in the `test-results` directory
2. Parse and analyze the visual elements
3. Create an analysis report at `test-results/visual-elements-analysis.html`

## Test Results Directory

The `test-results` directory contains:
- Generated test articles as HTML files
- Test report (`test-report.html`)
- Visual element analysis report (`visual-elements-analysis.html`)

## Testing Workflow

1. **Generate Test Articles:**
   - Run `test-article-generation.js` to generate test articles
   - Review the test report to identify any issues

2. **Analyze Visual Elements:**
   - Run `analyze-visual-elements.js` to analyze the visual elements
   - Review the analysis report to identify areas for improvement

3. **Manual Review:**
   - Open the generated HTML files to manually review the articles
   - Check for any rendering issues or content quality problems

4. **Iterate and Improve:**
   - Make changes to the article generation prompt or styling
   - Run the tests again to verify improvements

## Interpreting Test Results

### Test Report

The test report shows:
- Basic information about each generated article
- The presence of visual elements in each article
- The structure of each article (introduction, what is, why matters, etc.)
- The presence of SEO features (TOC, FAQ, related topics, etc.)

### Visual Element Analysis

The visual element analysis shows:
- Average number of each visual element per article
- Presence rate of SEO features
- Analysis of heading structure
- Common section types
- Examples of each visual element

## Troubleshooting

If you encounter issues:

1. **Authentication Errors:**
   - Check that you've set the correct environment variables
   - Verify that the test user has the necessary permissions

2. **No Articles Generated:**
   - Check that the application is running
   - Verify that the API endpoints are accessible
   - Check for rate limiting or quota issues

3. **Missing Visual Elements:**
   - Review the article generation prompt
   - Check the CSS styling for visual elements
   - Verify that the article content is being properly rendered
