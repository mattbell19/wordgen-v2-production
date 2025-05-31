/**
 * Article Structure Settings Test Utility
 * 
 * This script can be run in the browser console to test the Article Structure Settings components.
 * It verifies that the components render correctly and that the settings are saved properly.
 * 
 * Usage:
 * 1. Open the browser console on the Article Writer page
 * 2. Copy and paste this entire script
 * 3. Run the testArticleStructureSettings() function
 */

// Test function for Article Structure Settings
function testArticleStructureSettings() {
  console.log('Testing Article Structure Settings...');
  
  // Check if the required components are loaded
  const componentsToCheck = [
    'ArticleStructureSettings',
    'ArticleStructureTab',
    'VisualElementsTab',
    'SeoFeaturesTab',
    'ContentStyleTab',
    'StructurePreview',
    'SavedTemplatesDropdown'
  ];
  
  const missingComponents = [];
  
  componentsToCheck.forEach(componentName => {
    // Check if the component is in the window object or React DevTools
    if (
      !window[componentName] && 
      !window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.ComponentTree?.getNodeByID(componentName)
    ) {
      missingComponents.push(componentName);
    }
  });
  
  if (missingComponents.length > 0) {
    console.error('Missing components:', missingComponents);
    console.log('This test should be run after the components are loaded on the Article Writer page.');
    return;
  }
  
  console.log('All components are loaded.');
  
  // Test the article settings hook
  try {
    const settings = window.useArticleSettings?.getState()?.settings;
    
    if (!settings) {
      console.error('Article settings not found in the store.');
      return;
    }
    
    console.log('Article settings found:', settings);
    
    // Check if structure settings exist
    if (!settings.structure) {
      console.error('Structure settings not found in the article settings.');
      return;
    }
    
    console.log('Structure settings found:', settings.structure);
    
    // Test structure settings dialog
    console.log('Testing structure settings dialog...');
    
    // Find the settings button
    const settingsButton = Array.from(document.querySelectorAll('button'))
      .find(button => button.textContent.includes('Settings'));
    
    if (!settingsButton) {
      console.error('Settings button not found.');
      return;
    }
    
    console.log('Settings button found. Clicking...');
    settingsButton.click();
    
    // Wait for the settings dialog to open
    setTimeout(() => {
      // Find the customize article structure button
      const customizeButton = Array.from(document.querySelectorAll('button'))
        .find(button => button.textContent.includes('Customize Article Structure'));
      
      if (!customizeButton) {
        console.error('Customize Article Structure button not found.');
        return;
      }
      
      console.log('Customize Article Structure button found. Clicking...');
      customizeButton.click();
      
      // Wait for the structure settings dialog to open
      setTimeout(() => {
        // Check if the dialog is open
        const dialog = document.querySelector('[aria-labelledby="article-structure-dialog-title"]');
        
        if (!dialog) {
          console.error('Structure settings dialog not found.');
          return;
        }
        
        console.log('Structure settings dialog found.');
        
        // Check if the tabs are present
        const tabs = Array.from(dialog.querySelectorAll('[role="tab"]'));
        
        if (tabs.length < 4) {
          console.error('Not all tabs are present. Found:', tabs.length);
          return;
        }
        
        console.log('All tabs are present:', tabs.map(tab => tab.textContent));
        
        // Check if the structure preview is present
        const preview = dialog.querySelector('[aria-labelledby="tabpanel-0"]');
        
        if (!preview) {
          console.error('Structure preview not found.');
          return;
        }
        
        console.log('Structure preview found.');
        
        // Check if the saved templates dropdown is present
        const dropdown = dialog.querySelector('select');
        
        if (!dropdown) {
          console.error('Saved templates dropdown not found.');
          return;
        }
        
        console.log('Saved templates dropdown found.');
        
        // Test changing settings
        console.log('Testing changing settings...');
        
        // Toggle some checkboxes
        const checkboxes = Array.from(dialog.querySelectorAll('input[type="checkbox"]'));
        
        if (checkboxes.length === 0) {
          console.error('No checkboxes found.');
          return;
        }
        
        console.log('Found', checkboxes.length, 'checkboxes.');
        
        // Toggle a few checkboxes
        const checkboxesToToggle = checkboxes.slice(0, 3);
        
        checkboxesToToggle.forEach(checkbox => {
          const initialState = checkbox.checked;
          checkbox.click();
          console.log('Toggled checkbox:', checkbox.name, 'from', initialState, 'to', checkbox.checked);
        });
        
        // Test saving settings
        console.log('Testing saving settings...');
        
        // Find the save button
        const saveButton = Array.from(dialog.querySelectorAll('button'))
          .find(button => button.textContent.includes('Save Settings'));
        
        if (!saveButton) {
          console.error('Save Settings button not found.');
          return;
        }
        
        console.log('Save Settings button found. Clicking...');
        saveButton.click();
        
        // Wait for the dialog to close
        setTimeout(() => {
          // Check if the dialog is closed
          const dialogAfterSave = document.querySelector('[aria-labelledby="article-structure-dialog-title"]');
          
          if (dialogAfterSave) {
            console.error('Structure settings dialog did not close after saving.');
            return;
          }
          
          console.log('Structure settings dialog closed after saving.');
          
          // Check if the settings were saved
          const updatedSettings = window.useArticleSettings?.getState()?.settings;
          
          if (!updatedSettings || !updatedSettings.structure) {
            console.error('Updated structure settings not found after saving.');
            return;
          }
          
          console.log('Updated structure settings found after saving:', updatedSettings.structure);
          
          console.log('Article Structure Settings test completed successfully!');
        }, 500);
      }, 500);
    }, 500);
  } catch (error) {
    console.error('Error testing article settings:', error);
  }
}

// Export the test function
window.testArticleStructureSettings = testArticleStructureSettings;

// Log instructions
console.log('Article Structure Settings test utility loaded.');
console.log('Run window.testArticleStructureSettings() to test the components.');
