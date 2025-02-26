import { useQuery } from '@apollo/client';
import { GET_USER_CHATS } from '@/graphql/request';
import { Chat } from '@/graphql/type';
import { useState, useCallback, useMemo } from 'react';

export function useChatList() {
  const [chatListUpdated, setChatListUpdated] = useState(false);

  const {
    data: chatData,
    loading,
    error,
    refetch,
  } = useQuery<{ getUserChats: Chat[] }>(GET_USER_CHATS, {
    fetchPolicy: chatListUpdated ? 'network-only' : 'cache-first',
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleChatListUpdate = useCallback((value: boolean) => {
    setChatListUpdated(value);
  }, []);

  const sortedChats = useMemo(() => {
    const chats = chatData?.getUserChats || [];
    return [...chats].sort(
      (a: Chat, b: Chat) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [chatData?.getUserChats]);

  return {
    chats: sortedChats,
    loading,
    error,
    chatListUpdated,
    setChatListUpdated: handleChatListUpdate,
    refetchChats: handleRefetch,
  };
}
