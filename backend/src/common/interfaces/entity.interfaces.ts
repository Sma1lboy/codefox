import { MessageRole } from '../../chat/message.model';

export interface IUser {
  id: string;
  username: string;
  email: string;
  chats?: IChat[];
  roles?: any[];
}

export interface IChat {
  id: string;
  title?: string;
  messages?: IMessage[];
  user?: IUser;
  userId?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMessage {
  id: string;
  content: string;
  role: MessageRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isDeleted: boolean;
}
