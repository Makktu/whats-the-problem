import systemPrompt from './systemPrompt.js';
import apiService from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
  // Main UI elements
  const optionsContainer = document.getElementById('options-container');
  const questionContainer = document.getElementById('question-container');
  const questionEmoji = document.getElementById('question-emoji');
  const questionTitle = document.getElementById('question-title');
  const optionsList = document.getElementById('options-list');
  const solutionContainer = document.getElementById('solution-container');
  const solutionDescription = document.getElementById('solution-description');
  const solutionStepsList = document.getElementById('solution-steps-list');
  const solutionTipText = document.getElementById('solution-tip-text');
  const startOverButton = document.getElementById('start-over');
  const restartButton = document.getElementById('restart-button');

  // Developer Menu elements
  const devMenuToggle = document.getElementById('dev-menu-toggle');
  const devMenu = document.getElementById('dev-menu');
  const devMenuClose = document.getElementById('dev-menu-close');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');
  const testConnection = document.getElementById('test-connection');
  const connectionStatus = document.getElementById('connection-status');
  const temperatureSlider = document.getElementById('llm-temperature');
  const temperatureValue = document.getElementById('temperature-value');
  const copyMarkdownButton = document.getElementById('copy-markdown');
  const copyStatus = document.getElementById('copy-status');
  const modelInput = document.getElementById('llm-model');
  const apiToggle = document.getElementById('api-toggle');
  const localEndpointInput = document.getElementById('llm-endpoint');
  const openRouterModelInput = document.getElementById('openrouter-model');

  // State management
  let conversationHistory = [];
  let currentQuestion = '';
  let markdownLog = '';
  let sessionStartTime = '';

  // Initialize API settings
  apiToggle.addEventListener('change', () => {
    const useOpenRouter = apiToggle.checked;
    apiService.toggleApiSource(useOpenRouter);

    // Update the model display
    modelInput.value = apiService.getModel();

    // Update connection status
    connectionStatus.textContent = useOpenRouter
      ? 'Using OpenRouter API (not tested)'
      : 'Using Local API (not tested)';
    connectionStatus.style.color = '';
  });

  // Update API settings when inputs change
  localEndpointInput.addEventListener('change', () => {
    apiService.setLocalEndpoint(localEndpointInput.value);
    if (!apiToggle.checked) {
      modelInput.value = apiService.getModel();
    }
  });

  // Update OpenRouter model when dropdown changes
  openRouterModelInput.addEventListener('change', () => {
    const selectedModel = openRouterModelInput.value;
    const selectedModelText =
      openRouterModelInput.options[openRouterModelInput.selectedIndex].text;

    apiService.setOpenRouterModel(selectedModel);

    if (apiToggle.checked) {
      modelInput.value = apiService.getModel();
      console.log(`Model changed to: ${selectedModel} (${selectedModelText})`);
    }

    // Reset connection status since we changed the model
    connectionStatus.textContent = 'Using OpenRouter API (not tested)';
    connectionStatus.style.color = '';
  });

  // Initial options setup
  const initialOptions = document.querySelectorAll('.option');
  initialOptions.forEach((option) => {
    option.addEventListener('click', () => {
      const optionNumber = option.getAttribute('data-option');
      const optionText = option.querySelector('.option-text').textContent;

      // Start the conversation with the LLM
      startConversation(optionNumber, optionText);

      // Hide initial options and show question container
      optionsContainer.classList.add('hidden');
      questionContainer.classList.remove('hidden');
    });
  });

  // Start Over button
  startOverButton.addEventListener('click', () => {
    resetConversation();
  });

  // Restart button
  restartButton.addEventListener('click', () => {
    resetConversation();
  });

  // Start a new conversation with the LLM
  async function startConversation(initialOption, optionText) {
    // Reset conversation history
    conversationHistory = [];

    // Start new markdown log
    sessionStartTime = new Date().toLocaleString();
    markdownLog = `# What's The Problem? Session - ${sessionStartTime}\n\n`;

    // Log initial options in markdown
    markdownLog += `## Initial Options\n`;
    markdownLog += `1. Technical issue (device, software, connection)\n`;
    markdownLog += `2. Communication (writing, messaging)\n`;
    markdownLog += `3. Navigation/directions\n`;
    markdownLog += `4. Decision-making assistance\n`;
    markdownLog += `5. Something else\n\n`;

    // Log initial selection
    if (initialOption) {
      markdownLog += `## Initial Selection\n**User selected:** ${initialOption}. ${optionText}\n\n`;
    }

    // Add system prompt to conversation history
    conversationHistory.push({ role: 'system', content: systemPrompt });

    // Add initial user message based on the selected category
    let initialMessage = 'Hello. I need help with ';

    switch (initialOption) {
      case '1':
        initialMessage +=
          'a technical issue (device, software, or connection).';
        break;
      case '2':
        initialMessage += 'communication (writing or messaging).';
        break;
      case '3':
        initialMessage += 'navigation or directions.';
        break;
      case '4':
        initialMessage += 'making a decision.';
        break;
      case '5':
        initialMessage += 'something else.';
        break;
      default:
        initialMessage += 'a problem.';
    }

    conversationHistory.push({ role: 'user', content: initialMessage });

    // Get first response from LLM
    await getNextQuestion();
  }

  // Send the selected option to the LLM
  async function sendOptionToLLM(optionNumber) {
    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: optionNumber });

    // Get next question from LLM
    await getNextQuestion();
  }

  // Get the next question from the LLM
  async function getNextQuestion() {
    try {
      // Show loading state
      questionTitle.textContent = 'Thinking...';
      optionsList.innerHTML = '';

      // Get temperature setting
      const temperature = parseFloat(temperatureSlider.value);

      console.log('Sending conversation to API service:', conversationHistory);

      // Use the API service to send the request
      const data = await apiService.sendRequest(
        conversationHistory,
        temperature
      );
      console.log('Received response:', data);

      // Update model name display if available in the response
      if (data.model) {
        updateModelNameDisplay(data.model);
      }

      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const reply = data.choices[0].message.content;

        // Add assistant message to conversation history
        conversationHistory.push({ role: 'assistant', content: reply });

        // Process the reply
        processLLMResponse(reply);
      } else {
        throw new Error('Invalid response format from LLM');
      }
    } catch (err) {
      console.error('LLM error:', err);
      questionTitle.textContent = `Error: ${err.message}`;
    }
  }

  // Process the LLM response
  function processLLMResponse(response) {
    // Check if this is a solution (contains "Here's the likely issue:")
    if (response.includes("🎯 Here's the likely issue:")) {
      displaySolution(response);

      // Log the solution to the markdown log
      markdownLog += `## Solution\n\`\`\`\n${response}\n\`\`\`\n\n`;
    } else {
      // This is a question with options
      displayQuestion(response);

      // Add to markdown log
      markdownLog += `## Question\n\`\`\`\n${response}\n\`\`\`\n\n`;
    }
  }

  // Display a question with options
  function displayQuestion(response) {
    // Parse the response to extract emoji, title, and options
    const emojiMatch = response.match(/\*\*([^\*]+)\s([^\*]+)\*\*/);
    console.log(emojiMatch);
    if (emojiMatch && emojiMatch.length >= 3) {
      // const emoji = emojiMatch[1].trim();
      const title = emojiMatch[1] + emojiMatch[2];

      // Set emoji and title
      // questionEmoji.textContent = emoji;
      questionTitle.textContent = title;
      questionTitle.style.whiteSpace = 'pre-wrap'; // Wrap the title in its container

      // Extract options
      const options = [];
      const optionRegex = /\d+\.\s(.+?)(?=\n\d+\.|\n\n|\n$|$)/gs;
      let match;

      while ((match = optionRegex.exec(response)) !== null) {
        options.push(match[1].trim());
      }

      // Create a new options group
      const newOptionsGroup = document.createElement('div');
      newOptionsGroup.className = 'options-group current';

      // Create option elements in the new group
      options.forEach((option, index) => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';
        optionItem.innerHTML = `
          <div class="option-item-number">${index + 1}</div>
          <div class="option-item-text">${option}</div>
        `;

        // Add click event
        optionItem.addEventListener('click', () => {
          // Log user selection to markdown
          markdownLog += `**User selected:** ${index + 1}. ${option}\n\n`;

          // Send to LLM
          sendOptionToLLM(String(index + 1));
        });

        newOptionsGroup.appendChild(optionItem);
      });

      // Handle existing options - mark all existing groups as previous
      const existingGroups = optionsList.querySelectorAll('.options-group');
      existingGroups.forEach((group) => {
        group.classList.remove('current');
        group.classList.add('previous');
      });

      // Clear the options list if there are too many groups
      if (existingGroups.length >= 2) {
        // Keep only the most recent previous group
        while (optionsList.children.length > 1) {
          optionsList.removeChild(optionsList.firstChild);
        }
      }

      // Add the new group to the options list
      optionsList.appendChild(newOptionsGroup);

      // Ensure the new options are visible
      optionsList.scrollTop = optionsList.scrollHeight;
    } else {
      // Fallback if parsing fails
      questionEmoji.textContent = '🤔';
      questionTitle.textContent = 'What would you like to do?';

      // Create a new group for the fallback content
      const newOptionsGroup = document.createElement('div');
      newOptionsGroup.className = 'options-group current';

      const optionItem = document.createElement('div');
      optionItem.className = 'option-item';
      optionItem.textContent = response;
      newOptionsGroup.appendChild(optionItem);

      // Clear and add the new group to the options list
      optionsList.innerHTML = '';
      optionsList.appendChild(newOptionsGroup);
    }
  }

  // Display the solution
  function displaySolution(response) {
    // Hide question container and show solution container
    questionContainer.classList.add('hidden');
    solutionContainer.classList.remove('hidden');

    // Parse the solution sections
    const issueMatch = response.match(
      /\*\*🎯 Here's the likely issue:\*\*\n([\s\S]*?)(?=\n\n\*\*✅|\n\*\*✅)/
    );
    const stepsMatch = response.match(
      /\*\*✅ Try this:\*\*\n([\s\S]*?)(?=\n\n\*\*💡|\n\*\*💡|$)/
    );
    const tipMatch = response.match(/\*\*💡 Tip:\*\*([\s\S]*?)$/);

    // Set the issue description
    if (issueMatch && issueMatch.length > 1) {
      solutionDescription.textContent = issueMatch[1].trim();
    } else {
      solutionDescription.textContent =
        "We've identified a potential solution for you.";
    }

    // Set the steps
    solutionStepsList.innerHTML = '';
    if (stepsMatch && stepsMatch.length > 1) {
      const stepsText = stepsMatch[1].trim();
      const stepRegex = /\d+\.\s(.+?)(?=\n\d+\.|\n|$)/gs;
      let match;

      while ((match = stepRegex.exec(stepsText)) !== null) {
        const stepItem = document.createElement('li');
        stepItem.textContent = match[1].trim();
        solutionStepsList.appendChild(stepItem);
      }

      // If no steps were found using the regex, display the entire steps text
      if (solutionStepsList.children.length === 0) {
        const stepItem = document.createElement('li');
        stepItem.textContent = stepsText;
        solutionStepsList.appendChild(stepItem);
      }
    } else {
      const stepItem = document.createElement('li');
      stepItem.textContent = 'No specific steps were provided.';
      solutionStepsList.appendChild(stepItem);
    }

    // Set the tip
    if (tipMatch && tipMatch.length > 1) {
      solutionTipText.textContent = tipMatch[1].trim();
    } else {
      solutionTipText.textContent =
        "Keep track of what works for you and what doesn't.";
    }

    console.log('Solution displayed:', response);
  }

  // Reset the conversation
  function resetConversation() {
    // Reset conversation history
    conversationHistory = [];

    // Hide solution and question containers, show initial options
    solutionContainer.classList.add('hidden');
    questionContainer.classList.add('hidden');
    optionsContainer.classList.remove('hidden');

    // Add session end to markdown log
    if (markdownLog) {
      markdownLog += `## Session End\nSession ended at ${new Date().toLocaleString()}\n\n---\n\n`;
    }

    // Clear any displayed content
    questionEmoji.textContent = '🤔';
    questionTitle.textContent = 'What would you like to do?';

    // Clear all option groups
    optionsList.innerHTML = '';

    // Reset other elements
    solutionDescription.textContent = '';
    solutionStepsList.innerHTML = '';
    solutionTipText.textContent = '';

    console.log('Conversation reset. History cleared.');
  }

  // Developer Menu Functionality
  // Toggle developer menu
  devMenuToggle.addEventListener('click', () => {
    devMenu.classList.toggle('open');
  });

  // Close developer menu
  devMenuClose.addEventListener('click', () => {
    devMenu.classList.remove('open');
  });

  // Update temperature display
  temperatureSlider.addEventListener('input', () => {
    temperatureValue.textContent = temperatureSlider.value;
  });

  // Test connection to LLM
  testConnection.addEventListener('click', async () => {
    connectionStatus.textContent = 'Testing connection...';

    try {
      // Update API service settings from UI
      if (!apiToggle.checked) {
        apiService.setLocalEndpoint(localEndpointInput.value);
      } else {
        apiService.setOpenRouterModel(openRouterModelInput.value);
      }

      // Test the connection using the API service
      const data = await apiService.testConnection();

      connectionStatus.textContent = 'Connected successfully!';
      connectionStatus.style.color = '#4caf50';

      // Update model name display if available in the response
      if (data.model) {
        updateModelNameDisplay(data.model);
      }
    } catch (err) {
      connectionStatus.textContent = `Error: ${err.message}`;
      connectionStatus.style.color = '#f44336';
      console.error('Connection error:', err);
    }
  });

  // Send message to LLM in developer chat
  async function sendMessage() {
    const userInput = chatInput.value.trim();
    if (!userInput) return;

    // Add user message to chat
    addMessageToChat('user', userInput);
    chatInput.value = '';

    // Get temperature setting
    const temperature = parseFloat(temperatureSlider.value);

    // Create placeholder for LLM response
    const placeholderId = 'response-' + Date.now();
    addMessageToChat('llm', 'Thinking...', placeholderId);

    // Send request to LLM
    try {
      // Create a simple conversation for the developer chat
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: userInput },
      ];

      // Send the request using the API service
      const data = await apiService.sendRequest(messages, temperature);
      console.log('Received response:', data);

      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const reply = data.choices[0].message.content;
        updateMessage(placeholderId, reply);
      } else {
        throw new Error('Invalid response format from LLM');
      }
    } catch (err) {
      console.error('LLM error:', err);
      updateMessage(placeholderId, `Error: ${err.message}`);
    }
  }

  // Add message to chat
  function addMessageToChat(role, content, id = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;
    if (id) messageDiv.id = id;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Update message in chat
  function updateMessage(id, content) {
    const messageDiv = document.getElementById(id);
    if (messageDiv) {
      messageDiv.textContent = content;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // Send message on button click
  chatSend.addEventListener('click', sendMessage);

  // Send message on Enter key
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Copy markdown log to clipboard
  copyMarkdownButton.addEventListener('click', () => {
    if (!markdownLog) {
      copyStatus.textContent = 'No session data to copy';
      copyStatus.style.color = '#f44336';
      return;
    }

    navigator.clipboard
      .writeText(markdownLog)
      .then(() => {
        copyStatus.textContent = 'Copied to clipboard!';
        copyStatus.style.color = '#4caf50';
        setTimeout(() => {
          copyStatus.textContent = 'Ready to copy';
          copyStatus.style.color = '';
        }, 3000);
      })
      .catch((err) => {
        copyStatus.textContent = `Error: ${err.message}`;
        copyStatus.style.color = '#f44336';
      });
  });

  // Update model name display
  function updateModelNameDisplay(modelName) {
    if (modelName && modelName !== modelInput.value) {
      // Limit to 40 characters if needed
      const displayName =
        modelName.length > 40 ? modelName.substring(0, 40) + '...' : modelName;
      modelInput.value = displayName;
      console.log(`Updated model name display to: ${displayName}`);
    }
  }
});
