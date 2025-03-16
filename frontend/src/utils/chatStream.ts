import { LocalStore } from '@/lib/storage';

export async function startChatStream(
  targetChatId: string,
  message: string,
  model: string
): Promise<string> {
  const token = localStorage.getItem(LocalStore.accessToken);

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      chatId: targetChatId,
      message,
      model,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Network response was not ok: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.content;
}
