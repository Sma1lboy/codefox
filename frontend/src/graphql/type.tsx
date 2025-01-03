import {
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
} from 'graphql';
import { gql } from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** Date custom scalar type */
  Date: { input: Date; output: Date };
};

export type Chat = {
  __typename: 'Chat';
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDeleted: Scalars['Boolean']['output'];
  messages?: Maybe<Array<Message>>;
  title?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['Date']['output'];
  user: User;
};

export type ChatCompletionChoiceType = {
  __typename: 'ChatCompletionChoiceType';
  delta: ChatCompletionDeltaType;
  finishReason?: Maybe<Scalars['String']['output']>;
  index: Scalars['Float']['output'];
};

export type ChatCompletionChunkType = {
  __typename: 'ChatCompletionChunkType';
  choices: Array<ChatCompletionChoiceType>;
  created: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  model: Scalars['String']['output'];
  object: Scalars['String']['output'];
  status: StreamStatus;
  systemFingerprint?: Maybe<Scalars['String']['output']>;
};

export type ChatCompletionDeltaType = {
  __typename: 'ChatCompletionDeltaType';
  content?: Maybe<Scalars['String']['output']>;
};

export type ChatInputType = {
  chatId: Scalars['String']['input'];
  message: Scalars['String']['input'];
  model: Scalars['String']['input'];
};

export type CheckTokenInput = {
  token: Scalars['String']['input'];
};

export type LoginResponse = {
  __typename: 'LoginResponse';
  accessToken: Scalars['String']['output'];
};

export type LoginUserInput = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Menu = {
  __typename: 'Menu';
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDeleted: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  permission: Scalars['String']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type Message = {
  __typename: 'Message';
  content: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDeleted: Scalars['Boolean']['output'];
  modelId?: Maybe<Scalars['String']['output']>;
  role: Role;
  updatedAt: Scalars['Date']['output'];
};

export type Mutation = {
  __typename: 'Mutation';
  clearChatHistory: Scalars['Boolean']['output'];
  createChat: Chat;
  deleteChat: Scalars['Boolean']['output'];
  deleteProject: Scalars['Boolean']['output'];
  login: LoginResponse;
  registerUser: User;
  removePackageFromProject: Scalars['Boolean']['output'];
  triggerChatStream: Scalars['Boolean']['output'];
  updateChatTitle?: Maybe<Chat>;
  updateProjectPath: Scalars['Boolean']['output'];
  upsertProject: Project;
};

export type MutationClearChatHistoryArgs = {
  chatId: Scalars['String']['input'];
};

export type MutationCreateChatArgs = {
  newChatInput: NewChatInput;
};

export type MutationDeleteChatArgs = {
  chatId: Scalars['String']['input'];
};

export type MutationDeleteProjectArgs = {
  projectId: Scalars['String']['input'];
};

export type MutationLoginArgs = {
  input: LoginUserInput;
};

export type MutationRegisterUserArgs = {
  input: RegisterUserInput;
};

export type MutationRemovePackageFromProjectArgs = {
  packageId: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type MutationTriggerChatStreamArgs = {
  input: ChatInputType;
};

export type MutationUpdateChatTitleArgs = {
  updateChatTitleInput: UpdateChatTitleInput;
};

export type MutationUpdateProjectPathArgs = {
  newPath: Scalars['String']['input'];
  projectId: Scalars['String']['input'];
};

export type MutationUpsertProjectArgs = {
  upsertProjectInput: UpsertProjectInput;
};

export type NewChatInput = {
  title?: InputMaybe<Scalars['String']['input']>;
};

export type Project = {
  __typename: 'Project';
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDeleted: Scalars['Boolean']['output'];
  path: Scalars['String']['output'];
  projectName: Scalars['String']['output'];
  projectPackages?: Maybe<Array<ProjectPackages>>;
  updatedAt: Scalars['Date']['output'];
  userId: Scalars['ID']['output'];
};

export type ProjectPackages = {
  __typename: 'ProjectPackages';
  content: Scalars['String']['output'];
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  isDeleted: Scalars['Boolean']['output'];
  project_id: Scalars['ID']['output'];
  updatedAt: Scalars['Date']['output'];
};

export type Query = {
  __typename: 'Query';
  checkToken: Scalars['Boolean']['output'];
  getAvailableModelTags?: Maybe<Array<Scalars['String']['output']>>;
  getChatDetails?: Maybe<Chat>;
  getChatHistory: Array<Message>;
  getHello: Scalars['String']['output'];
  getMessageDetail?: Maybe<Message>;
  getProjectDetails: Project;
  getUserChats?: Maybe<Array<Chat>>;
  getUserProjects: Array<Project>;
  logout: Scalars['Boolean']['output'];
  me: User;
};

export type QueryCheckTokenArgs = {
  input: CheckTokenInput;
};

export type QueryGetChatDetailsArgs = {
  chatId: Scalars['String']['input'];
};

export type QueryGetChatHistoryArgs = {
  chatId: Scalars['String']['input'];
};

export type QueryGetMessageDetailArgs = {
  messageId: Scalars['String']['input'];
};

export type QueryGetProjectDetailsArgs = {
  projectId: Scalars['String']['input'];
};

export type RegisterUserInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Role = 'Model' | 'User';

export type StreamStatus = 'DONE' | 'STREAMING';

export type Subscription = {
  __typename: 'Subscription';
  chatStream?: Maybe<ChatCompletionChunkType>;
};

export type SubscriptionChatStreamArgs = {
  input: ChatInputType;
};

export type UpdateChatTitleInput = {
  chatId: Scalars['String']['input'];
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpsertProjectInput = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
  projectName: Scalars['String']['input'];
  projectPackages?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type User = {
  __typename: 'User';
  chats: Array<Chat>;
  createdAt: Scalars['Date']['output'];
  email: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  isDeleted: Scalars['Boolean']['output'];
  updatedAt: Scalars['Date']['output'];
  username: Scalars['String']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<
    { [key in TKey]: TResult },
    TParent,
    TContext,
    TArgs
  >;
  resolve?: SubscriptionResolveFn<
    TResult,
    { [key in TKey]: TResult },
    TContext,
    TArgs
  >;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = {},
  TContext = {},
  TArgs = {},
> =
  | ((
      ...args: any[]
    ) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = {},
  TParent = {},
  TContext = {},
  TArgs = {},
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Chat: ResolverTypeWrapper<Chat>;
  ChatCompletionChoiceType: ResolverTypeWrapper<ChatCompletionChoiceType>;
  ChatCompletionChunkType: ResolverTypeWrapper<ChatCompletionChunkType>;
  ChatCompletionDeltaType: ResolverTypeWrapper<ChatCompletionDeltaType>;
  ChatInputType: ChatInputType;
  CheckTokenInput: CheckTokenInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  LoginResponse: ResolverTypeWrapper<LoginResponse>;
  LoginUserInput: LoginUserInput;
  Menu: ResolverTypeWrapper<Menu>;
  Message: ResolverTypeWrapper<Message>;
  Mutation: ResolverTypeWrapper<{}>;
  NewChatInput: NewChatInput;
  Project: ResolverTypeWrapper<Project>;
  ProjectPackages: ResolverTypeWrapper<ProjectPackages>;
  Query: ResolverTypeWrapper<{}>;
  RegisterUserInput: RegisterUserInput;
  Role: Role;
  StreamStatus: StreamStatus;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  UpdateChatTitleInput: UpdateChatTitleInput;
  UpsertProjectInput: UpsertProjectInput;
  User: ResolverTypeWrapper<User>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  Chat: Chat;
  ChatCompletionChoiceType: ChatCompletionChoiceType;
  ChatCompletionChunkType: ChatCompletionChunkType;
  ChatCompletionDeltaType: ChatCompletionDeltaType;
  ChatInputType: ChatInputType;
  CheckTokenInput: CheckTokenInput;
  Date: Scalars['Date']['output'];
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  LoginResponse: LoginResponse;
  LoginUserInput: LoginUserInput;
  Menu: Menu;
  Message: Message;
  Mutation: {};
  NewChatInput: NewChatInput;
  Project: Project;
  ProjectPackages: ProjectPackages;
  Query: {};
  RegisterUserInput: RegisterUserInput;
  String: Scalars['String']['output'];
  Subscription: {};
  UpdateChatTitleInput: UpdateChatTitleInput;
  UpsertProjectInput: UpsertProjectInput;
  User: User;
}>;

export type ChatResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Chat'] = ResolversParentTypes['Chat'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  messages?: Resolver<
    Maybe<Array<ResolversTypes['Message']>>,
    ParentType,
    ContextType
  >;
  title?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ChatCompletionChoiceTypeResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ChatCompletionChoiceType'] = ResolversParentTypes['ChatCompletionChoiceType'],
> = ResolversObject<{
  delta?: Resolver<
    ResolversTypes['ChatCompletionDeltaType'],
    ParentType,
    ContextType
  >;
  finishReason?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  index?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ChatCompletionChunkTypeResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ChatCompletionChunkType'] = ResolversParentTypes['ChatCompletionChunkType'],
> = ResolversObject<{
  choices?: Resolver<
    Array<ResolversTypes['ChatCompletionChoiceType']>,
    ParentType,
    ContextType
  >;
  created?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  model?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  object?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  systemFingerprint?: Resolver<
    Maybe<ResolversTypes['String']>,
    ParentType,
    ContextType
  >;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ChatCompletionDeltaTypeResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ChatCompletionDeltaType'] = ResolversParentTypes['ChatCompletionDeltaType'],
> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateScalarConfig
  extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export type LoginResponseResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['LoginResponse'] = ResolversParentTypes['LoginResponse'],
> = ResolversObject<{
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MenuResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Menu'] = ResolversParentTypes['Menu'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permission?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MessageResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Message'] = ResolversParentTypes['Message'],
> = ResolversObject<{
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  modelId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation'],
> = ResolversObject<{
  clearChatHistory?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationClearChatHistoryArgs, 'chatId'>
  >;
  createChat?: Resolver<
    ResolversTypes['Chat'],
    ParentType,
    ContextType,
    RequireFields<MutationCreateChatArgs, 'newChatInput'>
  >;
  deleteChat?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteChatArgs, 'chatId'>
  >;
  deleteProject?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationDeleteProjectArgs, 'projectId'>
  >;
  login?: Resolver<
    ResolversTypes['LoginResponse'],
    ParentType,
    ContextType,
    RequireFields<MutationLoginArgs, 'input'>
  >;
  registerUser?: Resolver<
    ResolversTypes['User'],
    ParentType,
    ContextType,
    RequireFields<MutationRegisterUserArgs, 'input'>
  >;
  removePackageFromProject?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<
      MutationRemovePackageFromProjectArgs,
      'packageId' | 'projectId'
    >
  >;
  updateChatTitle?: Resolver<
    Maybe<ResolversTypes['Chat']>,
    ParentType,
    ContextType,
    RequireFields<MutationUpdateChatTitleArgs, 'updateChatTitleInput'>
  >;
  updateProjectPath?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<MutationUpdateProjectPathArgs, 'newPath' | 'projectId'>
  >;
  upsertProject?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<MutationUpsertProjectArgs, 'upsertProjectInput'>
  >;
}>;

export type ProjectResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Project'] = ResolversParentTypes['Project'],
> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  projectPackages?: Resolver<
    Maybe<Array<ResolversTypes['ProjectPackages']>>,
    ParentType,
    ContextType
  >;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  userId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProjectPackagesResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['ProjectPackages'] = ResolversParentTypes['ProjectPackages'],
> = ResolversObject<{
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  project_id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Query'] = ResolversParentTypes['Query'],
> = ResolversObject<{
  checkToken?: Resolver<
    ResolversTypes['Boolean'],
    ParentType,
    ContextType,
    RequireFields<QueryCheckTokenArgs, 'input'>
  >;
  getAvailableModelTags?: Resolver<
    Maybe<Array<ResolversTypes['String']>>,
    ParentType,
    ContextType
  >;
  getChatDetails?: Resolver<
    Maybe<ResolversTypes['Chat']>,
    ParentType,
    ContextType,
    RequireFields<QueryGetChatDetailsArgs, 'chatId'>
  >;
  getChatHistory?: Resolver<
    Array<ResolversTypes['Message']>,
    ParentType,
    ContextType,
    RequireFields<QueryGetChatHistoryArgs, 'chatId'>
  >;
  getHello?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  getMessageDetail?: Resolver<
    Maybe<ResolversTypes['Message']>,
    ParentType,
    ContextType,
    RequireFields<QueryGetMessageDetailArgs, 'messageId'>
  >;
  getProjectDetails?: Resolver<
    ResolversTypes['Project'],
    ParentType,
    ContextType,
    RequireFields<QueryGetProjectDetailsArgs, 'projectId'>
  >;
  getUserChats?: Resolver<
    Maybe<Array<ResolversTypes['Chat']>>,
    ParentType,
    ContextType
  >;
  getUserProjects?: Resolver<
    Array<ResolversTypes['Project']>,
    ParentType,
    ContextType
  >;
  logout?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  me?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
}>;

export type SubscriptionResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription'],
> = ResolversObject<{
  chatStream?: SubscriptionResolver<
    Maybe<ResolversTypes['ChatCompletionChunkType']>,
    'chatStream',
    ParentType,
    ContextType,
    RequireFields<SubscriptionChatStreamArgs, 'input'>
  >;
}>;

export type UserResolvers<
  ContextType = any,
  ParentType extends
    ResolversParentTypes['User'] = ResolversParentTypes['User'],
> = ResolversObject<{
  chats?: Resolver<Array<ResolversTypes['Chat']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isActive?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  isDeleted?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = any> = ResolversObject<{
  Chat?: ChatResolvers<ContextType>;
  ChatCompletionChoiceType?: ChatCompletionChoiceTypeResolvers<ContextType>;
  ChatCompletionChunkType?: ChatCompletionChunkTypeResolvers<ContextType>;
  ChatCompletionDeltaType?: ChatCompletionDeltaTypeResolvers<ContextType>;
  Date?: GraphQLScalarType;
  LoginResponse?: LoginResponseResolvers<ContextType>;
  Menu?: MenuResolvers<ContextType>;
  Message?: MessageResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Project?: ProjectResolvers<ContextType>;
  ProjectPackages?: ProjectPackagesResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;
