import React from 'react';
import ChatBottombar from './chat-bottombar';
import ChatTopbar from './chat-topbar';
import { ChatRequestOptions, Message } from '../../const/MessageType';
import ChatList from './chat-list';

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
  formRef: React.RefObject<HTMLFormElement>;
  isMobile?: boolean;
  setInput?: React.Dispatch<React.SetStateAction<string>>;
  setMessages: (messages: Message[]) => void;
}

export default function ChatContent({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  setSelectedModel,
  chatId,
  loadingSubmit,
  formRef,
  isMobile,
  setInput,
  setMessages,
}: ChatProps) {
  return (
    <div className="flex flex-col justify-between w-full h-full">
      <ChatTopbar />

      <ChatList messages={messages} loadingSubmit={loadingSubmit} />

      <ChatBottombar
        setSelectedModel={setSelectedModel}
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        formRef={formRef}
        setInput={setInput}
        setMessages={setMessages}
      />
    </div>
  );
}
