import {
  Resolver,
  Query,
  Mutation,
  Args,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { ChatService } from './chat.service.ts';
import { ChatMessageInput } from './chat.input.ts';
import { ChatMessage } from './chat.model.ts';

@Resolver()
export class ChatResolver {
  constructor(private chatService: ChatService) {}

  @Mutation(() => ChatResponse)
  async chat(@Args('input') input: ChatMessageInput): Promise<ChatMessage> {
    return this.chatService.generateResponse(input);
  }
}
@ObjectType()
export class ChatResponse {
  @Field(() => ChatMessage)
  content: ChatMessage;
}
