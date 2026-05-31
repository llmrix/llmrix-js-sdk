# llmrix-js-sdk

Official TypeScript SDK for [llmrix](https://github.com/llmrix/llmrix-js-sdk) — AI Agent Platform.

- Zero external dependencies (uses the native `fetch` API)
- Full TypeScript types with strict mode
- Supports Node.js 18+ and modern browsers
- SSE streaming with a clean `AsyncIterable` interface
- ESM + CJS dual build

---

## Installation

```bash
# npm
npm install llmrix-js-sdk

# pnpm
pnpm add llmrix-js-sdk

# yarn
yarn add llmrix-js-sdk
```

> **Node.js requirement**: The SDK uses the native `fetch` API, which requires **Node.js 18+**.

---

## Quick Start

```typescript
import { LlmrixClient } from 'llmrix-js-sdk';

const client = new LlmrixClient({
  baseUrl: 'https://www.llmrix.com',
  apiKey: 'sk-xxx',
  timeout: 30_000, // optional, default 60 s
});

// Create a conversation
const conv = await client.conversations.create({ title: 'My first chat' });

// Stream a response
const stream = client.chat(conv.id).send('Hello, Llmrix!');
for await (const event of stream) {
  if (event.channel === 'messages' && event.type === 'message_chunk') {
    process.stdout.write(event.content);
  }
  if (event.channel === 'lifecycle' && event.type === 'run_end') break;
}
```

---

## API Reference

### `LlmrixClient`

```typescript
new LlmrixClient(options: LlmrixClientOptions)
```

| Option    | Type     | Required | Description                                    |
|-----------|----------|----------|------------------------------------------------|
| `baseUrl` | `string` | Yes      | Base URL of the Llmrix server                  |
| `apiKey`  | `string` | Yes      | Bearer token for authentication                |
| `timeout` | `number` | No       | Request timeout in ms (default: `60_000`)      |

#### `client.conversations`

Access the `ConversationsResource` for CRUD and message history.

#### `client.chat(conversationId)`

Returns a `ChatResource` scoped to the given conversation ID.

---

### `ConversationsResource`

#### `create(opts?)`

```typescript
create(opts?: CreateConversationOptions): Promise<Conversation>
```

Creates a new conversation. Optional `title` and `agent_id` can be provided.

```typescript
const conv = await client.conversations.create({ title: 'Support chat' });
```

#### `list(opts?)`

```typescript
list(opts?: PaginationParams): Promise<PageResult<Conversation>>
```

Returns a cursor-paginated list of conversations, newest first.

```typescript
let page = await client.conversations.list({ size: 20 });
while (page.has_more) {
  page = await client.conversations.list({
    lastId: page.items.at(-1)!.seq,
    size: 20,
  });
}
```

#### `get(id)`

```typescript
get(id: string): Promise<Conversation>
```

Retrieves a single conversation by its UUID.

#### `update(id, opts)`

```typescript
update(id: string, opts: UpdateConversationOptions): Promise<Conversation>
```

Updates mutable fields (`title`, `agent_id`) on a conversation.

#### `delete(id)`

```typescript
delete(id: string): Promise<void>
```

Permanently deletes a conversation and all its messages.

#### `messages(id, opts?)`

```typescript
messages(id: string, opts?: PaginationParams): Promise<PageResult<Message>>
```

Returns a cursor-paginated message history for a conversation.

```typescript
const page = await client.conversations.messages(conv.id, { size: 50 });
for (const msg of page.items) {
  console.log(`[${msg.role}] ${msg.content}`);
}
```

---

### `ChatResource`

Obtained via `client.chat(conversationId)`.

#### `send(message, opts?)`

```typescript
send(message: string, opts?: SendMessageOptions): AsyncIterable<StreamEvent>
```

Sends a user message and returns an `AsyncIterable` of `StreamEvent` objects.
Heartbeat frames are silently dropped; the iterable terminates when a `run_end`
or error event is received.

| Option        | Type           | Description                            |
|---------------|----------------|----------------------------------------|
| `model`       | `string`       | Override the model for this turn       |
| `thinking`    | `boolean`      | Enable chain-of-thought reasoning      |
| `attachments` | `Attachment[]` | File/image attachments                 |

```typescript
for await (const event of client.chat(conv.id).send('Summarise this PDF', {
  attachments: [{ type: 'application/pdf', data: base64Data, name: 'doc.pdf' }],
})) {
  if (event.channel === 'messages' && event.type === 'message_chunk') {
    process.stdout.write(event.content);
  }
}
```

#### `stop()`

```typescript
stop(): Promise<void>
```

Requests the server to abort the currently-running agent turn.

#### `decide(decisions)`

```typescript
decide(decisions: HitlDecision[]): Promise<void>
```

Submits Human-in-the-Loop (HITL) decisions after receiving a `hitl_interrupt`
event.

```typescript
if (event.channel === 'hitl' && event.type === 'hitl_interrupt') {
  await client.chat(conv.id).decide([
    { type: 'approve' },
  ]);
}
```

---

### SSE Event Types

All events share two discriminator fields: `channel` and `type`.

| Channel      | Type                       | Description                          |
|--------------|----------------------------|--------------------------------------|
| `lifecycle`  | `run_start`                | Agent run started                    |
| `lifecycle`  | `run_end`                  | Agent run completed                  |
| `messages`   | `message_chunk`            | Incremental text from the assistant  |
| `tools`      | `tool_start`               | Tool call started                    |
| `tools`      | `tool_end`                 | Tool call finished                   |
| `tools`      | `subagent_start`           | Sub-agent started                    |
| `tools`      | `subagent_end`             | Sub-agent finished                   |
| `hitl`       | `hitl_interrupt`           | Waiting for human approval           |
| `error`      | `error`                    | Unrecoverable agent error            |
| `error`      | `cancelled`                | Run was cancelled                    |
| `heartbeat`  | _(empty)_                  | Keep-alive (never yielded to caller) |
| `rubric`     | `rubric_evaluation_start`  | Grading started                      |
| `rubric`     | `rubric_evaluation_end`    | Grading finished                     |

---

### Error Classes

| Class                | Extends          | When thrown                                    |
|----------------------|------------------|------------------------------------------------|
| `LlmrixError`        | `Error`          | Base class for all SDK errors                  |
| `LlmrixApiError`     | `LlmrixError`    | Non-2xx HTTP response (`.status`, `.body`)     |
| `LlmrixAuthError`    | `LlmrixApiError` | 401 / 403 authentication failure               |
| `LlmrixTimeoutError` | `LlmrixError`    | Request exceeded the configured timeout        |
| `LlmrixStreamError`  | `LlmrixError`    | Unrecoverable SSE stream error                 |

```typescript
import { LlmrixApiError, LlmrixAuthError } from 'llmrix-js-sdk';

try {
  const conv = await client.conversations.get('unknown-id');
} catch (e) {
  if (e instanceof LlmrixAuthError) {
    console.error('Invalid API key');
  } else if (e instanceof LlmrixApiError) {
    console.error(`HTTP ${e.status}: ${e.message}`);
  }
}
```

---

## Advanced Usage

### Full HITL flow

```typescript
const chat = client.chat(conv.id);

for await (const event of chat.send('Delete all files in /tmp')) {
  if (event.channel === 'hitl' && event.type === 'hitl_interrupt') {
    console.log('Pending actions:');
    for (const req of event.action_requests) {
      console.log(`  ${req.name}: ${req.description}`);
      console.log(`  Available decisions: ${req.decisions.join(', ')}`);
    }

    const userApproved = await askUser('Approve? (y/n)') === 'y';
    await chat.decide([{ type: userApproved ? 'approve' : 'reject' }]);
  }
  if (event.channel === 'lifecycle' && event.type === 'run_end') break;
}
```

### Collecting the full assistant response

```typescript
async function runToCompletion(client: LlmrixClient, convId: string, message: string): Promise<string> {
  let fullText = '';
  for await (const event of client.chat(convId).send(message)) {
    if (event.channel === 'messages' && event.type === 'message_chunk') {
      fullText += event.content;
    }
    if (event.channel === 'lifecycle' && event.type === 'run_end') break;
    if (event.channel === 'error') throw new Error(event.message);
  }
  return fullText;
}
```

### Handling tool events

```typescript
for await (const event of client.chat(conv.id).send('Search the web for cats')) {
  switch (event.channel) {
    case 'tools':
      if (event.type === 'tool_start') {
        console.log(`Calling tool: ${event.name}`, event.input);
      }
      if (event.type === 'tool_end') {
        console.log(`Tool result: ${event.name}`, event.output);
      }
      break;
    case 'messages':
      process.stdout.write(event.content);
      break;
    case 'lifecycle':
      if (event.type === 'run_end') return;
      break;
  }
}
```

---

## Building from Source

```bash
cd src/package/sdk/js
npm install
npm run build      # Compiles CJS + ESM + type declarations into dist/
npm run typecheck  # Type-check without emitting output
```

---

## License

Apache License 2.0 — see the [LICENSE](LICENSE) file.
