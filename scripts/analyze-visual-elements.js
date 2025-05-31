/**
 * Visual Element Analyzer Tool
 * 
 * This script analyzes the visual elements in generated articles
 * and provides statistics on their usage and effectiveness.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// Configuration
const TEST_RESULTS_DIR = path.join(__dirname, '../test-results');
const OUTPUT_FILE = path.join(TEST_RESULTS_DIR, 'visual-elements-analysis.html');

// Ensure output directory exists
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

// Get all HTML files in the test results directory
function getHtmlFiles() {
  return fs.readdirSync(TEST_RESULTS_DIR)
    .filter(file => file.endsWith('.html') && file !== 'test-report.html' && file !== 'visual-elements-analysis.html');
}

// Parse article HTML and extract visual elements
function parseArticle(filePath) {
  const html = fs.readFileSync(path.join(TEST_RESULTS_DIR, filePath), 'utf8');
  const $ = cheerio.load(html);
  
  // Extract test info
  const keyword = $('.test-info p:nth-child(2)').text().replace('Keyword:', '').trim();
  const tone = $('.test-info p:nth-child(3)').text().replace('Tone:', '').trim();
  const wordCount = parseInt($('.test-info p:nth-child(4)').text().replace('Word Count:', '').trim());
  
  // Extract visual elements
  const articleContent = $('.article-content');
  
  const elements = {
    quickTakeaways: articleContent.find('.quick-takeaway').map((i, el) => $(el).html()).get(),
    proTips: articleContent.find('.pro-tip').map((i, el) => $(el).html()).get(),
    statHighlights: articleContent.find('.stat-highlight').map((i, el) => $(el).html()).get(),
    comparisonTables: articleContent.find('.comparison-table').map((i, el) => $(el).html()).get(),
    calloutBoxes: articleContent.find('.callout-box').map((i, el) => $(el).html()).get(),
    imageSuggestions: articleContent.find('.image-suggestion').map((i, el) => $(el).html()).get(),
    toc: articleContent.find('.article-toc').html(),
    faq: articleContent.find('.article-faq').html(),
    relatedTopics: articleContent.find('.related-keywords').html(),
    metaSuggestion: articleContent.find('.meta-suggestion').html(),
    cta: articleContent.find('.call-to-action').html()
  };
  
  // Extract headings to analyze structure
  const headings = {
    h1: articleContent.find('h1').map((i, el) => $(el).text()).get(),
    h2: articleContent.find('h2').map((i, el) => $(el).text()).get(),
    h3: articleContent.find('h3').map((i, el) => $(el).text()).get()
  };
  
  return {
    fileName: filePath,
    keyword,
    tone,
    wordCount,
    elements,
    headings
  };
}

// Analyze visual elements across all articles
function analyzeVisualElements(articles) {
  // Calculate statistics
  const stats = {
    totalArticles: articles.length,
    elementCounts: {
      quickTakeaways: articles.reduce((sum, article) => sum + article.elements.quickTakeaways.length, 0),
      proTips: articles.reduce((sum, article) => sum + article.elements.proTips.length, 0),
      statHighlights: articles.reduce((sum, article) => sum + article.elements.statHighlights.length, 0),
      comparisonTables: articles.reduce((sum, article) => sum + article.elements.comparisonTables.length, 0),
      calloutBoxes: articles.reduce((sum, article) => sum + article.elements.calloutBoxes.length, 0),
      imageSuggestions: articles.reduce((sum, article) => sum + article.elements.imageSuggestions.length, 0)
    },
    elementPresence: {
      toc: articles.filter(article => article.elements.toc).length,
      faq: articles.filter(article => article.elements.faq).length,
      relatedTopics: articles.filter(article => article.elements.relatedTopics).length,
      metaSuggestion: articles.filter(article => article.elements.metaSuggestion).length,
      cta: articles.filter(article => article.elements.cta).length
    },
    averages: {}
  };
  
  // Calculate averages
  stats.averages.quickTakeaways = stats.elementCounts.quickTakeaways / stats.totalArticles;
  stats.averages.proTips = stats.elementCounts.proTips / stats.totalArticles;
  stats.averages.statHighlights = stats.elementCounts.statHighlights / stats.totalArticles;
  stats.averages.comparisonTables = stats.elementCounts.comparisonTables / stats.totalArticles;
  stats.averages.calloutBoxes = stats.elementCounts.calloutBoxes / stats.totalArticles;
  stats.averages.imageSuggestions = stats.elementCounts.imageSuggestions / stats.totalArticles;
  
  // Analyze heading structure
  const structureAnalysis = {
    hasProperH1: articles.filter(article => article.headings.h1.length === 1).length,
    averageH2Count: articles.reduce((sum, article) => sum + article.headings.h2.length, 0) / stats.totalArticles,
    averageH3Count: articles.reduce((sum, article) => sum + article.headings.h3.length, 0) / stats.totalArticles,
    commonH2Sections: {}
  };
  
  // Identify common H2 sections
  const allH2Headings = articles.flatMap(article => article.headings.h2);
  const h2Counts = {};
  
  allH2Headings.forEach(heading => {
    // Normalize heading by converting to lowercase and removing punctuation
    const normalizedHeading = heading.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Check for common section patterns
    if (normalizedHeading.includes('what is') || normalizedHeading.includes('what are')) {
      h2Counts['What is/are'] = (h2Counts['What is/are'] || 0) + 1;
    } else if (normalizedHeading.includes('why') && (normalizedHeading.includes('matter') || normalizedHeading.includes('important'))) {
      h2Counts['Why it Matters'] = (h2Counts['Why it Matters'] || 0) + 1;
    } else if (normalizedHeading.includes('how to') || normalizedHeading.includes('best practice')) {
      h2Counts['How to/Best Practices'] = (h2Counts['How to/Best Practices'] || 0) + 1;
    } else if (normalizedHeading.includes('challenge') || normalizedHeading.includes('faq')) {
      h2Counts['Challenges/FAQ'] = (h2Counts['Challenges/FAQ'] || 0) + 1;
    } else if (normalizedHeading.includes('conclusion')) {
      h2Counts['Conclusion'] = (h2Counts['Conclusion'] || 0) + 1;
    } else {
      h2Counts[normalizedHeading] = (h2Counts[normalizedHeading] || 0) + 1;
    }
  });
  
  // Sort by frequency
  const sortedH2Counts = Object.entries(h2Counts)
    .sort((a, b) => b[1] - a[1])
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  
  structureAnalysis.commonH2Sections = sortedH2Counts;
  
  return {
    stats,
    structureAnalysis,
    articles
  };
}

// Generate HTML report
function generateReport(analysis) {
  const { stats, structureAnalysis, articles } = analysis;
  
  const reportContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Elements Analysis</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #333;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .summary {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .chart-container {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .chart {
      width: 48%;
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .element-example {
      background-color: #f0f0f0;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 5px;
      max-height: 300px;
      overflow-y: auto;
    }
    .progress-bar {
      background-color: #e0e0e0;
      height: 20px;
      border-radius: 10px;
      margin-bottom: 10px;
    }
    .progress-bar-fill {
      background-color: #4CAF50;
      height: 100%;
      border-radius: 10px;
      text-align: center;
      color: white;
      font-weight: bold;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <h1>Visual Elements Analysis</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Articles Analyzed:</strong> ${stats.totalArticles}</p>
    <p><strong>Analysis Date:</strong> ${new Date().toLocaleString()}</p>
  </div>
  
  <h2>Visual Elements Statistics</h2>
  
  <div class="chart-container">
    <div class="chart">
      <canvas id="elementsChart"></canvas>
    </div>
    <div class="chart">
      <canvas id="presenceChart"></canvas>
    </div>
  </div>
  
  <h3>Average Elements Per Article</h3>
  <table>
    <thead>
      <tr>
        <th>Element Type</th>
        <th>Average Count</th>
        <th>Total Count</th>
        <th>Presence Rate</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Quick Takeaways</td>
        <td>${stats.averages.quickTakeaways.toFixed(2)}</td>
        <td>${stats.elementCounts.quickTakeaways}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.elementCounts.quickTakeaways > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100}%">
              ${((stats.elementCounts.quickTakeaways > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Pro Tips</td>
        <td>${stats.averages.proTips.toFixed(2)}</td>
        <td>${stats.elementCounts.proTips}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.elementCounts.proTips > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100}%">
              ${((stats.elementCounts.proTips > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Stat Highlights</td>
        <td>${stats.averages.statHighlights.toFixed(2)}</td>
        <td>${stats.elementCounts.statHighlights}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.elementCounts.statHighlights > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100}%">
              ${((stats.elementCounts.statHighlights > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Comparison Tables</td>
        <td>${stats.averages.comparisonTables.toFixed(2)}</td>
        <td>${stats.elementCounts.comparisonTables}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.elementCounts.comparisonTables > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100}%">
              ${((stats.elementCounts.comparisonTables > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Callout Boxes</td>
        <td>${stats.averages.calloutBoxes.toFixed(2)}</td>
        <td>${stats.elementCounts.calloutBoxes}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.elementCounts.calloutBoxes > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100}%">
              ${((stats.elementCounts.calloutBoxes > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Image Suggestions</td>
        <td>${stats.averages.imageSuggestions.toFixed(2)}</td>
        <td>${stats.elementCounts.imageSuggestions}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${(stats.elementCounts.imageSuggestions > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100}%">
              ${((stats.elementCounts.imageSuggestions > 0 ? stats.totalArticles : 0) / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  
  <h3>SEO Feature Presence</h3>
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Present in # Articles</th>
        <th>Presence Rate</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Table of Contents</td>
        <td>${stats.elementPresence.toc}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${stats.elementPresence.toc / stats.totalArticles * 100}%">
              ${(stats.elementPresence.toc / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>FAQ Section</td>
        <td>${stats.elementPresence.faq}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${stats.elementPresence.faq / stats.totalArticles * 100}%">
              ${(stats.elementPresence.faq / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Related Topics</td>
        <td>${stats.elementPresence.relatedTopics}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${stats.elementPresence.relatedTopics / stats.totalArticles * 100}%">
              ${(stats.elementPresence.relatedTopics / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Meta Description Suggestion</td>
        <td>${stats.elementPresence.metaSuggestion}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${stats.elementPresence.metaSuggestion / stats.totalArticles * 100}%">
              ${(stats.elementPresence.metaSuggestion / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td>Call to Action</td>
        <td>${stats.elementPresence.cta}</td>
        <td>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${stats.elementPresence.cta / stats.totalArticles * 100}%">
              ${(stats.elementPresence.cta / stats.totalArticles * 100).toFixed(0)}%
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
  
  <h2>Article Structure Analysis</h2>
  
  <h3>Heading Structure</h3>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Articles with Proper H1 (exactly one)</td>
        <td>${structureAnalysis.hasProperH1} (${(structureAnalysis.hasProperH1 / stats.totalArticles * 100).toFixed(0)}%)</td>
      </tr>
      <tr>
        <td>Average H2 Headings Per Article</td>
        <td>${structureAnalysis.averageH2Count.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Average H3 Headings Per Article</td>
        <td>${structureAnalysis.averageH3Count.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  
  <h3>Common H2 Sections</h3>
  <table>
    <thead>
      <tr>
        <th>Section Type</th>
        <th>Occurrence Count</th>
        <th>Occurrence Rate</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(structureAnalysis.commonH2Sections)
        .map(([section, count]) => `
          <tr>
            <td>${section}</td>
            <td>${count}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-bar-fill" style="width: ${count / stats.totalArticles * 100}%">
                  ${(count / stats.totalArticles * 100).toFixed(0)}%
                </div>
              </div>
            </td>
          </tr>
        `).join('')}
    </tbody>
  </table>
  
  <h2>Element Examples</h2>
  
  <h3>Quick Takeaway Example</h3>
  <div class="element-example">
    ${articles.find(a => a.elements.quickTakeaways.length > 0)?.elements.quickTakeaways[0] || 'No examples found'}
  </div>
  
  <h3>Pro Tip Example</h3>
  <div class="element-example">
    ${articles.find(a => a.elements.proTips.length > 0)?.elements.proTips[0] || 'No examples found'}
  </div>
  
  <h3>Stat Highlight Example</h3>
  <div class="element-example">
    ${articles.find(a => a.elements.statHighlights.length > 0)?.elements.statHighlights[0] || 'No examples found'}
  </div>
  
  <h3>Comparison Table Example</h3>
  <div class="element-example">
    ${articles.find(a => a.elements.comparisonTables.length > 0)?.elements.comparisonTables[0] || 'No examples found'}
  </div>
  
  <h3>Callout Box Example</h3>
  <div class="element-example">
    ${articles.find(a => a.elements.calloutBoxes.length > 0)?.elements.calloutBoxes[0] || 'No examples found'}
  </div>
  
  <h3>Image Suggestion Example</h3>
  <div class="element-example">
    ${articles.find(a => a.elements.imageSuggestions.length > 0)?.elements.imageSuggestions[0] || 'No examples found'}
  </div>
  
  <script>
    // Create charts
    document.addEventListener('DOMContentLoaded', function() {
      // Elements per article chart
      const elementsCtx = document.getElementById('elementsChart').getContext('2d');
      new Chart(elementsCtx, {
        type: 'bar',
        data: {
          labels: ['Quick Takeaways', 'Pro Tips', 'Stat Highlights', 'Comparison Tables', 'Callout Boxes', 'Image Suggestions'],
          datasets: [{
            label: 'Average per Article',
            data: [
              ${stats.averages.quickTakeaways.toFixed(2)},
              ${stats.averages.proTips.toFixed(2)},
              ${stats.averages.statHighlights.toFixed(2)},
              ${stats.averages.comparisonTables.toFixed(2)},
              ${stats.averages.calloutBoxes.toFixed(2)},
              ${stats.averages.imageSuggestions.toFixed(2)}
            ],
            backgroundColor: [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 159, 64, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(255, 205, 86, 0.6)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 205, 86, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Average Visual Elements per Article'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      // Feature presence chart
      const presenceCtx = document.getElementById('presenceChart').getContext('2d');
      new Chart(presenceCtx, {
        type: 'pie',
        data: {
          labels: ['Table of Contents', 'FAQ Section', 'Related Topics', 'Meta Description', 'Call to Action'],
          datasets: [{
            label: 'Presence Rate',
            data: [
              ${stats.elementPresence.toc},
              ${stats.elementPresence.faq},
              ${stats.elementPresence.relatedTopics},
              ${stats.elementPresence.metaSuggestion},
              ${stats.elementPresence.cta}
            ],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(255, 205, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 205, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'SEO Feature Presence'
            }
          }
        }
      });
    });
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync(OUTPUT_FILE, reportContent);
  console.log(`Analysis report saved to ${OUTPUT_FILE}`);
  
  return OUTPUT_FILE;
}

// Main function
function main() {
  try {
    console.log('Starting visual element analysis...');
    
    // Get HTML files
    const htmlFiles = getHtmlFiles();
    console.log(`Found ${htmlFiles.length} HTML files to analyze.`);
    
    if (htmlFiles.length === 0) {
      console.log('No HTML files found. Run test-article-generation.js first.');
      return;
    }
    
    // Parse and analyze articles
    const articles = htmlFiles.map(file => parseArticle(file));
    const analysis = analyzeVisualElements(articles);
    
    // Generate report
    const reportPath = generateReport(analysis);
    
    console.log('Analysis completed successfully!');
    console.log(`Open ${reportPath} to view the analysis report.`);
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

// Run the main function
main();
