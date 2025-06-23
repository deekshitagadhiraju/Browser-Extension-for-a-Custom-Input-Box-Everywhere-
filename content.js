// Smart Input Box Content Script
class SmartInputBox {
  constructor() {
    this.isEnabled = true;
    this.mode = 'habit'; // 'habit' or 'advanced'
    this.floatingInput = null;
    this.currentTarget = null;
    this.apiKey = null;
    this.llmProvider = 'openai'; // 'openai', 'groq'
    this.init();
  }

  init() {
    this.createFloatingInput();
    this.setupEventListeners();
    this.loadSettings();
    this.setupMessageListener();
  }

  createFloatingInput() {
    // Create the floating input container
    this.floatingInput = document.createElement('div');
    this.floatingInput.id = 'smart-input-box';
    this.floatingInput.className = 'smart-input-container';
    
    // Create the input field
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'smart-input-field';
    input.placeholder = 'Type here...';
    input.className = 'smart-input-field';
    
    // Create apply button
    const applyBtn = document.createElement('button');
    applyBtn.innerHTML = '✓';
    applyBtn.className = 'smart-input-apply';
    applyBtn.title = 'Apply & Close (Ctrl+Enter)';
    
    // Create mode toggle button
    const modeBtn = document.createElement('button');
    modeBtn.innerHTML = 'H';
    modeBtn.className = 'smart-input-mode';
    modeBtn.title = 'Toggle Mode (Ctrl+G / Ctrl+Shift+G)';
    
    // Create Advanced Mode controls
    const advancedControls = document.createElement('div');
    advancedControls.className = 'advanced-controls';
    advancedControls.style.display = 'none';
    
    // CSS modification button
    const cssBtn = document.createElement('button');
    cssBtn.innerHTML = '🎨';
    cssBtn.className = 'advanced-btn css-btn';
    cssBtn.title = 'Modify CSS';
    
    // Summarize button
    const summarizeBtn = document.createElement('button');
    summarizeBtn.innerHTML = '📝';
    summarizeBtn.className = 'advanced-btn summarize-btn';
    summarizeBtn.title = 'Summarize Content';
    
    // Append advanced controls
    advancedControls.appendChild(cssBtn);
    advancedControls.appendChild(summarizeBtn);
    
    // Append elements
    this.floatingInput.appendChild(input);
    this.floatingInput.appendChild(advancedControls);
    this.floatingInput.appendChild(applyBtn);
    this.floatingInput.appendChild(modeBtn);
    
    // Add to page
    document.body.appendChild(this.floatingInput);
    
    // Initially hide
    this.hide();
  }

  setupEventListeners() {
    // Handle floating input events
    const input = this.floatingInput.querySelector('#smart-input-field');
    const applyBtn = this.floatingInput.querySelector('.smart-input-apply');
    const modeBtn = this.floatingInput.querySelector('.smart-input-mode');
    const cssBtn = this.floatingInput.querySelector('.css-btn');
    const summarizeBtn = this.floatingInput.querySelector('.summarize-btn');

    // Sync input with target - IMPROVED VERSION
    input.addEventListener('input', (e) => {
      if (this.currentTarget && this.mode === 'habit') {
        console.log('Syncing input:', e.target.value); // Debug log
        this.currentTarget.value = e.target.value;
        
        // Trigger multiple events to ensure proper sync
        this.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
        this.currentTarget.dispatchEvent(new Event('change', { bubbles: true }));
        this.currentTarget.dispatchEvent(new Event('keyup', { bubbles: true }));
      }
    });

    // Also sync on keyup for better responsiveness
    input.addEventListener('keyup', (e) => {
      if (this.currentTarget && this.mode === 'habit') {
        this.currentTarget.value = e.target.value;
        this.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Handle key events
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      } else if (e.ctrlKey && e.key === 'g') {
        this.toggleMode();
      } else if (e.ctrlKey && e.key === 'Enter') {
        // Apply & Close - works in both modes
        if (this.mode === 'habit') {
          this.applyAndClose();
        } else if (this.mode === 'advanced') {
          this.handleAdvancedModeTextApply(e);
        }
      } else if (e.key === 'Enter') {
        if (this.mode === 'habit') {
          this.handleHabitModeEnter(e);
        } else if (this.mode === 'advanced') {
          this.handleAdvancedModeEnter(e);
        }
      }
    });

    // Apply button
    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      if (this.mode === 'habit') {
        this.applyAndClose();
      } else if (this.mode === 'advanced') {
        const input = this.floatingInput.querySelector('#smart-input-field');
        const event = { target: input };
        this.handleAdvancedModeTextApply(event);
      }
    });

    // Mode toggle button
    modeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      this.toggleMode();
    });

    // Advanced Mode buttons
    cssBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.modifyCSS();
    });

    summarizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.summarizeContent();
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Hide floating input with Escape key
      if (e.key === 'Escape' && this.floatingInput.style.display !== 'none') {
        this.hide();
        return;
      }
      
      // Toggle extension on/off
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        this.toggle();
        return;
      }
      
      // Toggle mode (only when extension is enabled)
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        if (this.isEnabled) {
          this.toggleMode();
        }
        return;
      }
      
      // Show floating input directly for Advanced Mode (even without input fields)
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        if (this.isEnabled) {
          this.showDirectly();
        }
        return;
      }
    });

    // SIMPLIFIED APPROACH: Use mousedown for showing and hiding
    document.addEventListener('mousedown', (e) => {
      if (!this.isEnabled) return;
      
      const target = e.target;
      
      // Show floating input when clicking on input fields
      if (this.isInputElement(target)) {
        setTimeout(() => {
          this.show(target);
        }, 10);
        return; // Don't hide if we're showing
      }
      
      // Hide floating input when clicking outside
      if (this.floatingInput.style.display !== 'none') {
        const clickedElement = e.target;
        
        // Don't hide if clicking on the floating input itself
        if (this.floatingInput.contains(clickedElement)) {
          return;
        }
        
        // Don't hide if clicking on the current target input (if any)
        if (this.currentTarget && (this.currentTarget === clickedElement || this.currentTarget.contains(clickedElement))) {
          return;
        }
        
        // Don't hide if clicking on elements that are part of the same form (if any)
        if (this.currentTarget) {
          const currentForm = this.currentTarget.closest('form');
          if (currentForm && currentForm.contains(clickedElement)) {
            return;
          }
        }
        
        // Hide if clicking outside all relevant elements
        this.hide();
      }
    });

    // Prevent the floating input from interfering with focus
    this.floatingInput.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    // Also prevent focus events from hiding the floating input
    this.floatingInput.addEventListener('focusin', (e) => {
      e.stopPropagation();
    });

    this.floatingInput.addEventListener('focusout', (e) => {
      e.stopPropagation();
    });
  }

  handleHabitModeEnter(e) {
    // Sync on Enter key and trigger form submission/search
    if (this.currentTarget) {
      // First sync the value
      this.currentTarget.value = e.target.value;
      this.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
      this.currentTarget.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Create and dispatch Enter key event on the original target
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      
      // Dispatch the Enter event on the original input
      this.currentTarget.dispatchEvent(enterEvent);
      
      // Also try to submit the form if the target is in a form
      const form = this.currentTarget.closest('form');
      if (form) {
        // Try to find a submit button
        const submitButton = form.querySelector('input[type="submit"], button[type="submit"], button:not([type])');
        if (submitButton) {
          submitButton.click();
        } else {
          // If no submit button, try to submit the form directly
          form.dispatchEvent(new Event('submit', { bubbles: true }));
        }
      }
      
      // For search inputs, also trigger search events
      if (this.currentTarget.type === 'search' || 
          this.currentTarget.getAttribute('role') === 'searchbox' ||
          this.currentTarget.classList.contains('search') ||
          this.currentTarget.id.includes('search')) {
        // Trigger search-specific events
        this.currentTarget.dispatchEvent(new Event('search', { bubbles: true }));
      }
      
      console.log('Enter key handled for:', this.currentTarget.id || this.currentTarget.placeholder);
    }
  }

  async handleAdvancedModeEnter(e) {
    const prompt = e.target.value.trim();
    if (!prompt) return;

    if (!this.apiKey) {
      this.showNotification('Please set your API key in the extension settings', 'error');
      return;
    }

    try {
      // Show loading state
      this.showNotification('Processing with AI...', 'info');
      
      // Send to LLM for processing
      const response = await this.callLLM(prompt);
      
      // Apply the response
      await this.applyAdvancedResponse(response, prompt);
      
    } catch (error) {
      console.error('Advanced mode error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Error processing request';
      
      if (error.message.includes('401')) {
        errorMessage = 'Invalid API key. Please check your OpenAI API key.';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('402')) {
        errorMessage = 'Payment required. Please add credits to your OpenAI account.';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid response from AI. Please try again.';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      this.showNotification(errorMessage, 'error');
    }
  }

  handleAdvancedModeTextApply(e) {
    const text = e.target.value.trim();
    if (!text) return;

    // If we have a current target (input field), apply the text to it
    if (this.currentTarget) {
      this.currentTarget.value = text;
      this.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
      this.currentTarget.dispatchEvent(new Event('change', { bubbles: true }));
      this.currentTarget.focus();
      this.showNotification('Text applied to input field!', 'success');
      console.log('Applied text to input field:', text);
    } else {
      // If no target, just show the text was entered
      this.showNotification('Text entered: ' + text, 'info');
      console.log('Text entered in advanced mode:', text);
    }
    
    // Clear the floating input
    e.target.value = '';
    
    // Hide the floating input
    this.hide();
  }

  async callLLM(prompt) {
    const systemPrompt = `You are an AI assistant that helps modify websites. You MUST respond in valid JSON format only.

Your response must be a valid JSON object with this exact structure:
{
  "action": "css_modify",
  "css": "CSS rules to apply",
  "explanation": "What you did and why"
}

OR

{
  "action": "summarize", 
  "summary": "Summarized content",
  "explanation": "What you did and why"
}

OR

{
  "action": "suggest",
  "suggestions": ["suggestion1", "suggestion2"],
  "explanation": "What you did and why"
}

IMPORTANT: 
- Always respond with valid JSON only
- No markdown, no explanations outside the JSON
- The "action" field must be one of: "css_modify", "summarize", or "suggest"
- For CSS modifications, provide complete CSS rules
- For summaries, provide the summarized text
- For suggestions, provide an array of strings

Example for CSS request: {"action": "css_modify", "css": "body { background: #f5f5f5; font-family: Arial, sans-serif; }", "explanation": "Made the website cleaner with light background and better font"}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Current website: ${window.location.href}\nUser request: ${prompt}` }
    ];

    console.log('Making API call with:', { prompt, apiKeyLength: this.apiKey?.length, provider: this.llmProvider });

    let response;
    
    if (this.llmProvider === 'groq') {
      // Call Groq API
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192', // Fast and efficient model
          messages: messages,
          max_tokens: 1000,
          temperature: 0.3 // Lower temperature for more consistent JSON
        })
      });
    } else {
      // Call OpenAI API (default)
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 1000,
          temperature: 0.3 // Lower temperature for more consistent JSON
        })
      });
    }

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response data:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from AI API');
    }

    const content = data.choices[0].message.content;
    console.log('AI Response content:', content);

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      
      // Validate the response structure
      if (!parsed.action || !['css_modify', 'summarize', 'suggest'].includes(parsed.action)) {
        throw new Error('Invalid action in response');
      }
      
      return parsed;
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      console.error('Parse error:', parseError);
      
      // Try to extract JSON from the response if it's wrapped in markdown
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          if (extracted.action && ['css_modify', 'summarize', 'suggest'].includes(extracted.action)) {
            console.log('Successfully extracted JSON from response');
            return extracted;
          }
        } catch (extractError) {
          console.error('Failed to extract JSON:', extractError);
        }
      }
      
      // Fallback: create a response based on the prompt content
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.includes('css') || lowerPrompt.includes('style') || lowerPrompt.includes('modern') || lowerPrompt.includes('clean') || lowerPrompt.includes('nice')) {
        return {
          action: 'css_modify',
          css: `
            body {
              background: #f8f9fa !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              color: #333 !important;
              line-height: 1.6 !important;
            }
            
            * {
              box-sizing: border-box !important;
            }
            
            input, textarea, select {
              border: 1px solid #ddd !important;
              border-radius: 6px !important;
              padding: 8px 12px !important;
              font-size: 14px !important;
            }
            
            button {
              background: #007acc !important;
              color: white !important;
              border: none !important;
              border-radius: 6px !important;
              padding: 8px 16px !important;
              cursor: pointer !important;
            }
          `,
          explanation: 'Applied a clean, modern styling to make the website look nice and professional'
        };
      } else if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
        return {
          action: 'summarize',
          summary: 'Content summarization feature is available. Please try a more specific request.',
          explanation: 'Fallback response for summarization request'
        };
      } else {
        return {
          action: 'suggest',
          suggestions: [
            'Try asking for specific CSS changes like "make the background light blue"',
            'Ask for content summarization with "summarize the main article"',
            'Request specific improvements like "make the text larger"'
          ],
          explanation: 'Here are some suggestions for better AI responses'
        };
      }
    }
  }

  async applyAdvancedResponse(response, originalPrompt) {
    switch (response.action) {
      case 'css_modify':
        this.applyCSS(response.css);
        this.showNotification('CSS modified successfully!', 'success');
        break;
        
      case 'summarize':
        this.showSummary(response.summary);
        this.showNotification('Content summarized!', 'success');
        break;
        
      case 'suggest':
        this.showSuggestions(response.suggestions);
        this.showNotification('Suggestions generated!', 'success');
        break;
        
      default:
        this.showNotification(response.explanation || 'Action completed', 'info');
    }
  }

  applyCSS(cssRules) {
    // Create or update the custom CSS
    let customStyle = document.getElementById('smart-input-custom-css');
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'smart-input-custom-css';
      document.head.appendChild(customStyle);
    }
    
    customStyle.textContent = cssRules;
    console.log('Applied CSS:', cssRules);
  }

  showSummary(summary) {
    // Create a summary popup
    const summaryPopup = document.createElement('div');
    summaryPopup.className = 'smart-summary-popup';
    summaryPopup.innerHTML = `
      <div class="summary-header">
        <h3>Content Summary</h3>
        <button class="close-summary">×</button>
      </div>
      <div class="summary-content">
        ${summary}
      </div>
    `;
    
    document.body.appendChild(summaryPopup);
    
    // Close button
    summaryPopup.querySelector('.close-summary').addEventListener('click', () => {
      summaryPopup.remove();
    });
  }

  showSuggestions(suggestions) {
    // Create a suggestions popup
    const suggestionsPopup = document.createElement('div');
    suggestionsPopup.className = 'smart-suggestions-popup';
    suggestionsPopup.innerHTML = `
      <div class="suggestions-header">
        <h3>AI Suggestions</h3>
        <button class="close-suggestions">×</button>
      </div>
      <div class="suggestions-content">
        <ul>
          ${suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    `;
    
    document.body.appendChild(suggestionsPopup);
    
    // Close button
    suggestionsPopup.querySelector('.close-suggestions').addEventListener('click', () => {
      suggestionsPopup.remove();
    });
  }

  modifyCSS() {
    const input = this.floatingInput.querySelector('#smart-input-field');
    input.value = 'Make this website more modern and clean';
    input.focus();
    this.showNotification('Describe the CSS changes you want', 'info');
  }

  summarizeContent() {
    const input = this.floatingInput.querySelector('#smart-input-field');
    input.value = 'Summarize the main content on this page';
    input.focus();
    this.showNotification('Describe what content to summarize', 'info');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `smart-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  setupMessageListener() {
    // Listen for messages from popup and background script
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'toggleExtension':
          this.toggle();
          sendResponse({ success: true });
          break;
          
        case 'updateMode':
          this.setMode(message.mode);
          sendResponse({ success: true });
          break;
          
        case 'updateApiKey':
          this.apiKey = message.apiKey;
          sendResponse({ success: true });
          break;
          
        case 'updateProvider':
          this.llmProvider = message.provider;
          sendResponse({ success: true });
          break;
          
        case 'getStatus':
          sendResponse({
            isEnabled: this.isEnabled,
            mode: this.mode,
            isVisible: this.floatingInput.style.display !== 'none'
          });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    });
  }

  isInputElement(element) {
    const inputTypes = ['input', 'textarea', 'select'];
    const inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    
    return inputTags.includes(element.tagName) || 
           (element.tagName === 'INPUT' && inputTypes.includes(element.type));
  }

  show(target) {
    if (!this.isEnabled) return;
    
    this.currentTarget = target;
    const input = this.floatingInput.querySelector('#smart-input-field');
    const advancedControls = this.floatingInput.querySelector('.advanced-controls');
    
    // Sync value from target to floating input
    input.value = target.value || '';
    console.log('Showing floating input for:', target.id || target.placeholder, 'with value:', target.value);
    
    // Add visual indicator to the target input
    this.addTargetIndicator(target);
    
    // Position the floating input
    this.positionFloatingInput(target);
    
    // Show/hide advanced controls based on mode
    advancedControls.style.display = this.mode === 'advanced' ? 'flex' : 'none';
    
    // Show and focus
    this.floatingInput.style.display = 'flex';
    
    // Small delay before focusing to prevent immediate blur
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }

  hide() {
    this.floatingInput.style.display = 'none';
    
    // Remove visual indicator from target
    if (this.currentTarget) {
      this.removeTargetIndicator(this.currentTarget);
    }
    
    this.currentTarget = null;
    
    // Remove background overlay
    this.removeBackgroundOverlay();
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.hide();
    }
    this.saveSettings();
  }

  setMode(mode) {
    this.mode = mode;
    const modeBtn = this.floatingInput.querySelector('.smart-input-mode');
    const advancedControls = this.floatingInput.querySelector('.advanced-controls');
    const applyBtn = this.floatingInput.querySelector('.smart-input-apply');
    
    modeBtn.innerHTML = this.mode === 'habit' ? 'H' : 'A';
    modeBtn.title = this.mode === 'habit' ? 'Habit Mode' : 'Advanced Mode';
    
    // Update apply button tooltip based on mode
    applyBtn.title = this.mode === 'habit' ? 'Apply & Close (Ctrl+Enter)' : 'Apply Text Directly (Ctrl+Enter)';
    
    // Update container class for styling
    this.floatingInput.classList.toggle('advanced-mode', this.mode === 'advanced');
    
    // Show/hide advanced controls
    if (this.floatingInput.style.display !== 'none') {
      advancedControls.style.display = this.mode === 'advanced' ? 'flex' : 'none';
    }
    
    // Update placeholder based on mode
    const input = this.floatingInput.querySelector('#smart-input-field');
    input.placeholder = this.mode === 'habit' ? 'Type here...' : 'Type text and press Enter for AI, or Ctrl+Enter to apply text directly...';
    
    this.saveSettings();
  }

  positionFloatingInput(target) {
    const rect = target.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top, left;
    
    // Position based on mode
    if (this.mode === 'habit') {
      // HABIT MODE: Position in the middle of the page for better visibility
      top = Math.max(10, (viewportHeight - 100) / 2); // Center vertically with some margin
      
      // Add background overlay with slight blur for habit mode
      this.addBackgroundOverlay();
    } else {
      // ADVANCED MODE: Position at the top of the page
      top = 10; // Small margin from top
    }
    
    // Center horizontally for better UX
    left = Math.max(10, Math.min(viewportWidth - 310, (viewportWidth - 300) / 2));
    
    // Apply positioning
    this.floatingInput.style.top = top + 'px';
    this.floatingInput.style.left = left + 'px';
    
    // Add some visual feedback about which input is being controlled
    console.log('Positioned floating input for', this.mode, 'mode:', target.id || target.placeholder);
  }

  addBackgroundOverlay() {
    // Remove existing overlay if any
    this.removeBackgroundOverlay();
    
    // Create background overlay with slight blur
    this.backgroundOverlay = document.createElement('div');
    this.backgroundOverlay.className = 'smart-background-overlay';
    this.backgroundOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(2px);
      z-index: 999998;
      pointer-events: none;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(this.backgroundOverlay);
  }

  removeBackgroundOverlay() {
    if (this.backgroundOverlay) {
      this.backgroundOverlay.remove();
      this.backgroundOverlay = null;
    }
  }

  toggleMode() {
    const newMode = this.mode === 'habit' ? 'advanced' : 'habit';
    this.setMode(newMode);
  }

  async loadSettings() {
    try {
      const result = await browser.storage.local.get(['isEnabled', 'mode', 'apiKey', 'llmProvider']);
      this.isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;
      this.mode = result.mode || 'habit';
      this.apiKey = result.apiKey || null;
      this.llmProvider = result.llmProvider || 'openai';
      
      const modeBtn = this.floatingInput.querySelector('.smart-input-mode');
      modeBtn.innerHTML = this.mode === 'habit' ? 'H' : 'A';
      
      // Update container class for styling
      this.floatingInput.classList.toggle('advanced-mode', this.mode === 'advanced');
      
      // Debug: Log API key status
      if (this.apiKey) {
        console.log('API key loaded, length:', this.apiKey.length);
        console.log('API key starts with:', this.apiKey.substring(0, 7) + '...');
        console.log('Provider:', this.llmProvider);
      } else {
        console.log('No API key found');
      }
    } catch (error) {
      console.log('Settings not loaded:', error);
    }
  }

  async saveSettings() {
    try {
      await browser.storage.local.set({
        isEnabled: this.isEnabled,
        mode: this.mode,
        apiKey: this.apiKey,
        llmProvider: this.llmProvider
      });
    } catch (error) {
      console.log('Settings not saved:', error);
    }
  }

  addTargetIndicator(target) {
    // Add a subtle highlight to show which input is being controlled
    target.style.boxShadow = '0 0 0 2px rgba(0, 122, 204, 0.3)';
    target.style.borderColor = '#007acc';
    target.style.transition = 'all 0.2s ease';
  }

  removeTargetIndicator(target) {
    // Remove the highlight
    target.style.boxShadow = '';
    target.style.borderColor = '';
    target.style.transition = '';
  }

  applyAndClose() {
    if (this.currentTarget) {
      const input = this.floatingInput.querySelector('#smart-input-field');
      
      // Sync the floating input value to the target
      this.currentTarget.value = input.value;
      
      // Trigger input and change events (but NOT keydown events that would trigger search)
      this.currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
      this.currentTarget.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focus back to the original input
      this.currentTarget.focus();
      
      // Show brief success feedback
      this.showNotification('Text applied!', 'success');
      
      console.log('Applied text and closed floating input');
    }
    
    // Hide the floating input
    this.hide();
  }

  showDirectly() {
    if (!this.isEnabled) return;
    
    // Set currentTarget to null since we're not targeting a specific input
    this.currentTarget = null;
    const input = this.floatingInput.querySelector('#smart-input-field');
    const advancedControls = this.floatingInput.querySelector('.advanced-controls');
    
    // Clear the input field
    input.value = '';
    
    // Position based on mode
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const left = Math.max(10, Math.min(viewportWidth - 310, (viewportWidth - 300) / 2));
    
    if (this.mode === 'habit') {
      // Position in the middle for habit mode
      const top = Math.max(10, (viewportHeight - 100) / 2);
      this.floatingInput.style.top = top + 'px';
      this.floatingInput.style.left = left + 'px';
      
      // Add background overlay for habit mode
      this.addBackgroundOverlay();
    } else {
      // Position at the top for advanced mode
      this.floatingInput.style.top = '10px';
      this.floatingInput.style.left = left + 'px';
    }
    
    // Show advanced controls if in Advanced Mode
    advancedControls.style.display = this.mode === 'advanced' ? 'flex' : 'none';
    
    // Show and focus
    this.floatingInput.style.display = 'flex';
    
    // Small delay before focusing
    setTimeout(() => {
      input.focus();
    }, 50);
    
    console.log('Showing floating input directly for', this.mode, 'mode usage');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SmartInputBox();
  });
} else {
  new SmartInputBox();
} 