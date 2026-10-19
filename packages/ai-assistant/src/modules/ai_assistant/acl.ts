export const features = [
  {
    id: 'ai_assistant.view',
    title: 'View AI Assistant Settings',
    module: 'ai_assistant',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'ai_assistant.settings.manage',
    title: 'Manage AI Assistant Settings',
    module: 'ai_assistant',
    dependsOn: ['ai_assistant.view'],
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'] },
  },
  {
    id: 'ai_assistant.conversations.manage',
    title: 'Manage AI Assistant Conversations',
    module: 'ai_assistant',
    dependsOn: ['ai_assistant.view'],
    capability: {
      effectClass: 'E6',
      reversibility: 'irreversible',
      dataClasses: ['personal', 'confidential'],
      note: 'Classified by the worst act it permits, not the most common one. The same feature covers renaming a conversation and deleting it, and a deleted conversation is gone: the transcript is the record, and nothing recreates it.',
    },
  },
  {
    id: 'ai_assistant.conversations.share',
    title: 'Share AI Assistant Conversations',
    module: 'ai_assistant',
    dependsOn: ['ai_assistant.view'],
    capability: {
      effectClass: 'E5',
      reversibility: 'compensatable',
      compensation: 'ai_assistant.conversations.manage',
      dataClasses: ['personal', 'confidential'],
      note: 'An access-control change, not an external send: the conversation stays inside the tenant, so E3 would be the wrong reason. It is E5 because what changes is who may read a record, and sharing is undone by managing the conversation rather than by unsending anything.',
    },
  },
  {
    id: 'ai_assistant.mcp.serve',
    title: 'Start MCP Server',
    module: 'ai_assistant',
    dependsOn: ['ai_assistant.view'],
    capability: {
      effectClass: 'E3',
      reversibility: 'reversible',
      externalEffect: true,
      note: 'Starting the server is undone by stopping it, so the act itself is reversible. But while it runs an outside client can call this tenant\u2019s tools, which is exactly the boundary E3 names.',
    },
  },
  {
    id: 'ai_assistant.tools.list',
    title: 'List MCP Tools',
    module: 'ai_assistant',
    dependsOn: ['ai_assistant.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible' },
  },
  {
    id: 'ai_assistant.mcp_servers.view',
    title: 'View MCP Server Configurations',
    module: 'ai_assistant',
    dependsOn: ['ai_assistant.view'],
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential'] },
  },
  {
    id: 'ai_assistant.mcp_servers.manage',
    title: 'Manage MCP Server Configurations',
    module: 'ai_assistant',
    dependsOn: ['ai_assistant.mcp_servers.view'],
    capability: {
      effectClass: 'E5',
      reversibility: 'reversible',
      dataClasses: ['confidential', 'secret'],
      note: 'The configuration is where an external server\u2019s credential lives, so writing it is a security change rather than an ordinary setting: a wrong entry can send this tenant\u2019s data to a host nobody approved.',
    },
  },
]

export default features
