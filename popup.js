// Popup script for Smart Input Box extension

class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const settings = await browser.storage.local.get(['isEnabled', 'mode', 'apiKey', 'llmProvider']);
      
      // Update UI based on settings
      this.updateToggleState(settings.isEnabled !== false);
      this.updateModeState(settings.mode || 'habit');
      this.updateApiSection(settings.mode === 'advanced');
      this.updateAdvancedFeatures(settings.mode === 'advanced');
      
      // Update provider selection
      const providerSelect = document.getElementById('providerSelect');
      if (providerSelect) {
        providerSelect.value = settings.llmProvider || 'openai';
        this.updateProviderInfo(settings.llmProvider || 'openai');
      }
      
      if (settings.apiKey) {
        document.getElementById('apiKey').value = settings.apiKey;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.showStatus('Failed to load settings', 'error');
    }
  }

  setupEventListeners() {
    // Enable/disable toggle
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('click', () => {
      this.toggleExtension();
    });

    // Mode selection
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.setMode(mode);
      });
    });

    // Provider selection
    const providerSelect = document.getElementById('providerSelect');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        this.setProvider(providerSelect.value);
      });
    }

    // API key input
    const apiKeyInput = document.getElementById('apiKey');
    apiKeyInput.addEventListener('blur', () => {
      this.saveApiKey(apiKeyInput.value);
    });

    // API key input with Enter key
    apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.saveApiKey(apiKeyInput.value);
        apiKeyInput.blur();
      }
    });

    // Copy API Key button
    const copyApiBtn = document.getElementById('copyApiBtn');
    copyApiBtn.addEventListener('click', () => {
      if (apiKeyInput.value) {
        navigator.clipboard.writeText(apiKeyInput.value)
          .then(() => {
            this.showStatus('API key copied!', 'success');
          })
          .catch(() => {
            this.showStatus('Failed to copy API key', 'error');
          });
      } else {
        this.showStatus('No API key to copy', 'info');
      }
    });
  }

  updateToggleState(isEnabled) {
    const toggle = document.getElementById('enableToggle');
    if (isEnabled) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }
  }

  updateModeState(mode) {
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      }
    });
  }

  updateApiSection(show) {
    const apiSection = document.getElementById('apiSection');
    if (show) {
      apiSection.classList.add('show');
    } else {
      apiSection.classList.remove('show');
    }
  }

  updateAdvancedFeatures(show) {
    const advancedFeatures = document.getElementById('advancedFeatures');
    if (show) {
      advancedFeatures.style.display = 'block';
    } else {
      advancedFeatures.style.display = 'none';
    }
  }

  updateProviderInfo(provider) {
    const providerInfo = document.getElementById('providerInfo');
    if (!providerInfo) return;

    if (provider === 'groq') {
      providerInfo.innerHTML = `
        Get your API key from <a href="https://console.groq.com/keys" target="_blank" class="api-link">Groq Console</a><br>
        The extension uses Llama3-8b for fast AI features
      `;
    } else {
      providerInfo.innerHTML = `
        Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" class="api-link">OpenAI Platform</a><br>
        The extension uses GPT-3.5-turbo for AI features
      `;
    }
  }

  async toggleExtension() {
    try {
      const currentState = await browser.storage.local.get(['isEnabled']);
      const newState = !currentState.isEnabled;
      
      await browser.storage.local.set({ isEnabled: newState });
      this.updateToggleState(newState);
      
      // Send message to content script
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await browser.tabs.sendMessage(tabs[0].id, { action: 'toggleExtension' });
      }
      
      this.showStatus(`Extension ${newState ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Failed to toggle extension:', error);
      this.showStatus('Failed to toggle extension', 'error');
    }
  }

  async setMode(mode) {
    try {
      await browser.storage.local.set({ mode: mode });
      this.updateModeState(mode);
      this.updateApiSection(mode === 'advanced');
      this.updateAdvancedFeatures(mode === 'advanced');
      
      // Send message to content script
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await browser.tabs.sendMessage(tabs[0].id, { 
          action: 'updateMode', 
          mode: mode 
        });
      }
      
      if (mode === 'advanced') {
        this.showStatus('Advanced Mode enabled! Set your API key to use AI features.', 'info');
      } else {
        this.showStatus(`Mode changed to ${mode}`, 'success');
      }
    } catch (error) {
      console.error('Failed to set mode:', error);
      this.showStatus('Failed to change mode', 'error');
    }
  }

  async saveApiKey(apiKey) {
    try {
      await browser.storage.local.set({ apiKey: apiKey });
      
      // Send API key to content script
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await browser.tabs.sendMessage(tabs[0].id, { 
          action: 'updateApiKey', 
          apiKey: apiKey 
        });
      }
      
      if (apiKey) {
        this.showStatus('API key saved successfully!', 'success');
      } else {
        this.showStatus('API key cleared', 'info');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      this.showStatus('Failed to save API key', 'error');
    }
  }

  async setProvider(provider) {
    try {
      await browser.storage.local.set({ llmProvider: provider });
      this.updateProviderInfo(provider);
      
      // Send message to content script
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await browser.tabs.sendMessage(tabs[0].id, { 
          action: 'updateProvider', 
          provider: provider 
        });
      }
      
      this.showStatus(`Switched to ${provider.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Failed to set provider:', error);
      this.showStatus('Failed to change provider', 'error');
    }
  }

  showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    // Hide after 4 seconds for info messages, 3 seconds for others
    const hideDelay = type === 'info' ? 4000 : 3000;
    setTimeout(() => {
      status.style.display = 'none';
    }, hideDelay);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 
