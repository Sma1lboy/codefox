import React from 'react';
import ChatBottombar from './chat-bottombar';
import ChatList from './chat-list';
import ChatTopbar from './chat-topbar';
import { ChatRequestOptions, Message } from '../types';

export interface ChatProps {
  chatId?: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  loadingSubmit?: boolean;
  stop: () => void;
  formRef: React.RefObject<HTMLFormElement>;
  isMobile?: boolean;
  setInput?: React.Dispatch<React.SetStateAction<string>>;
  setMessages: (messages: Message[]) => void;
}

export default function Chat({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  stop,
  setSelectedModel,
  chatId,
  loadingSubmit,
  formRef,
  isMobile,
  setInput,
  setMessages,
}: ChatProps) {
  return (
    <div className="flex flex-col justify-between w-full max-w-3xl h-full ">
      <ChatTopbar
        setSelectedModel={setSelectedModel}
        chatId={chatId}
        messages={messages}
        setMessages={setMessages}
      />

      <ChatList
        setSelectedModel={setSelectedModel}
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        loadingSubmit={loadingSubmit}
        stop={stop}
        formRef={formRef}
        isMobile={isMobile}
        setMessages={setMessages}
      />

      <ChatBottombar
        setSelectedModel={setSelectedModel}
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        stop={stop}
        formRef={formRef}
        setInput={setInput}
        setMessages={setMessages}
      />
    </div>
  );
}
