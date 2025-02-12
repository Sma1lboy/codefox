import { AuthGuard } from '@/components/auth/AuthGuard';
import ChatContent from '@/components/chat/chat';

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}