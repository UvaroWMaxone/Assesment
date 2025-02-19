const API_KEY = 'AIzaSyAcVAVoO5t1dOgjPCeytscJaN03atpA6GQ';

function addAnswerButtons() {
  const questionWrappers = Array.from(document.getElementsByClassName('Paper-root'))
    .filter(el => Array.from(el.classList).some(className => /Question-root-\d+-\d+-\d+/.test(className)));

  questionWrappers.forEach(wrapper => {
    if (wrapper.querySelector('.ai-answer-button')) {
      return;
    }

    const button = document.createElement('button');
    button.className = 'ai-answer-button';
    button.textContent = 'Получить AI ответ';
    button.addEventListener('click', () => handleAIAnswer(wrapper));

    const possibleLocations = [
      wrapper.querySelector('.Question-buttonWrapper-0-2-138'),
      wrapper.querySelector('[class*="Question-buttonWrapper"]'),
      wrapper.querySelector('.answers-0-2-143'),
      wrapper.querySelector('[class*="answers-"]')
    ];
    const insertLocation = possibleLocations.find(location => location !== null);

    if (insertLocation) {
      insertLocation.appendChild(button);
    } else {
      wrapper.appendChild(button);
    }
  });
}

async function handleAIAnswer(questionWrapper) {
  try {
    const questionText = questionWrapper.querySelector('[class*="question-"]')?.textContent || "";
    const descriptionText = questionWrapper.querySelector('[class*="editor-"]')?.textContent || "";
    const answersElements = questionWrapper.querySelectorAll('.FormControlLabel-root .ql-editor');
    console.log(questionText);
    console.log(descriptionText);
    console.log(answersElements);
    showNotification('Ожидание ответа AI...');

    if (!answersElements.length) {
      throw new Error('Ответы не найдены');
    }

    const answers = Array.from(answersElements)
      .map(answer => answer.textContent.trim());

    if (!answers.length) {
      throw new Error('Нет валидных ответов');
    }

    const systemPrompt = `You are a test assistant. Answer the question in two lines:
Line 1: Just the numbers of the correct answer (1,2,3, etc. without spaces and extra characters or explanations).
Line 2: Detailed explanation of why this answer is correct.
Be precise and confident in your answers.`;
    const prompt = `Вопрос: ${questionText}\nОписание: ${descriptionText}\n\nВозможные ответы:\n${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nПроанализируй вопрос и выбери наиболее подходящие варианты ответа.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking-exp-01-21:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }],
        systemInstruction: {
            role: "user",
            parts: [
            {
                "text": prompt
            }
            ]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 64,
          topP: 0.95,
          maxOutputTokens: 65536,
          responseMimeType: "text/plain"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ошибка API: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Неверный формат ответа API');
    }

    let rawResponse = data.candidates[0].content.parts[0].text.trim();

    console.log("Raw response:", rawResponse);
    
    const lines = rawResponse.split("\n").filter(line => line.trim() !== "");
    if (lines.length < 2) {
      throw new Error("Формат ответа AI некорректен");
    }

    const selectedAnswersLine = lines[0].trim();
    const explanation = lines[1].trim();

    const selectedAnswers = selectedAnswersLine.split(",").map(num => parseInt(num, 10)).filter(num => !isNaN(num));

    showNotification(`Ответ: ${selectedAnswers}\n\n${explanation}`);

    console.log("Selected answers:", selectedAnswers);

    const inputs = questionWrapper.querySelectorAll('.FormControlLabel-root input.Radio-input');
    console.log(inputs)
    selectedAnswers.forEach(index => {
      if (inputs[index - 1]) {
        console.log("Clicking", inputs[index - 1]);
        inputs[index - 1].click();
      }
    });
  } catch (error) {
    console.error('Ошибка в handleAIAnswer:', error);
    showNotification(`Ошибка: ${error.message}`);
  }
}

function showNotification(message) {
  const existingNotification = document.querySelector('.ai-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'ai-notification';
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

try {
  const observer = new MutationObserver((mutations) => {
    try {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          addAnswerButtons();
        }
      });
    } catch (error) {
      console.error('Ошибка в MutationObserver:', error);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  addAnswerButtons();
} catch (error) {
  console.error('Ошибка при установке наблюдателя:', error);
}
