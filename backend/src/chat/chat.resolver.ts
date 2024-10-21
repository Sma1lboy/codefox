import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { ChatProxyService } from './chat.service';
import { ChatInput, ChatMessage } from './chat.model';

@Resolver()
export class ChatResolver {
  constructor(private chatProxyService: ChatProxyService) {}

  @Subscription(() => ChatMessage, {
    filter: (payload, variables) => !!payload.content,
    resolve: (payload) => payload,
  })
  chatStream(@Args('input') input: ChatInput) {
    return this.chatProxyService.streamChat(input.message);
  }
}
