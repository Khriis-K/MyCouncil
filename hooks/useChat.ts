import { useState, useCallback } from 'react';
import { ChatMessage } from '../types';
import { sendCounselorChat } from '../services/CouncilService';

export const useChat = () => {
  const [chatHistory, setChatHistory] = useState<Record<string, ChatMessage[]>>({});
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});

  const sendMessage = useCallback(async (
    counselorId: string,
    messageText: string,
    dilemma: string,
    mbti: string | null
  ) => {
    if (!messageText.trim()) return;

    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageText,
      timestamp: Date.now()
    };

    // Optimistic update
    setChatHistory(prev => ({
      ...prev,
      [counselorId]: [...(prev[counselorId] || []), userMessage]
    }));

    // Set typing state
    setIsTyping(prev => ({ ...prev, [counselorId]: true }));

    try {
      // Prepare history for API (exclude IDs and timestamps)
      const historyForApi = (chatHistory[counselorId] || []).map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      const data = await sendCounselorChat(counselorId, dilemma, mbti, historyForApi, messageText);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'counselor',
        text: data.response,
        timestamp: Date.now()
      };

      setChatHistory(prev => ({
        ...prev,
        [counselorId]: [...(prev[counselorId] || []), aiMessage]
      }));

    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally handle error state (e.g. remove user message or show error)
    } finally {
      setIsTyping(prev => ({ ...prev, [counselorId]: false }));
    }
  }, [chatHistory]);

  return {
    chatHistory,
    isTyping,
    sendMessage
  };
};
