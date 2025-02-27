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
      id
      created
      choices {
        delta {
          content
        }
        finishReason
        index
      }
      model
      object
    }
  }
`;

export const GET_USER_CHATS = gql`
  query GetUserChats {
    getUserChats {
      id
      title
      createdAt
      messages {
        id
        content
        role
        createdAt
      }
    }
  }
`;

export const DELETE_CHAT = gql`
  mutation DeleteChat($chatId: String!) {
    deleteChat(chatId: $chatId)
  }
`;

export const GET_USER_INFO = gql`
  query me {
    me {
      username
      email
    }
  }
`;

export const CHAT_STREAM = gql`
  subscription ChatStream($input: ChatInputType!) {
    chatStream(input: $input) {
      id
      created
      choices {
        delta {
          content
        }
        finishReason
        index
      }
      model
      object
      status
    }
  }
`;

export const TRIGGER_CHAT = gql`
  mutation TriggerChatStream($input: ChatInputType!) {
    triggerChatStream(input: $input)
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($createProjectInput: CreateProjectInput!) {
    createProject(createProjectInput: $createProjectInput) {
      id
      title
      createdAt
      updatedAt
    }
  }
`;

export const GET_CHAT_DETAILS = gql`
  query GetChatDetails($chatId: String!) {
    getChatDetails(chatId: $chatId) {
      id
      messages {
        id
        content
        role
        createdAt
      }
      project {
        id
        projectPath
      }
    }
  }
`;

export const GET_CUR_PROJECT = gql`
  query GetCurProject($chatId: String!) {
    getCurProject(chatId: $chatId) {
      id
      name
      description
      projectPath
    }
  }
`;
export const SAVE_MESSAGE = gql`
  mutation SaveMessage($input: ChatInput!) {
    saveMessage(input: $input)
  }
`;