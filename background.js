// Background script for Smart Input Box extension

// Handle extension installation
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Smart Input Box extension installed');
    
    // Set default settings
    browser.storage.local.set({
      isEnabled: true,
      mode: 'habit',
      apiKey: ''
    });
  }
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'getSettings':
      browser.storage.local.get(['isEnabled', 'mode', 'apiKey'])
        .then(settings => sendResponse(settings));
      return true; // Keep message channel open for async response
      
    case 'saveSettings':
      browser.storage.local.set(message.settings)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'toggleExtension':
      browser.storage.local.get(['isEnabled'])
        .then(result => {
          const newState = !result.isEnabled;
          return browser.storage.local.set({ isEnabled: newState });
        })
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Handle browser action click
browser.browserAction.onClicked.addListener((tab) => {
  // Send message to content script to toggle the extension
  browser.tabs.sendMessage(tab.id, { action: 'toggleExtension' })
    .catch(error => {
      console.log('Could not send message to tab:', error);
    });
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener((command) => {
  if (command === '_execute_browser_action') {
    // Get the active tab and toggle the extension
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]) {
          return browser.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension' });
        }
      })
      .catch(error => {
        console.log('Could not execute command:', error);
      });
  }
}); 