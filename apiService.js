// API Service for handling both local and OpenRouter API calls
import { OPENROUTER_API_KEY } from './secrets.js';

class ApiService {
  constructor() {
    this.useOpenRouter = false;
    this.localEndpoint = "http://localhost:1234/v1/chat/completions";
    this.openRouterEndpoint = "https://openrouter.ai/api/v1/chat/completions";
    this.defaultModel = "local-model";
    this.openRouterModel = "openai/gpt-3.5-turbo"; // Default OpenRouter model
  }

  toggleApiSource(useOpenRouter) {
    this.useOpenRouter = useOpenRouter;
    return this.useOpenRouter;
  }

  getEndpoint() {
    return this.useOpenRouter ? this.openRouterEndpoint : this.localEndpoint;
  }

  getModel() {
    return this.useOpenRouter ? this.openRouterModel : this.defaultModel;
  }

  setLocalEndpoint(endpoint) {
    this.localEndpoint = endpoint;
  }

  setOpenRouterModel(model) {
    this.openRouterModel = model;
  }

  async sendRequest(messages, temperature = 0.7) {
    const endpoint = this.getEndpoint();
    const model = this.getModel();
    
    const headers = { 
      'Content-Type': 'application/json' 
    };
    
    // Add OpenRouter API key if using OpenRouter
    if (this.useOpenRouter) {
      headers['Authorization'] = `Bearer ${OPENROUTER_API_KEY}`;
      headers['HTTP-Referer'] = window.location.origin; // Required by OpenRouter
      headers['X-Title'] = "What's The Problem?"; // Optional app name for OpenRouter
    }

    const payload = {
      model: model,
      messages: messages,
      temperature: temperature,
    };

    console.log('Sending payload to', endpoint);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `HTTP error: ${response.status}`
      );
    }

    return await response.json();
  }

  async testConnection() {
    const endpoint = this.getEndpoint();
    const model = this.getModel();
    
    const headers = { 
      'Content-Type': 'application/json' 
    };
    
    // Add OpenRouter API key if using OpenRouter
    if (this.useOpenRouter) {
      headers['Authorization'] = `Bearer ${OPENROUTER_API_KEY}`;
      headers['HTTP-Referer'] = window.location.origin; // Required by OpenRouter
      headers['X-Title'] = "What's The Problem?"; // Optional app name for OpenRouter
    }

    const payload = {
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ],
      temperature: 0.7,
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `HTTP error: ${response.status}`
      );
    }

    return await response.json();
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
