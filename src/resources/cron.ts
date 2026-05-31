/**
 * Resource class for the `/api/open/v1/cron/tasks` API.
 *
 * @module resources/cron
 */

import { HttpClient } from '../http';
import { CronTask, CronCreateOptions, CronUpdateOptions } from '../types';
import { Paths } from '../paths';

/**
 * Provides CRUD and lifecycle operations for Llmrix scheduled cron tasks.
 *
 * Obtain an instance via `client.cron`.
 *
 * @example
 * ```ts
 * // List all tasks
 * const { tasks } = await client.cron.list();
 *
 * // Create a task that runs every day at 09:00
 * const task = await client.cron.create({
 *   name: 'Daily brief',
 *   prompt: 'Summarise the latest news.',
 *   schedule_type: 'cron',
 *   schedule_expr: '0 9 * * *',
 * });
 *
 * // Pause and resume
 * await client.cron.pause(task.id);
 * await client.cron.resume(task.id);
 * ```
 */
export class CronResource {
  /** @internal */
  constructor(private readonly http: HttpClient) {}

  // ---------------------------------------------------------------------------
  // Task CRUD
  // ---------------------------------------------------------------------------

  /**
   * Returns all cron tasks visible to the authenticated user.
   *
   * @returns An object containing the array of {@link CronTask} objects.
   *
   * @example
   * ```ts
   * const { tasks } = await client.cron.list();
   * tasks.forEach(t => console.log(t.name, t.status));
   * ```
   */
  async list(): Promise<{ tasks: CronTask[] }> {
    return this.http.get<{ tasks: CronTask[] }>(Paths.cronTasks);
  }

  /**
   * Creates a new cron task.
   *
   * @param opts - Task definition.
   * @returns The newly created {@link CronTask}.
   *
   * @example
   * ```ts
   * const task = await client.cron.create({
   *   name: 'Hourly check',
   *   prompt: 'Check for new emails and summarise them.',
   *   schedule_expr: '0 * * * *',
   * });
   * ```
   */
  async create(opts: CronCreateOptions): Promise<CronTask> {
    return this.http.post<CronTask>(Paths.cronTasks, opts);
  }

  /**
   * Retrieves a single cron task by its ID.
   *
   * @param taskId - The task ID (UUID).
   * @returns The matching {@link CronTask}.
   * @throws {LlmrixApiError} with status 404 if not found.
   */
  async get(taskId: string): Promise<CronTask> {
    return this.http.get<CronTask>(Paths.cronTask(taskId));
  }

  /**
   * Updates mutable fields on an existing cron task.
   *
   * @param taskId - The task ID.
   * @param opts - Fields to update.
   * @returns The updated {@link CronTask}.
   */
  async update(taskId: string, opts: CronUpdateOptions): Promise<CronTask> {
    return this.http.put<CronTask>(Paths.cronTask(taskId), opts);
  }

  /**
   * Permanently deletes a cron task.
   *
   * @param taskId - The task ID.
   * @returns A confirmation object `{ ok: true }`.
   */
  async delete(taskId: string): Promise<{ ok: true }> {
    return this.http.delete<{ ok: true }>(Paths.cronTask(taskId));
  }

  // ---------------------------------------------------------------------------
  // Lifecycle actions
  // ---------------------------------------------------------------------------

  /**
   * Pauses a cron task so it no longer fires on its schedule.
   *
   * @param taskId - The task ID.
   * @returns The updated {@link CronTask} with `status: "paused"`.
   */
  async pause(taskId: string): Promise<CronTask> {
    return this.http.post<CronTask>(Paths.cronTaskPause(taskId));
  }

  /**
   * Resumes a previously-paused cron task.
   *
   * @param taskId - The task ID.
   * @returns The updated {@link CronTask} with `status: "active"`.
   */
  async resume(taskId: string): Promise<CronTask> {
    return this.http.post<CronTask>(Paths.cronTaskResume(taskId));
  }
}
