/**
 * Resource class for the `/api/open/v1/agent` API.
 *
 * This API is available in **cloud mode only** and may return 503 when the
 * agent service is not yet initialised.
 *
 * @module resources/agent
 */

import { HttpClient } from '../http';
import { Agent, AgentCreateOptions, AgentUpdateOptions, Mate } from '../types';
import { Paths } from '../paths';

/**
 * Provides CRUD and mate-management operations for Llmrix agent definitions.
 *
 * Obtain an instance via `client.agents`.
 *
 * > **Cloud mode only.** These endpoints return HTTP 503 when the server is
 * > running in native (local) mode.
 *
 * @example
 * ```ts
 * // List all agents
 * const { agents } = await client.agents.list();
 *
 * // Create a solo agent
 * const agent = await client.agents.create({
 *   name: 'Research Assistant',
 *   system_prompt: 'You are a helpful research assistant.',
 * });
 *
 * // Update the model
 * await client.agents.update(agent.id, { model_id: 'openai:gpt-4o' });
 * ```
 */
export class AgentResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  // ---------------------------------------------------------------------------
  // Agent CRUD
  // ---------------------------------------------------------------------------

  /**
   * Returns all agent definitions visible to the authenticated user.
   *
   * @returns An object containing the array of {@link Agent} objects.
   *
   * @example
   * ```ts
   * const { agents } = await client.agents.list();
   * agents.forEach(a => console.log(a.id, a.name));
   * ```
   */
  async list(): Promise<{ agents: Agent[] }> {
    return this.http.get<{ agents: Agent[] }>(Paths.agents);
  }

  /**
   * Creates a new agent definition.
   *
   * @param opts - Agent definition options.
   * @returns The server response `{ ok: true, agent: Agent }`.
   *
   * @example
   * ```ts
   * const { agent } = await client.agents.create({
   *   name: 'Code Reviewer',
   *   system_prompt: 'Review code for correctness and style.',
   *   model_id: 'openai:gpt-4o',
   * });
   * console.log(agent.id);
   * ```
   */
  async create(opts: AgentCreateOptions): Promise<{ ok: true; agent: Agent }> {
    return this.http.post<{ ok: true; agent: Agent }>(Paths.agents, opts);
  }

  /**
   * Retrieves a single agent by its numeric ID.
   *
   * @param agentId - The agent ID (number).
   * @returns An object `{ agent: Agent }` containing the matching agent.
   * @throws {LlmrixApiError} with status 404 if not found.
   */
  async get(agentId: number): Promise<{ agent: Agent }> {
    return this.http.get<{ agent: Agent }>(Paths.agent(agentId));
  }

  /**
   * Applies a partial update to an existing agent.
   *
   * @param agentId - The agent ID.
   * @param opts - Fields to update (all optional).
   * @returns The server response `{ ok: true, agent: Agent }`.
   */
  async update(agentId: number, opts: AgentUpdateOptions): Promise<{ ok: true; agent: Agent }> {
    return this.http.patch<{ ok: true; agent: Agent }>(Paths.agent(agentId), opts);
  }

  /**
   * Permanently deletes an agent definition.
   *
   * @param agentId - The agent ID.
   * @returns A confirmation object `{ ok: true }`.
   */
  async delete(agentId: number): Promise<{ ok: true }> {
    return this.http.delete<{ ok: true }>(Paths.agent(agentId));
  }

  // ---------------------------------------------------------------------------
  // Mate management (team topology)
  // ---------------------------------------------------------------------------

  /**
   * Returns the list of mates (team members) for a team-topology agent.
   *
   * @param agentId - The agent ID.
   * @returns An object `{ mates: Mate[] }`.
   *
   * @example
   * ```ts
   * const { mates } = await client.agents.listMates(teamAgent.id);
   * mates.forEach(m => console.log(m.name, m.sort));
   * ```
   */
  async listMates(agentId: number): Promise<{ mates: Mate[] }> {
    return this.http.get<{ mates: Mate[] }>(Paths.agentMates(agentId));
  }

  /**
   * Replaces the full set of mates for a team-topology agent.
   *
   * @param agentId - The agent ID.
   * @param mates - The complete new list of {@link Mate} objects.
   * @returns The server response `{ ok: true, mates: Mate[] }`.
   *
   * @example
   * ```ts
   * const { mates } = await client.agents.saveMates(teamAgent.id, [
   *   { name: 'Researcher', introduce: 'Searches the web', system_prompt: '...', sort: 1 },
   *   { name: 'Writer',     introduce: 'Writes reports',   system_prompt: '...', sort: 2 },
   * ]);
   * ```
   */
  async saveMates(agentId: number, mates: Mate[]): Promise<{ ok: true; mates: Mate[] }> {
    return this.http.post<{ ok: true; mates: Mate[] }>(Paths.agentMates(agentId), { mates });
  }
}
