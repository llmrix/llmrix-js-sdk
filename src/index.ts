/**
 * llmrix-js-sdk — Official TypeScript SDK for the llmrix AI Agent Platform.
 *
 * @example
 * ```ts
 * import { LlmrixClient } from '@llmrix/sdk';
 *
 * const client = new LlmrixClient({
 *   baseUrl: 'http://localhost:8899',
 *   apiKey: 'sk-xxx',
 * });
 * ```
 *
 * @module
 */

// Main client
export { LlmrixClient } from './client';

// Resource classes (for consumers who want to type variables explicitly)
export { ConversationsResource } from './resources/conversations';
export { ChatResource } from './resources/chat';
export { CronResource } from './resources/cron';
export { AgentResource } from './resources/agent';

// API path definitions — all endpoints in one place
export { Paths } from './paths';

// Types
export type {
  LlmrixClientOptions,
  PageResult,
  PaginationParams,
  Conversation,
  CreateConversationOptions,
  UpdateConversationOptions,
  Message,
  ToolCall,
  Attachment,
  SendMessageOptions,
  ActionRequest,
  HitlDecision,
  CronTask,
  CronCreateOptions,
  CronUpdateOptions,
  Agent,
  AgentCreateOptions,
  AgentUpdateOptions,
  Mate,
} from './types';

// SSE event types
export type {
  StreamEvent,
  RunStartEvent,
  RunEndEvent,
  MessageChunkEvent,
  ToolStartEvent,
  ToolEndEvent,
  SubagentStartEvent,
  SubagentEndEvent,
  HitlInterruptEvent,
  HitlActionRequest,
  ErrorEvent,
  CancelledEvent,
  HeartbeatEvent,
  RubricStartEvent,
  RubricEndEvent,
} from './streaming/events';

// Error classes
export {
  LlmrixError,
  LlmrixApiError,
  LlmrixAuthError,
  LlmrixTimeoutError,
  LlmrixStreamError,
} from './errors';

// Low-level SSE parser (exported for advanced / testing use-cases)
export { parseSseStream } from './streaming/parser';
export type { RawFrame } from './streaming/parser';
