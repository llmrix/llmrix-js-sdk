/**
 * @llmrix/sdk — central API path definitions.
 *
 * Every Llmrix Open API v1 route is declared here as a constant (static path)
 * or a tiny builder function (parameterised path).  Import {@link Paths} in
 * your own code to avoid raw string duplication, or simply open this file to
 * see every available endpoint at a glance.
 *
 * @example
 * ```ts
 * import { Paths } from '@llmrix/sdk';
 *
 * Paths.conversations                  // "/api/open/v1/conversations"
 * Paths.conversation("abc-123")        // "/api/open/v1/conversations/abc-123"
 * Paths.chat("abc-123")               // "/api/open/v1/conversations/abc-123/chat"
 * Paths.cronTask("task-uuid")          // "/api/open/v1/cron/tasks/task-uuid"
 * Paths.agent(7)                       // "/api/open/v1/agent/7"
 * ```
 *
 * @module paths
 */

const V1 = '/api/open/v1';

/**
 * All Llmrix Open API v1 path definitions.
 *
 * Static paths are plain `string` constants.
 * Parameterised paths are arrow functions that return a `string`.
 */
export const Paths = {
  // ── Conversations ────────────────────────────────────────────────────────
  /** `POST / GET`   Create or list conversations. */
  conversations:          `${V1}/conversations`,
  /** `GET`          Single conversation by id. */
  conversation:           (id: string) => `${V1}/conversations/${encodeURIComponent(id)}`,
  /** `PATCH`        Update conversation title. */
  conversationUpdate:     (id: string) => `${V1}/conversations/${encodeURIComponent(id)}`,
  /** `DELETE`       Delete conversation and all its messages. */
  conversationDelete:     (id: string) => `${V1}/conversations/${encodeURIComponent(id)}`,
  /** `GET`          Paginated message history (?lastId&size). */
  conversationMessages:   (id: string) => `${V1}/conversations/${encodeURIComponent(id)}/messages`,

  // ── Chat ─────────────────────────────────────────────────────────────────
  /** `POST`  Send a user message — returns SSE stream. */
  chat:           (convId: string) => `${V1}/conversations/${encodeURIComponent(convId)}/chat`,
  /** `POST`  Abort the current streaming agent turn. */
  chatStop:       (convId: string) => `${V1}/conversations/${encodeURIComponent(convId)}/chat/stop`,
  /** `POST`  Submit HITL (human-in-the-loop) decisions to resume a paused run. */
  chatHitlDecide: (convId: string) => `${V1}/conversations/${encodeURIComponent(convId)}/chat/hitl/decide`,

  // ── Cron Tasks ───────────────────────────────────────────────────────────
  /** `GET / POST`           List all cron tasks or create a new one. */
  cronTasks:      `${V1}/cron/tasks`,
  /** `GET / PUT / DELETE`   Single cron task by id. */
  cronTask:       (taskId: string) => `${V1}/cron/tasks/${encodeURIComponent(taskId)}`,
  /** `POST`                 Pause a cron task (sets status → "paused"). */
  cronTaskPause:  (taskId: string) => `${V1}/cron/tasks/${encodeURIComponent(taskId)}/pause`,
  /** `POST`                 Resume a paused cron task (sets status → "active"). */
  cronTaskResume: (taskId: string) => `${V1}/cron/tasks/${encodeURIComponent(taskId)}/resume`,

  // ── Agents  (cloud mode only — returns 503 in native mode) ───────────────
  /** `GET / POST`           List all agents or create a new one. */
  agents:         `${V1}/agent`,
  /** `GET / PATCH / DELETE` Single agent by numeric id. */
  agent:          (agentId: number) => `${V1}/agent/${agentId}`,
  /** `GET / POST`           List or atomically replace all mates of a team agent. */
  agentMates:     (agentId: number) => `${V1}/agent/${agentId}/mates`,
} as const;
