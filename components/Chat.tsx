import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatRole } from '../types';
import SendIcon from './icons/SendIcon';
import LoadingSpinner from './icons/LoadingSpinner';
import { useLanguage } from '../hooks/useLanguage';
import NewChatIcon from './icons/NewChatIcon';
import LatexRenderer from './LatexRenderer';
import { streamChatResponse } from '../services/geminiService';

interface ChatProps {
  isEnabled: boolean;
  onNewChat: () => void;
}

const Chat: React.FC<ChatProps> = ({ isEnabled, onNewChat }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  // Clear chat when new chat button is used
  const handleNewChat = () => {
    setMessages([]);
    onNewChat();
  }


  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: ChatRole.USER, text: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const stream = await streamChatResponse(currentMessages, input, language);
      if (!stream) throw new Error("Could not get stream.");
      
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let modelResponseText = '';
      
      const modelMessage: ChatMessage = { role: ChatRole.MODEL, text: '' };
      setMessages(prev => [...prev, modelMessage]);

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            if (line.trim() === '') continue;
            try {
                const chunk = JSON.parse(line);
                if (chunk.text) {
                    modelResponseText += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        if (newMessages.length > 0) {
                            newMessages[newMessages.length - 1].text = modelResponseText;
                        }
                        return newMessages;
                    });
                }
            } catch (e) {
                console.error("Error parsing JSON chunk from stream:", line, e);
            }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = { role: ChatRole.MODEL, text: t('chatError') };
      setMessages(prev => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-800 rounded-lg border border-gray-700 shadow-lg`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-xl font-bold text-blue-400 text-start">
          {t('tutorTitle')}
        </h2>
        <button 
          onClick={handleNewChat}
          className="text-gray-400 hover:text-blue-400 transition-colors p-1 rounded-md"
          aria-label={t('newChat')}
          title={t('newChat')}
        >
          <NewChatIcon className="w-5 h-5"/>
        </button>
      </div>
      <div className="flex-grow p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>{isEnabled ? t('followUpPlaceholder') : t('disabledChatPlaceholder')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === ChatRole.USER ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${msg.role === ChatRole.USER ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                   <LatexRenderer className="whitespace-pre-wrap text-start">{msg.text}</LatexRenderer>
                </div>
              </div>
            ))}
             {isStreaming && messages[messages.length - 1]?.role === ChatRole.MODEL && (
                 <div className="flex justify-start">
                     <div className="max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg bg-gray-700 text-gray-200">
                        <LoadingSpinner className="w-5 h-5"/>
                     </div>
                 </div>
             )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className={`p-4 border-t border-gray-700 flex-shrink-0`}>
        <div className="flex items-center bg-gray-900 rounded-lg">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('askAQuestion')}
            className="w-full bg-transparent p-3 focus:outline-none text-gray-200 placeholder-gray-500"
            disabled={!isEnabled || isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!isEnabled || isStreaming || !input.trim()}
            className="p-3 text-blue-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon className={`w-6 h-6 ${language === 'ar' ? 'transform -scale-x-100' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;