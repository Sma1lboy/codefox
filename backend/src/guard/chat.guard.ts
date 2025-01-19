import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class ChatGuard implements CanActivate {
  constructor(
    private readonly chatService: ChatService, // Inject ChatService to fetch chat details
    private readonly jwtService: JwtService, // JWT Service to verify tokens
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req;

    // Extract the authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    // Decode the token to get user information
    const token = authHeader.split(' ')[1];
    let user: any;
    try {
      user = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    // Extract chatId from the request arguments
    const args = gqlContext.getArgs();
    const { chatId } = args;

    // check if the user is part of the chat
    const chat = await this.chatService.getChatWithUser(chatId);
    if (!chat) {
      throw new UnauthorizedException('Chat not found');
    }

    if (chat.user.id !== user.userId) {
      throw new UnauthorizedException(
        'User is not authorized to access this chat',
      );
    }

    return true;
  }
}

// @Injectable()
// export class MessageGuard implements CanActivate {
//   constructor(
//     private readonly chatService: ChatService, // Inject ChatService to fetch chat details
//     private readonly jwtService: JwtService, // JWT Service to verify tokens
//   ) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const gqlContext = GqlExecutionContext.create(context);
//     const request = gqlContext.getContext().req;

//     // Extract the authorization header
//     const authHeader = request.headers.authorization;
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       throw new UnauthorizedException('Authorization token is missing');
//     }

//     // Decode the token to get user information
//     const token = authHeader.split(' ')[1];
//     let user: any;
//     try {
//       user = this.jwtService.verify(token);
//     } catch (error) {
//       throw new UnauthorizedException('Invalid token');
//     }

//     // Extract chatId from the request arguments
//     const args = gqlContext.getArgs();
//     const { messageId } = args;

//     // Fetch the message and its associated chat
//     const message = await this.chatService.getMessageById(messageId);
//     if (!message) {
//       throw new UnauthorizedException('Message not found');
//     }

//     // Ensure that the user is part of the chat the message belongs to
//     const chat = message.chat;
//     if (chat.user.id !== user.userId) {
//       throw new UnauthorizedException(
//         'User is not authorized to access this message',
//       );
//     }

//     return true;
//   }
// }

@Injectable()
export class ChatSubscriptionGuard implements CanActivate {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);

    // For WebSocket context: get token from connectionParams
    const token = gqlContext
      .getContext()
      .connectionParams?.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    let user: any;
    try {
      user = this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }

    // Extract chatId from the subscription arguments
    const args = gqlContext.getArgs();
    const { chatId } = args;

    // Check if the user is part of the chat
    const chat = await this.chatService.getChatWithUser(chatId);
    if (!chat || !chat.user || chat.user.id !== user.userId) {
      throw new UnauthorizedException(
        'User is not authorized to access this chat',
      );
    }

    return true;
  }
}
