# LLM Brand Ranking Prototype - Example Queries and Responses

## Sample Brand Analysis Session

### Scenario
**User**: Marketing manager at "TechFlow" (project management software)
**Competitors**: Asana, Monday.com, Trello, Notion
**Industry**: Project Management Software

## Query Templates and Expected Responses

### 1. Recommendation Query
**Template**: "What are the top 5 project management tools you'd recommend for a growing tech company?"

#### OpenAI Response Example:
```
For a growing tech company, I'd recommend these project management tools:

1. **Asana** - Excellent for team collaboration with robust task management
2. **Monday.com** - Great visual interface and customizable workflows  
3. **Notion** - All-in-one workspace combining docs, databases, and project tracking
4. **TechFlow** - Strong automation features and developer-friendly integrations
5. **Trello** - Simple Kanban-style boards, perfect for smaller teams

Each offers different strengths depending on your team size and workflow preferences.
```

**Extracted Rankings**:
- Asana: Position 1, Score 100
- Monday.com: Position 2, Score 90  
- Notion: Position 3, Score 80
- **TechFlow: Position 4, Score 70** ⭐
- Trello: Position 5, Score 60

#### Claude Response Example:
```
Here are my top recommendations for project management tools:

1. **Notion** - Versatile all-in-one workspace with excellent documentation
2. **TechFlow** - Superior automation and API integrations for technical teams
3. **Asana** - Strong task management with good team collaboration features
4. **Monday.com** - Intuitive interface with powerful workflow automation
5. **ClickUp** - Feature-rich with good customization options

Consider your team's technical expertise and workflow complexity when choosing.
```

**Extracted Rankings**:
- Notion: Position 1, Score 100
- **TechFlow: Position 2, Score 90** ⭐
- Asana: Position 3, Score 80
- Monday.com: Position 4, Score 70
- ClickUp: Position 5, Score 60

### 2. Comparison Query
**Template**: "Compare TechFlow vs Asana for software development teams"

#### OpenAI Response:
```
**TechFlow vs Asana for Software Development Teams:**

**TechFlow Advantages:**
- Native Git integration and developer-focused features
- Advanced automation for CI/CD workflows  
- Better API documentation and extensibility
- Code review integration

**Asana Advantages:**
- More mature platform with extensive integrations
- Better project templates and goal tracking
- Stronger mobile experience
- More comprehensive reporting

For development teams, **TechFlow** edges out slightly due to its technical focus, while **Asana** is better for mixed technical/non-technical teams.
```

**Analysis Results**:
- **TechFlow**: Positive sentiment (+0.7), Strong technical positioning
- **Asana**: Positive sentiment (+0.6), Broader appeal noted

### 3. Industry Leadership Query
**Template**: "Who are the current leaders in project management software?"

#### Gemini Response:
```
The project management software landscape has several established leaders:

**Enterprise Leaders:**
- Microsoft Project - Traditional enterprise standard
- Smartsheet - Enterprise-grade with advanced features

**Modern SaaS Leaders:**
- Asana - Strong market presence and user adoption
- Monday.com - Rapid growth and visual workflow focus
- Atlassian (Jira) - Developer-focused project management

**Emerging Players:**
- TechFlow - Growing reputation in developer communities
- Notion - Expanding from documentation to project management
- Linear - Gaining traction with engineering teams

The market is quite competitive with different tools serving different niches.
```

**Brand Mention Analysis**:
- **TechFlow**: Position 6, "Growing reputation" (Positive sentiment +0.5)
- Asana: Position 3, "Strong market presence" (Positive sentiment +0.8)
- Monday.com: Position 4, "Rapid growth" (Positive sentiment +0.7)

## Ranking Score Calculation

### TechFlow Performance Summary

| LLM Provider | Query Type | Position | Mention Count | Sentiment | Final Score |
|--------------|------------|----------|---------------|-----------|-------------|
| OpenAI | Recommendation | 4 | 1 | +0.6 | 72 |
| Claude | Recommendation | 2 | 1 | +0.8 | 88 |
| OpenAI | Comparison | N/A | 8 | +0.7 | 85 |
| Gemini | Leadership | 6 | 1 | +0.5 | 58 |

**Overall Brand Score**: 75.8/100
**Rank vs Competitors**: #3 (behind Asana #1, Monday.com #2)

## Insights Generated

### Strengths Identified
1. **Technical Positioning**: Strong performance in developer-focused queries
2. **Feature Recognition**: Automation and API capabilities frequently mentioned
3. **Growing Reputation**: Positioned as "emerging" rather than established

### Opportunities
1. **Broader Market Appeal**: Improve positioning for non-technical teams
2. **Brand Awareness**: Increase visibility in general PM tool discussions  
3. **Market Position**: Work to move from "emerging" to "established" category

### Competitive Analysis
- **vs Asana**: Behind in general recommendations, but competitive in dev-focused scenarios
- **vs Monday.com**: Similar scores but different positioning (technical vs visual)
- **vs Notion**: Both positioned as "emerging" but in different categories

## Automated Alerts That Would Trigger

1. **Ranking Change**: TechFlow moved from position 5 to position 2 in Claude recommendations
2. **New Competitor**: ClickUp appeared in Claude response (auto-add to competitor list?)
3. **Sentiment Shift**: Positive mention of "growing reputation" in leadership context
4. **Missing Mention**: Not mentioned in 30% of general PM tool queries

## Dashboard Visualization Ideas

### 1. Brand Performance Radar Chart
```
     Technical Focus (90%)
            /|\
           / | \
  API/Dev /  |  \ Market Position (60%)
    (85%) |  |  |
          \  |  /
           \ | /
    Automation (80%) - Overall Score (75.8%)
```

### 2. Competitive Position Matrix
```
Market Position (High/Low) vs Technical Focus (High/Low)

High Market Position
    |
    |   Asana        Monday.com
    |     ●             ●
    |
    |
----|--------------------------> High Technical Focus
    |
    | Trello           TechFlow
    |   ●                ●
    |
Low Market Position
```

### 3. Trend Line (Hypothetical)
```
Brand Score Over Time:
80 |                    ●
75 |               ●   /
70 |          ●   /   /
65 |     ●   /   /   /
60 | ●  /   /   /   /
   |___________________
   Jan Feb Mar Apr May
```

This prototype demonstrates how the LLM Brand Ranking system would process real queries, extract meaningful data, and provide actionable insights for brand managers and marketing teams. 