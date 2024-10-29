import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginUserInput!) {
    login(input: $input) {
      accessToken
    }
  }
`;

export const CHECK_TOKEN_QUERY = gql`
  query CheckToken($input: CheckTokenInput!) {
    checkToken(input: $input)
  }
`;
export const REGISTER_MUTATION = gql`
  mutation RegisterUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
      username
    }
  }
`;

export const GET_MODEL_TAGS = gql`
  query GetAvailableModelTags {
    getAvailableModelTags
  }
`;

export interface ModelTagsData {
  getAvailableModelTags: string[];
}

export const CREATE_CHAT = gql`
  mutation CreateChat($input: NewChatInput!) {
    createChat(newChatInput: $input) {
      id
      title
      isActive
      createdAt
    }
  }
`;

export const SAVE_CHAT_HISTORY = gql`
  mutation SaveChatHistory($chatId: String!, $messages: [MessageInput!]!) {
    saveChatHistory(chatId: $chatId, messages: $messages) {
      id
      content
      role
      createdAt
    }
  }
`;

export const GET_CHAT_HISTORY = gql`
  query GetChatHistory($chatId: String!) {
    getChatHistory(chatId: $chatId) {
      id
      content
      role
      createdAt
    }
  }
`;

export const CHAT_STREAM_SUBSCRIPTION = gql`
  subscription ChatStream($input: ChatInputType!) {
    chatStream(input: $input) {
      choices {
        delta {
          content
        }
        finish_reason
        index
      }
      created
      id
      model
      object
    }
  }
`;
