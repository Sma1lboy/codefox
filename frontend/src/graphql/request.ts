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