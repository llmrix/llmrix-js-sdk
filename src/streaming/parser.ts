/**
 * SSE (Server-Sent Events) parser.
 *
 * Consumes a `ReadableStream<Uint8Array>` from a `fetch` response body and
 * yields parsed {@link RawFrame} objects according to the
 * [SSE specification](https://html.spec.whatwg.org/multipage/server-sent-events.html).
 *
 * @module streaming/parser
 */

/**
 * A fully-parsed SSE frame before JSON deserialization.
 *
 * Corresponds to a single blank-line-delimited block of `field: value` lines
 * in the raw SSE stream.
 */
export interface RawFrame {
  /** Value of the `id:` field, or an empty string if absent. */
  id: string;
  /** Value of the `event:` field, or an empty string if absent. */
  event: string;
  /** Concatenated value of all `data:` lines for this frame. */
  data: string;
}

/**
 * Parses a `ReadableStream<Uint8Array>` as an SSE stream and yields
 * {@link RawFrame} objects.
 *
 * Handles:
 * - Multiple `data:` lines (concatenated with `\n`)
 * - `id:` and `event:` fields
 * - Blank-line frame delimiters
 * - Heartbeat / comment lines (lines starting with `:`) — skipped
 * - Chunked delivery where a single SSE frame may span multiple read() calls
 * - Both `\n` and `\r\n` line endings
 *
 * @param body - The `ReadableStream<Uint8Array>` from `Response.body`.
 * @yields Parsed {@link RawFrame} objects.
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<RawFrame> {
  const decoder = new TextDecoder('utf-8');
  const reader = body.getReader();

  // Accumulate text across chunk boundaries.
  let buffer = '';

  // Current frame fields being assembled.
  let id = '';
  let event = '';
  const dataLines: string[] = [];

  /**
   * Process all complete lines currently in `buffer`.
   * Leaves any incomplete trailing line in `buffer`.
   */
  function* processLines(): Generator<RawFrame> {
    // Split on LF; handle optional preceding CR.
    const lines = buffer.split('\n');
    // The last element may be an incomplete line — keep it in the buffer.
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      // Strip trailing CR if present (CRLF streams).
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

      if (line === '') {
        // Blank line → dispatch frame if we have any data.
        if (dataLines.length > 0 || event !== '' || id !== '') {
          const frame: RawFrame = {
            id,
            event,
            data: dataLines.join('\n'),
          };
          // Reset for next frame.
          id = '';
          event = '';
          dataLines.length = 0;
          yield frame;
        }
        continue;
      }

      // Comment / heartbeat lines (e.g. `: keep-alive`).
      if (line.startsWith(':')) {
        continue;
      }

      // Parse `field: value` or `field` (value-less).
      const colonIdx = line.indexOf(':');
      let field: string;
      let value: string;

      if (colonIdx === -1) {
        field = line;
        value = '';
      } else {
        field = line.slice(0, colonIdx);
        // The spec says a single leading space after the colon should be stripped.
        value = line.slice(colonIdx + 1).replace(/^ /, '');
      }

      switch (field) {
        case 'id':
          id = value;
          break;
        case 'event':
          event = value;
          break;
        case 'data':
          dataLines.push(value);
          break;
        // Unknown fields are ignored per the SSE spec.
        default:
          break;
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      yield* processLines();
    }

    // Flush the decoder.
    buffer += decoder.decode();
    // Process any remaining content (stream closed without trailing newline).
    if (buffer.length > 0) {
      buffer += '\n\n';
      yield* processLines();
    }
  } finally {
    reader.releaseLock();
  }
}
