/**
 * SSE event type definitions for the Llmrix streaming API.
 *
 * All event objects use a `channel` + `type` discriminated union so callers
 * can narrow the type with a simple `if (event.channel === 'messages')` check.
 *
 * @module streaming/events
 */

// ---------------------------------------------------------------------------
// lifecycle channel
// ---------------------------------------------------------------------------

/** Emitted once at the very beginning of each agent run. */
export interface RunStartEvent {
  channel: 'lifecycle';
  type: 'run_start';
  /** The thread / conversation ID this run belongs to. */
  thread_id: string;
}

/** Emitted once after the agent run completes successfully. */
export interface RunEndEvent {
  channel: 'lifecycle';
  type: 'run_end';
  /** The thread / conversation ID this run belongs to. */
  thread_id: string;
}

// ---------------------------------------------------------------------------
// messages channel
// ---------------------------------------------------------------------------

/** A incremental text chunk produced by the assistant. */
export interface MessageChunkEvent {
  channel: 'messages';
  type: 'message_chunk';
  /** The text fragment for this chunk. */
  content: string;
  /** Run identifier linking this chunk to a specific agent invocation. */
  run_id: string;
}

// ---------------------------------------------------------------------------
// tools channel
// ---------------------------------------------------------------------------

/** Emitted when a tool call begins execution. */
export interface ToolStartEvent {
  channel: 'tools';
  type: 'tool_start';
  /** Unique ID for this tool invocation. */
  tool_call_id: string;
  /** Tool name. */
  name: string;
  /** Input arguments passed to the tool. */
  input: unknown;
  /** IDs of parent agent runs in the call chain. */
  parent_ids: string[];
}

/** Emitted when a tool call finishes execution. */
export interface ToolEndEvent {
  channel: 'tools';
  type: 'tool_end';
  /** Unique ID for this tool invocation. */
  tool_call_id: string;
  /** Tool name. */
  name: string;
  /** Return value produced by the tool. */
  output: unknown;
  /** IDs of parent agent runs in the call chain. */
  parent_ids: string[];
}

/** Emitted when a sub-agent starts execution as part of a tool call. */
export interface SubagentStartEvent {
  channel: 'tools';
  type: 'subagent_start';
  /** Unique ID for this sub-agent invocation. */
  tool_call_id: string;
  /** Sub-agent name. */
  name: string;
  /** Input passed to the sub-agent. */
  input: unknown;
  /** IDs of parent agent runs in the call chain. */
  parent_ids: string[];
}

/** Emitted when a sub-agent finishes execution. */
export interface SubagentEndEvent {
  channel: 'tools';
  type: 'subagent_end';
  /** Unique ID for this sub-agent invocation. */
  tool_call_id: string;
  /** Sub-agent name. */
  name: string;
  /** Output produced by the sub-agent. */
  output: unknown;
  /** IDs of parent agent runs in the call chain. */
  parent_ids: string[];
}

// ---------------------------------------------------------------------------
// hitl channel
// ---------------------------------------------------------------------------

/** Emitted when the agent is paused waiting for a human decision. */
export interface HitlInterruptEvent {
  channel: 'hitl';
  type: 'hitl_interrupt';
  /** One or more pending actions that require human approval. */
  action_requests: HitlActionRequest[];
}

/** A single pending action that requires human approval (inline type). */
export interface HitlActionRequest {
  name: string;
  args: Record<string, unknown>;
  description: string;
  decisions: string[];
}

// ---------------------------------------------------------------------------
// error channel
// ---------------------------------------------------------------------------

/** Emitted when the agent run encounters an unrecoverable error. */
export interface ErrorEvent {
  channel: 'error';
  type: 'error';
  /** Human-readable error description. */
  message: string;
}

/** Emitted when the agent run is cancelled (e.g. via the stop endpoint). */
export interface CancelledEvent {
  channel: 'error';
  type: 'cancelled';
  /** Human-readable cancellation reason. */
  message: string;
}

// ---------------------------------------------------------------------------
// heartbeat channel
// ---------------------------------------------------------------------------

/**
 * Periodic keep-alive frame.  The SDK consumes these internally and does
 * **not** yield them to callers.
 */
export interface HeartbeatEvent {
  channel: 'heartbeat';
  type: '';
}

// ---------------------------------------------------------------------------
// rubric channel
// ---------------------------------------------------------------------------

/** Emitted when the rubric evaluator starts grading an iteration. */
export interface RubricStartEvent {
  channel: 'rubric';
  type: 'rubric_evaluation_start';
  /** Iteration index (0-based). */
  iteration: number;
  /** Identifier of the grading run. */
  grading_run_id: string;
}

/** Emitted when the rubric evaluator finishes grading an iteration. */
export interface RubricEndEvent {
  channel: 'rubric';
  type: 'rubric_evaluation_end';
  /** Iteration index (0-based). */
  iteration: number;
  /** Overall result label (e.g. `"pass"`, `"fail"`). */
  result: string;
  /** Human-readable explanation of the grading decision. */
  explanation: string;
}

// ---------------------------------------------------------------------------
// Union type
// ---------------------------------------------------------------------------

/**
 * Discriminated union of every possible SSE event emitted by the Llmrix
 * streaming endpoint.
 *
 * Use `event.channel` (and optionally `event.type`) to narrow:
 *
 * ```ts
 * for await (const event of stream) {
 *   if (event.channel === 'messages' && event.type === 'message_chunk') {
 *     process.stdout.write(event.content);
 *   }
 * }
 * ```
 */
export type StreamEvent =
  | RunStartEvent
  | RunEndEvent
  | MessageChunkEvent
  | ToolStartEvent
  | ToolEndEvent
  | SubagentStartEvent
  | SubagentEndEvent
  | HitlInterruptEvent
  | ErrorEvent
  | CancelledEvent
  | HeartbeatEvent
  | RubricStartEvent
  | RubricEndEvent;
