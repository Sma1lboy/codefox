import React from 'react';
import ChatBottombar from './chat-bottombar';
import ChatTopbar from './chat-topbar';
import { ChatRequestOptions, Message } from '../types';
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
  stop: () => void;
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
  stop,
  setSelectedModel,
  chatId,
  loadingSubmit,
  formRef,
  isMobile,
  setInput,
  setMessages,
}: ChatProps) {
  // TODO(Sma1lboy): on message edit
  // onMessageEdit?: (messageId: string, newContent: string) => void;
  // const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  // const [editContent, setEditContent] = React.useState('');
  // const handleEditStart = (message: Message) => {
  //   setEditingMessageId(message.id);
  //   setEditContent(message.content);
  // };
  // const handleEditSubmit = (messageId: string) => {
  //   if (onMessageEdit) {
  //     onMessageEdit(messageId, editContent);
  //   }
  //   setEditingMessageId(null);
  //   setEditContent('');
  // };
  return (
    <div className="flex flex-col justify-between w-full max-w-3xl h-full ">
      <ChatTopbar />

      <ChatList messages={messages} loadingSubmit={loadingSubmit} />

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
