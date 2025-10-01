/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat, Type } from '@google/genai';

// --- Type Definitions ---
// For browsers that use the webkit prefix.
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// --- DOM Element References ---
// Main Views
const talkView = document.getElementById('talk-view') as HTMLElement;
const audioCardView = document.getElementById('audio-card-view') as HTMLElement;
const guessWordView = document.getElementById('guess-word-view') as HTMLElement;

// Mode Switcher
const talkModeBtn = document.getElementById('talk-mode-btn') as HTMLButtonElement;
const audioCardModeBtn = document.getElementById('audio-card-mode-btn') as HTMLButtonElement;
const guessWordModeBtn = document.getElementById('guess-word-mode-btn') as HTMLButtonElement;

// Conversation View
const chatContainer = document.getElementById('chat-container') as HTMLElement;
const talkBtn = document.getElementById('talk-btn') as HTMLButtonElement;
const talkStatus = document.getElementById('talk-status') as HTMLElement;

// Audio Cards Game
const audioCardImageContainer = document.getElementById('audio-card-image-container') as HTMLElement;
const audioCardWord = document.getElementById('audio-card-word') as HTMLElement;
const listenBtn = document.getElementById('listen-btn') as HTMLButtonElement;
const speakBtn = document.getElementById('speak-btn') as HTMLButtonElement;
const audioCardFeedback = document.getElementById('audio-card-feedback') as HTMLElement;
const prevCardBtn = document.getElementById('prev-card-btn') as HTMLButtonElement;
const nextCardBtn = document.getElementById('next-card-btn') as HTMLButtonElement;

// Guess Word Game
const guessWordQuestion = document.getElementById('guess-word-question') as HTMLElement;
const guessWordOptions = document.getElementById('guess-word-options') as HTMLElement;
const guessWordFeedback = document.getElementById('guess-word-feedback') as HTMLElement;

// Score
const starCount = document.getElementById('star-count') as HTMLElement;

// --- Gemini AI Initialization ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

const chat: Chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
        systemInstruction: `You are SparkyTeacher, a friendly and patient English teacher for an 8-year-old child.
        - Your goal is a natural, encouraging conversation.
        - If the user makes a pronunciation or grammatical error, gently correct it within your response. Wrap the corrected word(s) in double asterisks, like **this**.
        - Example: If the user says "I see a sheeps", you should respond with "Oh, you see some **sheep**! How many **sheep** do you see?".
        - CRITICAL: Always use very simple vocabulary and short sentences. The user is a young beginner.
        - Always ask a simple question to keep the conversation going.
        - Keep responses in English. The conversation is audio-only.`,
    },
});

// --- App State ---
let currentMode: 'talk' | 'audio' | 'guess' = 'talk';
let score = 0;
// Expanded vocabulary deck
const flashcardDeck = [
    // Animals
    'ant', 'bear', 'bee', 'bird', 'butterfly', 'camel', 'cat', 'chicken', 'cow', 'crab', 'crocodile', 'deer', 'dog', 'dolphin', 'duck', 'elephant', 'fish', 'fly', 'fox', 'frog', 'giraffe', 'goat', 'hamster', 'horse', 'jellyfish', 'lion', 'monkey', 'mouse', 'octopus', 'owl', 'panda', 'penguin', 'pig', 'rabbit', 'shark', 'sheep', 'snake', 'spider', 'squirrel', 'starfish', 'tiger', 'turtle', 'whale', 'wolf', 'zebra',
    // Nature
    'cloud', 'flower', 'forest', 'grass', 'island', 'jungle', 'leaf', 'moon', 'mountain', 'ocean', 'planet', 'rain', 'rainbow', 'river', 'rock', 'sand', 'sea', 'sky', 'snow', 'star', 'stone', 'sun', 'tree', 'volcano', 'water', 'wind',
    // Human Body
    'arm', 'back', 'beard', 'body', 'bone', 'brain', 'cheek', 'chest', 'chin', 'ear', 'elbow', 'eye', 'face', 'finger', 'foot', 'hair', 'hand', 'head', 'heart', 'knee', 'leg', 'lip', 'mouth', 'nail', 'neck', 'nose', 'shoulder', 'skin', 'stomach', 'teeth', 'thumb', 'toe', 'tongue',
    // Science & Space
    'atom', 'comet', 'dinosaur', 'earth', 'electricity', 'energy', 'fire', 'ice', 'magnet', 'microscope', 'robot', 'rocket', 'satellite', 'space', 'telescope',
    // Sports & Hobbies
    'ball', 'balloon', 'baseball', 'basketball', 'bicycle', 'book', 'camera', 'computer', 'controller', 'dice', 'doll', 'drawing', 'drum', 'football', 'game', 'guitar', 'jump', 'kite', 'music', 'paint', 'piano', 'puzzle', 'read', 'run', 'sing', 'soccer', 'swim', 'swing', 'tennis', 'toy', 'walk',
    // Food
    'apple', 'banana', 'bread', 'breakfast', 'cake', 'candy', 'carrot', 'cheese', 'chocolate', 'cookie', 'corn', 'dinner', 'egg', 'fork', 'fruit', 'grape', 'ice cream', 'juice', 'lemon', 'lunch', 'milk', 'onion', 'orange', 'pizza', 'potato', 'rice', 'salad', 'salt', 'sandwich', 'soup', 'spoon', 'strawberry', 'sugar', 'tomato', 'vegetable',
    // Objects & Places
    'airport', 'backpack', 'bank', 'bathroom', 'bed', 'bedroom', 'bell', 'boat', 'box', 'bridge', 'bus', 'car', 'castle', 'chair', 'city', 'classroom', 'clock', 'clothes', 'coat', 'door', 'dress', 'farm', 'flag', 'floor', 'hat', 'hospital', 'house', 'jacket', 'key', 'kitchen', 'lamp', 'letter', 'library', 'map', 'money', 'motorcycle', 'pants', 'paper', 'pen', 'pencil', 'phone', 'picture', 'plane', 'police', 'present', 'radio', 'room', 'school', 'scissors', 'screen', 'shirt', 'shoes', 'shop', 'sofa', 'store', 'street', 'subway', 'table', 'taxi', 'television', 'towel', 'train', 'truck', 'umbrella', 'village', 'window', 'world'
];
let shuffledDeck: string[] = [];
let currentCardIndex = 0;
let isRecognizing = false;

// --- Web Speech API Initialization ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: any;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
} else {
    console.warn("Speech Recognition not supported in this browser.");
    talkBtn.disabled = true;
    speakBtn.disabled = true;
    audioCardFeedback.textContent = "Lo siento, el reconocimiento de voz no está disponible en este navegador.";
    talkStatus.textContent = "Reconocimiento de voz no disponible."
}

// --- Utility Functions ---

function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- UI Helper Functions ---

function setTalkState(isBusy: boolean, status: string) {
    talkBtn.disabled = isBusy;
    talkBtn.classList.toggle('recording', isBusy);
    talkStatus.textContent = status;
}

function addChatMessage(html: string, sender: 'user' | 'ai'): HTMLElement {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.innerHTML = html; // Use innerHTML to render bold tags
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return messageElement;
}

function showChatLoadingIndicator(): HTMLElement {
    const aiMessageElement = document.createElement('div');
    aiMessageElement.classList.add('message', 'ai');
    
    const textLoader = document.createElement('span');
    textLoader.classList.add('loader');
    
    aiMessageElement.appendChild(textLoader);
    chatContainer.appendChild(aiMessageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return aiMessageElement;
}

function speakText(text: string, onEnd?: () => void) {
    if (!('speechSynthesis' in window)) {
        console.warn("Speech Synthesis not supported.");
        onEnd?.();
        return;
    }
    const cleanText = text.replace(/\*\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // Slower speed
    utterance.pitch = 1.1; // Slightly higher pitch
    utterance.onend = onEnd;
    speechSynthesis.speak(utterance);
}

// --- Mode Switching Logic ---

function switchMode(mode: 'talk' | 'audio' | 'guess') {
    if (currentMode === mode) return; // Don't re-initialize if clicking the same mode
    currentMode = mode;

    // Toggle views
    talkView.classList.toggle('hidden', mode !== 'talk');
    audioCardView.classList.toggle('hidden', mode !== 'audio');
    guessWordView.classList.toggle('hidden', mode !== 'guess');

    // Toggle active button
    talkModeBtn.classList.toggle('active', mode === 'talk');
    audioCardModeBtn.classList.toggle('active', mode === 'audio');
    guessWordModeBtn.classList.toggle('active', mode === 'guess');
    
    // Initialize game modes
    if (mode === 'audio') {
        shuffledDeck = shuffleArray([...flashcardDeck]);
        currentCardIndex = 0;
        loadAudioCard(currentCardIndex);
    } else if (mode === 'guess') {
        shuffledDeck = shuffleArray([...flashcardDeck]);
        currentCardIndex = 0;
        loadGuessWordCard(currentCardIndex);
    }
}


// --- Flashcard Logic: Audio Cards Game ---

async function loadAudioCard(index: number) {
    // Update navigation button states
    prevCardBtn.disabled = index <= 0;
    nextCardBtn.disabled = index >= shuffledDeck.length - 1;

    if (index >= shuffledDeck.length) {
        audioCardWord.textContent = "¡Lo conseguiste!";
        audioCardImageContainer.innerHTML = '🎉';
        audioCardImageContainer.style.fontSize = '5rem';
        listenBtn.disabled = true;
        speakBtn.disabled = true;
        prevCardBtn.disabled = true;
        nextCardBtn.disabled = true;
        audioCardFeedback.textContent = `¡Buen trabajo! ¡Has terminado el mazo!`;
        return;
    }
    
    const word = shuffledDeck[index];
    audioCardWord.textContent = word;
    audioCardImageContainer.innerHTML = '<span class="loader"></span>';
    audioCardFeedback.textContent = "¡Haz clic en el micro y di la palabra!";
    audioCardFeedback.classList.remove('correct', 'incorrect');
    listenBtn.disabled = false;
    speakBtn.disabled = false;
    
    try {
        const imagePrompt = `A very simple, cute cartoon of a single "${word}" on a plain white background, for a child's flashcard.`;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
        });
        
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = word;
        
        audioCardImageContainer.innerHTML = '';
        audioCardImageContainer.appendChild(img);
    } catch (error) {
        console.error("Flashcard image generation error:", error);
        audioCardImageContainer.textContent = '🖼️';
    }
}

function handleListen() {
    speakText(shuffledDeck[currentCardIndex]);
}

function handleSpeakAudioCard() {
    if (!recognition || isRecognizing) return;
    isRecognizing = true;
    speakBtn.classList.add('recording');
    audioCardFeedback.textContent = "Escuchando...";
    recognition.start();
}

function handlePrevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        loadAudioCard(currentCardIndex);
    }
}

function handleNextCard() {
    if (currentCardIndex < shuffledDeck.length - 1) {
        currentCardIndex++;
        loadAudioCard(currentCardIndex);
    }
}

async function handleAudioCardRecognitionResult(event: any) {
    const spokenText = event.results[0][0].transcript.toLowerCase().trim().replace('.', '');
    const correctText = shuffledDeck[currentCardIndex];
    
    audioCardFeedback.classList.remove('correct', 'incorrect');

    if (spokenText === correctText) {
        speakBtn.disabled = true;
        listenBtn.disabled = true;
        
        audioCardFeedback.textContent = "Buena pronunciación";
        audioCardFeedback.classList.add('correct');

        score++;
        starCount.textContent = score.toString();
        
        setTimeout(() => {
            currentCardIndex++;
            loadAudioCard(currentCardIndex);
        }, 1500);

    } else {
        audioCardFeedback.textContent = "Vuelve a intentarlo";
        audioCardFeedback.classList.add('incorrect');
        
        setTimeout(() => {
            audioCardFeedback.classList.remove('incorrect');
            audioCardFeedback.textContent = "¡Haz clic en el micro y di la palabra!";
        }, 2000);
    }
}

// --- Flashcard Logic: Guess the Word Game ---

async function loadGuessWordCard(index: number) {
     if (index >= shuffledDeck.length) {
        guessWordQuestion.textContent = "¡Has terminado!";
        guessWordOptions.innerHTML = '🎉';
        guessWordFeedback.textContent = `¡Fantástico trabajo!`;
        return;
    }
    const word = shuffledDeck[index];
    guessWordQuestion.textContent = word;
    guessWordOptions.innerHTML = '<span class="loader"></span>';
    guessWordFeedback.textContent = '¿Cuál es la traducción correcta?';

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `For the English word "${word}", provide its Spanish translation and two plausible but incorrect Spanish distractors for a multiple-choice quiz aimed at an 8-year-old.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        correct: { type: Type.STRING, description: 'The correct Spanish translation.' },
                        distractor1: { type: Type.STRING, description: 'A plausible but incorrect Spanish translation.' },
                        distractor2: { type: Type.STRING, description: 'Another plausible but incorrect Spanish translation.' }
                    }
                }
            }
        });

        const jsonResponse = JSON.parse(response.text);
        const options = shuffleArray([
            { text: jsonResponse.correct, correct: true },
            { text: jsonResponse.distractor1, correct: false },
            { text: jsonResponse.distractor2, correct: false }
        ]);

        guessWordOptions.innerHTML = '';
        options.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option.text;
            button.classList.add('guess-option-btn');
            if (option.correct) {
                button.dataset.correct = "true";
            }
            button.onclick = () => handleGuessWordAnswer(option.correct, button);
            guessWordOptions.appendChild(button);
        });

    } catch (error) {
        console.error("Error generating guess options:", error);
        guessWordOptions.textContent = 'Error al cargar. Reintentando...';
        // Retry after a short delay
        setTimeout(() => loadGuessWordCard(index), 1500);
    }
}

function handleGuessWordAnswer(isCorrect: boolean, button: HTMLButtonElement) {
    // Disable all buttons to prevent multiple clicks
    document.querySelectorAll('.guess-option-btn').forEach(btn => {
        (btn as HTMLButtonElement).disabled = true;
    });

    if (isCorrect) {
        button.classList.add('correct');
        guessWordFeedback.textContent = '¡Correcto! ⭐';
        score++;
        starCount.textContent = score.toString();
        setTimeout(() => {
            currentCardIndex++;
            loadGuessWordCard(currentCardIndex);
        }, 1200);
    } else {
        button.classList.add('incorrect');
        const correctButton = guessWordOptions.querySelector<HTMLButtonElement>('[data-correct="true"]');
        if (correctButton) {
            correctButton.classList.add('correct');
            guessWordFeedback.textContent = `¡Casi! La respuesta correcta es "${correctButton.textContent}".`;
        } else {
            guessWordFeedback.textContent = '¡Oh! Esa no es. Intenta la siguiente.';
        }
        
        setTimeout(() => {
            currentCardIndex++;
            loadGuessWordCard(currentCardIndex);
        }, 2500);
    }
}


// --- Conversation Logic ---
function handleSpeakConversation() {
    if (!recognition || isRecognizing) return;
    isRecognizing = true;
    setTalkState(true, "Escuchando...");
    recognition.start();
}

async function sendUserMessageToAI(userInput: string) {
    setTalkState(true, "SparkyTeacher está pensando...");
    const aiMessageElement = showChatLoadingIndicator();

    try {
        const responseStream = await chat.sendMessageStream({ message: userInput });
        
        let firstChunk = true;
        let fullResponse = '';
        for await (const chunk of responseStream) {
             if (firstChunk && chunk.text) {
                aiMessageElement.innerHTML = ''; // Clear loader
                firstChunk = false;
            }
            const text = chunk.text;
            fullResponse += text;
            aiMessageElement.innerHTML = fullResponse.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        speakText(fullResponse, () => {
             setTalkState(false, "Pulsa el micro para hablar");
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        aiMessageElement.textContent = '¡Uy! Algo salió mal. Por favor, inténtalo de nuevo.';
        setTalkState(false, "Pulsa el micro para hablar");
    }
}

async function handleConversationRecognitionResult(event: any) {
    const userInput = event.results[0][0].transcript;
    addChatMessage(userInput, 'user');
    await sendUserMessageToAI(userInput);
}


// --- Event Handlers ---

talkModeBtn.addEventListener('click', () => switchMode('talk'));
audioCardModeBtn.addEventListener('click', () => switchMode('audio'));
guessWordModeBtn.addEventListener('click', () => switchMode('guess'));

// Audio Card buttons
listenBtn.addEventListener('click', handleListen);
speakBtn.addEventListener('click', handleSpeakAudioCard);
prevCardBtn.addEventListener('click', handlePrevCard);
nextCardBtn.addEventListener('click', handleNextCard);

// Conversation starter buttons
document.querySelectorAll('.starter-phrase').forEach(button => {
    button.addEventListener('click', () => {
        const phrase = button.textContent;
        if (phrase) {
            addChatMessage(phrase, 'user');
            sendUserMessageToAI(phrase);
        }
    });
});

// Conversation button
talkBtn.addEventListener('click', handleSpeakConversation);

if(recognition) {
    recognition.onresult = (event: any) => {
        if (currentMode === 'audio') {
            handleAudioCardRecognitionResult(event);
        } else if (currentMode === 'talk') {
            handleConversationRecognitionResult(event);
        }
    };

    recognition.onend = () => {
        isRecognizing = false;
        if(currentMode === 'audio') {
            speakBtn.classList.remove('recording');
        } 
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        isRecognizing = false;
        if(currentMode === 'audio') {
            audioCardFeedback.textContent = "No te he entendido. Por favor, inténtalo de nuevo.";
            speakBtn.classList.remove('recording');
        } else if (currentMode === 'talk') {
            setTalkState(false, "No te he entendido. ¡Inténtalo de nuevo!");
        }
    };
}


// --- Initial State ---

function initializeApp() {
    addChatMessage("¡Hola! Soy SparkyTeacher. ¡Pulsa el botón del micrófono y hablemos en inglés!", 'ai');
}

initializeApp();