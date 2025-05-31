# Article Structure Customization Testing Guide

This document provides instructions for testing the Article Structure Customization feature to ensure it works correctly.

## Prerequisites

- Local development environment set up
- Access to the Article Writer feature

## Test Cases

### Test Case 1: UI Components Rendering

**Objective:** Verify that all UI components for article structure customization render correctly.

**Steps:**
1. Navigate to the Article Writer page
2. Click the "Settings" button
3. Verify that the "Customize Article Structure" button is visible
4. Click the "Customize Article Structure" button
5. Verify that the structure settings dialog opens with the following tabs:
   - Sections
   - Visual Elements
   - SEO Features
   - Style
6. Verify that the structure preview is visible on the right side (on desktop)
7. Verify that the saved templates dropdown is visible at the top

**Expected Results:**
- All UI components render without errors
- The structure settings dialog displays all tabs correctly
- The structure preview updates when settings are changed
- The saved templates dropdown works correctly

### Test Case 2: Section Selection

**Objective:** Verify that section selection works correctly.

**Steps:**
1. Open the structure settings dialog
2. Go to the "Sections" tab
3. Toggle various sections on and off
4. Observe the structure preview updating
5. Save the settings
6. Generate an article
7. Verify that the generated article includes only the selected sections

**Expected Results:**
- The structure preview updates to show only selected sections
- The generated article includes only the selected sections
- Introduction and Conclusion are always included (cannot be toggled off)

### Test Case 3: Visual Elements Customization

**Objective:** Verify that visual elements customization works correctly.

**Steps:**
1. Open the structure settings dialog
2. Go to the "Visual Elements" tab
3. Toggle various visual elements on and off
4. Observe the preview of visual elements
5. Save the settings
6. Generate an article
7. Verify that the generated article includes only the selected visual elements

**Expected Results:**
- The visual elements preview updates to show only selected elements
- The generated article includes only the selected visual elements

### Test Case 4: SEO Features Customization

**Objective:** Verify that SEO features customization works correctly.

**Steps:**
1. Open the structure settings dialog
2. Go to the "SEO Features" tab
3. Toggle various SEO features on and off
4. Save the settings
5. Generate an article
6. Verify that the generated article includes only the selected SEO features

**Expected Results:**
- The generated article includes only the selected SEO features
- Table of Contents is only included when selected
- FAQ section is only included when selected
- Related Topics is only included when selected
- Meta Description suggestion is only included when selected

### Test Case 5: Content Style Customization

**Objective:** Verify that content style customization works correctly.

**Steps:**
1. Open the structure settings dialog
2. Go to the "Style" tab
3. Change the tone, reading level, content density, and target audience
4. Observe the style preview updating
5. Save the settings
6. Generate an article
7. Verify that the generated article matches the selected style

**Expected Results:**
- The style preview updates to reflect the selected options
- The generated article matches the selected tone
- The content complexity matches the selected reading level
- The content depth matches the selected content density
- The content is appropriate for the selected target audience

### Test Case 6: Template Saving and Loading

**Objective:** Verify that template saving and loading works correctly.

**Steps:**
1. Open the structure settings dialog
2. Customize various settings
3. Click the "Save" button in the templates dropdown
4. Enter a name for the template
5. Save the template
6. Change some settings
7. Select the saved template from the dropdown
8. Verify that the settings are restored to the saved values

**Expected Results:**
- The template is saved successfully
- The template appears in the dropdown
- Selecting the template restores all settings correctly

### Test Case 7: Default Template Setting

**Objective:** Verify that setting a default template works correctly.

**Steps:**
1. Open the structure settings dialog
2. Select a saved template from the dropdown
3. Click the star icon to set it as the default
4. Close the dialog
5. Reopen the dialog
6. Verify that the default template is automatically selected

**Expected Results:**
- The template is marked as default (star icon is filled)
- The default template is automatically selected when reopening the dialog
- New article generation uses the default template settings

## Testing Different Structure Configurations

To thoroughly test the feature, try generating articles with these different configurations:

### Minimal Configuration
- **Sections:** Only "What is" and "Why Matters"
- **Visual Elements:** Only Quick Takeaways
- **SEO Features:** Only Table of Contents and Meta Description
- **Style:** Basic reading level, Concise content density, Beginners target audience

### Comprehensive Configuration
- **Sections:** All sections enabled
- **Visual Elements:** All elements enabled
- **SEO Features:** All features enabled
- **Style:** Advanced reading level, Comprehensive content density, Experts target audience

### Mixed Configuration
- **Sections:** "What is", "How To", and "Best Practices"
- **Visual Elements:** Quick Takeaways, Pro Tips, and Callout Boxes
- **SEO Features:** Table of Contents and FAQ Section
- **Style:** Intermediate reading level, Balanced content density, General audience

## Reporting Issues

If you encounter any issues during testing, please document:
1. The specific test case that failed
2. The steps to reproduce the issue
3. The expected vs. actual behavior
4. Any error messages or console logs
5. Screenshots if applicable

## Conclusion

This testing guide provides a comprehensive approach to verifying the Article Structure Customization feature. By following these test cases, you can ensure that the feature works correctly and provides users with the ability to customize their generated articles according to their specific needs.
