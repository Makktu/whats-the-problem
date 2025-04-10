// API Service for handling both local and OpenRouter API calls
import { OPENROUTER_API_KEY } from './secrets.js';

class ApiService {
  constructor() {
    this.useOpenRouter = false;
    this.localEndpoint = "http://localhost:1234/v1/chat/completions";
    this.openRouterEndpoint = "https://openrouter.ai/api/v1/chat/completions";
    this.defaultModel = "local-model";
    this.openRouterModel = "openrouter/optimus-alpha"; // Default OpenRouter model - change at will
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

    // Create payload with strict model enforcement for OpenRouter
    const payload = {
      model: model,
      messages: messages,
      temperature: temperature,
    };
    
    // Add OpenRouter-specific parameters to prevent model fallback
    if (this.useOpenRouter) {
      payload.route = "fallback:none"; // Strict setting to prevent any fallback
      payload.transforms = ["middle-out"];
      // Force specific model only
      payload.models = [model];
    }

    console.log('Sending payload to', endpoint);
    console.log('Using model:', model);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
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

    const data = await response.json();
    
    // Verify the model used matches what we requested (for OpenRouter)
    if (this.useOpenRouter && data.model && data.model !== model) {
      // Special handling for ":free" suffix models - OpenRouter returns the model name without the suffix
      const requestedModelBase = model.split(':')[0];
      if (data.model === requestedModelBase && model.endsWith(':free')) {
        console.log(`Model returned without :free suffix. Requested: ${model}, Received: ${data.model}. This is acceptable.`);
      } else {
        console.error(`Model mismatch! Requested: ${model}, Received: ${data.model}`);
        throw new Error(`Model mismatch! The API used ${data.model} instead of the requested ${model}. Request aborted.`);
      }
    }
    
    return data;
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

    // Create payload with strict model enforcement for OpenRouter
    const payload = {
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
      ],
      temperature: 0.7,
    };
    
    // Add OpenRouter-specific parameters to prevent model fallback
    if (this.useOpenRouter) {
      payload.route = "fallback:none"; // Strict setting to prevent any fallback
      payload.transforms = ["middle-out"];
      // Force specific model only
      payload.models = [model];
    }
    
    console.log('Testing connection with model:', model);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
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

    const data = await response.json();
    
    // Verify the model used matches what we requested (for OpenRouter)
    if (this.useOpenRouter && data.model && data.model !== model) {
      // Special handling for ":free" suffix models - OpenRouter returns the model name without the suffix
      const requestedModelBase = model.split(':')[0];
      if (data.model === requestedModelBase && model.endsWith(':free')) {
        console.log(`Model returned without :free suffix. Requested: ${model}, Received: ${data.model}. This is acceptable.`);
      } else {
        console.error(`Model mismatch! Requested: ${model}, Received: ${data.model}`);
        throw new Error(`Model mismatch! The API used ${data.model} instead of the requested ${model}. Request aborted.`);
      }
    }
    
    return data;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
