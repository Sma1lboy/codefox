- we are using tmuxinator if you want to watch both codegen and dev server

// remember to follow this command to configuration the backend endpoint:

```sh
cp example.env .env
```

struct for now

```plain

src/
├── app/
│   ├── hooks/                      # React Hooks
│   │   ├── useAuth.ts             # 认证相关 hook
│   │   ├── useChatStore.ts        # 聊天状态管理
│   │   ├── useLocalStorageData.ts # 本地存储数据管理
│   │   ├── useModels.ts           # AI模型选择和缓存管理
│   │   └── useSpeechRecognition.ts # 语音识别功能
│   ├── login/                     # 登录页面
│   ├── register/                  # 注册页面
│   └── components/                # 共享组件
│
├── graphql/
│   ├── request.ts                 # GraphQL 查询/变更定义
│   │   ├── auth.ts               # 认证相关查询
│   │   ├── chat.ts               # 聊天相关查询
│   │   └── models.ts             # 模型相关查询
│   ├── schema.graphql            # GraphQL Schema定义
│   └── type.tsx                  # 由 schema 生成的 TypeScript 类型
│
├── lib/
│   ├── client.ts                 # Apollo Client 配置
│   │   ├── apolloClient.ts      # Apollo Client 实例设置
│   │   └── errorHandling.ts     # 错误处理中间件
│   ├── storage.ts                # 存储相关枚举和常量
│   │   ├── LocalStore.ts        # localStorage keys
│   │   └── SessionStore.ts      # sessionStorage keys
│   └── utils.ts                  # 通用工具函数
│
└── test/
    ├── utils/                    # 测试工具函数
    │   ├── client.ts            # 测试用 Apollo Client
    │   └── requests.ts          # 测试用请求方法
    └── __tests__/               # 测试用例
        └── hooks/               # Hooks 测试

```
