/**
 * All TypeScript type definitions for the Llmrix SDK.
 * @module types
 */

// ---------------------------------------------------------------------------
// Client configuration
// ---------------------------------------------------------------------------

/** Options for constructing a {@link LlmrixClient}. */
export interface LlmrixClientOptions {
  /**
   * Base URL of the Llmrix server (e.g. `"http://localhost:8899"`).
   * Must not include a trailing slash.
   */
  baseUrl: string;

  /**
   * API key used for bearer-token authentication.
   * Passed as `Authorization: Bearer <apiKey>` on every request.
   */
  apiKey: string;

  /**
   * Request timeout in milliseconds.
   * Defaults to `60_000` (60 s).
   */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Generic cursor-paginated response envelope. */
export interface PageResult<T> {
  items: T[];
  has_more: boolean;
}

/** Common cursor-pagination query parameters. */
export interface PaginationParams {
  /**
   * Return items whose `seq` is strictly less than this value.
   * Omit to get the newest items.
   */
  lastId?: number;
  /** Maximum number of items to return. Defaults to 20. */
  size?: number;
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

/** A Llmrix conversation (thread). */
export interface Conversation {
  /** Monotonically-increasing sequence number used as the pagination cursor. */
  seq: number;
  /** Unique thread identifier (UUID). */
  id: string;
  /** Human-readable title, or `null` if not yet set. */
  title: string | null;
  /** Agent identifier this conversation is bound to, or `null`. */
  agent_id: string | null;
  /** ISO-8601 creation timestamp. */
  created_at: string;
  /** ISO-8601 last-update timestamp. */
  updated_at: string;
}

/** Options for {@link ConversationsResource.create}. */
export interface CreateConversationOptions {
  /** Optional initial title. */
  title?: string;
  /** Optional agent to bind the conversation to. */
  agent_id?: string;
}

/** Options for {@link ConversationsResource.update}. */
export interface UpdateConversationOptions {
  title?: string;
  agent_id?: string;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** A single tool invocation embedded in an assistant message. */
export interface ToolCall {
  /** Unique tool-call identifier. */
  id: string;
  /** Tool name. */
  name: string;
  /** Arguments passed to the tool, as a free-form object. */
  args: Record<string, unknown>;
}

/** A message within a conversation. */
export interface Message {
  /** Monotonically-increasing sequence number used as the pagination cursor. */
  seq: number;
  /** Unique message identifier. */
  id: string;
  /** Message sender role. */
  role: 'user' | 'assistant' | 'tool' | 'system';
  /** Text content, or `null` for tool/function messages with no text. */
  content: string | null;
  /** Tool calls made by an assistant message, or `null`. */
  tool_calls: ToolCall[] | null;
}

// ---------------------------------------------------------------------------
// Chat request options
// ---------------------------------------------------------------------------

/** A file or image attachment included in a chat message. */
export interface Attachment {
  /** MIME type (e.g. `"image/png"`). */
  type: string;
  /** Base-64 encoded content or a publicly-accessible URL. */
  data: string;
  /** Optional filename hint. */
  name?: string;
}

/** Options passed to {@link ChatResource.send}. */
export interface SendMessageOptions {
  /**
   * Override the model for this turn (e.g. `"openai:gpt-4o"`).
   * Defaults to the server-configured model.
   */
  model?: string;
  /** Enable extended thinking / chain-of-thought for this turn. */
  thinking?: boolean;
  /** File or image attachments. */
  attachments?: Attachment[];
}

// ---------------------------------------------------------------------------
// HITL (Human-in-the-Loop)
// ---------------------------------------------------------------------------

/** A single pending action that requires human approval. */
export interface ActionRequest {
  /** Tool / action name. */
  name: string;
  /** Arguments the agent intends to pass to the action. */
  args: Record<string, unknown>;
  /** Human-readable description of what the action will do. */
  description: string;
  /** Available decision choices (e.g. `["approve", "reject"]`). */
  decisions: string[];
}

/** A single HITL decision submitted by the user. */
export interface HitlDecision {
  /** The chosen decision (must be one of the values in `ActionRequest.decisions`). */
  type: string;
  /** Optional free-text feedback attached to the decision. */
  feedback?: string;
}

// ---------------------------------------------------------------------------
// Cron
// ---------------------------------------------------------------------------

/** A scheduled cron task managed by Llmrix. */
export interface CronTask {
  /** Unique task identifier (UUID). */
  id: string;
  /** Human-readable task name. */
  name: string;
  /** The prompt that is executed when the task fires. */
  prompt: string;
  /** Whether the schedule is a cron expression or an interval. */
  schedule_type: 'cron' | 'interval';
  /** The cron expression or interval string (e.g. `"0 9 * * *"` or `"1h"`). */
  schedule_expr: string;
  /** Current lifecycle status of the task. */
  status: 'active' | 'paused' | 'running' | 'error';
  /** Conversation thread ID this task is bound to, or `null`. */
  thread_id: string | null;
  /** User ID that owns the task, or `null`. */
  user_id: string | null;
  /** Delivery channel for task output, or `null`. */
  channel: string | null;
  /** Unix timestamp (seconds) of the last execution, or `null`. */
  last_run: number | null;
  /** Error message from the last execution, or `null` if it succeeded. */
  last_run_error: string | null;
  /** Output text from the last execution, or `null`. */
  last_run_output: string | null;
  /** Unix timestamp (seconds) of the next scheduled execution, or `null`. */
  next_run: number | null;
  /** Unix timestamp (seconds) when the task was created. */
  created_at: number;
  /** Unix timestamp (seconds) when the task was last updated. */
  updated_at: number;
}

/** Options for {@link CronResource.create}. */
export interface CronCreateOptions {
  /** Human-readable task name. */
  name: string;
  /** The prompt to execute when the task fires. */
  prompt: string;
  /** Schedule kind — cron expression or interval. Defaults to `"cron"`. */
  schedule_type?: 'cron' | 'interval';
  /** The cron expression or interval string (e.g. `"0 9 * * *"` or `"1h"`). */
  schedule_expr: string;
  /** Optional delivery channel for task output. */
  channel?: string;
}

/** Options for {@link CronResource.update}. All fields are optional. */
export interface CronUpdateOptions {
  /** New human-readable task name. */
  name?: string;
  /** New prompt to execute when the task fires. */
  prompt?: string;
  /** New schedule kind. */
  schedule_type?: 'cron' | 'interval';
  /** New cron expression or interval string. */
  schedule_expr?: string;
  /** New delivery channel. */
  channel?: string;
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/** An agent definition stored in Llmrix (cloud mode only). */
export interface Agent {
  /** Unique numeric agent identifier. */
  id: number;
  /** Human-readable agent name. */
  name: string;
  /** Agent topology — single agent or a team. */
  type: 'solo' | 'team';
  /** System prompt used to configure the agent's behaviour. */
  system_prompt: string;
  /** Model identifier the agent uses (e.g. `"openai:gpt-4o"`). */
  model_id: string;
  /** List of MCP server names available to the agent. */
  mcps: string[];
  /** List of skill names available to the agent. */
  skills: string[];
  /** Arbitrary key-value metadata associated with the agent. */
  metadata: Record<string, unknown>;
  /** Short introductory description of the agent. */
  introduce: string;
  /** Ordered list of outline / step definitions for the agent. */
  outlines: Record<string, unknown>[];
}

/** Options for {@link AgentResource.create}. */
export interface AgentCreateOptions {
  /** Human-readable agent name. */
  name: string;
  /** Agent topology. Defaults to `"solo"`. */
  type?: 'solo' | 'team';
  /** System prompt. */
  system_prompt?: string;
  /** Model identifier. */
  model_id?: string;
  /** MCP server names. */
  mcps?: string[];
  /** Skill names. */
  skills?: string[];
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
  /** Short introduction. */
  introduce?: string;
  /** Outline / step definitions. */
  outlines?: Record<string, unknown>[];
}

/** Options for {@link AgentResource.update}. All fields are optional. */
export interface AgentUpdateOptions {
  /** New human-readable agent name. */
  name?: string;
  /** New agent topology. */
  type?: 'solo' | 'team';
  /** New system prompt. */
  system_prompt?: string;
  /** New model identifier. */
  model_id?: string;
  /** New MCP server names. */
  mcps?: string[];
  /** New skill names. */
  skills?: string[];
  /** New arbitrary metadata. */
  metadata?: Record<string, unknown>;
  /** New short introduction. */
  introduce?: string;
  /** New outline / step definitions. */
  outlines?: Record<string, unknown>[];
}

/** A team member (mate) entry for an agent in team topology. */
export interface Mate {
  /** Mate agent name. */
  name: string;
  /** Short description of the mate's role. */
  introduce: string;
  /** System prompt used to configure the mate's behaviour. */
  system_prompt: string;
  /** Display/execution order of the mate within the team. */
  sort: number;
}
