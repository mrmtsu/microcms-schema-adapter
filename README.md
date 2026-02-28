# microcms-schema-adapter

> Unofficial project. This library is not affiliated with, endorsed by, or maintained by microCMS.

Convert microCMS proprietary schemas to JSON Schema (draft-07).

A bridge between microCMS's schema format and the standard JSON Schema ecosystem — enabling type generation, validation, documentation, and more.

## Install

```bash
npm i @mrmtsu/microcms-schema-adapter
```

Zero runtime dependencies. Works with Node.js >= 20.

## Usage

### Single API schema

```typescript
import { toJsonSchema } from "@mrmtsu/microcms-schema-adapter";

const microCmsSchema = {
  apiFields: [
    { fieldId: "title", name: "Title", kind: "text", required: true, isUnique: false },
    { fieldId: "body", name: "Body", kind: "richEditorV2", required: true },
    {
      fieldId: "category",
      name: "Category",
      kind: "select",
      multipleSelect: false,
      selectItems: [
        { id: "tech", value: "Tech" },
        { id: "life", value: "Life" },
      ],
    },
  ],
};

const jsonSchema = toJsonSchema(microCmsSchema, { title: "posts" });
console.log(JSON.stringify(jsonSchema, null, 2));
```

Output:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "title": { "type": "string" },
    "body": { "type": "string", "contentMediaType": "text/html" },
    "category": { "type": "string", "enum": ["Tech", "Life"] }
  },
  "title": "posts",
  "required": ["title", "body"]
}
```

### Schema bundle (from `microcms schema pull`)

```typescript
import { bundleToJsonSchema } from "@mrmtsu/microcms-schema-adapter";
import { readFileSync } from "node:fs";

const bundle = JSON.parse(readFileSync("microcms-schema.json", "utf8"));
const schemas = bundleToJsonSchema(bundle);
// => { "posts": JSONSchema7, "tags": JSONSchema7, ... }
```

## API

### `toJsonSchema(schema, options?)`

Converts a single microCMS API schema to JSON Schema (draft-07).

- **schema** (`MicroCMSApiSchema`) — Object with `apiFields` and optional `customFields`
- **options.title** (`string`) — Sets the `title` property in the output schema
- **options.includeExtensions** (`boolean`, default: `false`) — Adds `x-microcms-field-id`, `x-microcms-field-name`, `x-microcms-kind` to each property

Returns: `JSONSchema7`

### `bundleToJsonSchema(bundle)`

Converts a schema bundle (output of `microcms schema pull`) to a record of JSON Schemas keyed by endpoint.

- **bundle** (`MicroCMSSchemaBundle`) — Object with `apis` array

Returns: `Record<string, JSONSchema7>`

## Field mapping

| microCMS kind | JSON Schema |
|---|---|
| `text` | `{ type: "string" }` |
| `textArea` | `{ type: "string" }` |
| `richEditorV2` | `{ type: "string", contentMediaType: "text/html" }` |
| `select` (single) | `{ type: "string", enum: [...] }` |
| `select` (multi) | `{ type: "array", items: { type: "string", enum: [...] } }` |
| `number` | `{ type: "number", minimum?, maximum? }` |
| `date` | `{ type: "string", format: "date-time" }` |
| `boolean` | `{ type: "boolean", default? }` |
| `media` | `{ type: "object", properties: { url, height, width } }` |
| `relation` | `{ type: "object", properties: { id } }` |
| `relationList` | `{ type: "array", items: { type: "object", properties: { id } } }` |
| `repeater` | `{ type: "array", items: { oneOf: [...] } }` |
| `custom` | `{ type: "object", properties: { ... } }` |

## Use cases

The output JSON Schema can be consumed by standard tools:

- **Type generation** — [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript)
- **Validation** — [Ajv](https://ajv.js.org/), [Zod](https://zod.dev/) (via converters)
- **Documentation** — JSON Schema-based doc generators
- **Editor support** — VS Code JSON Schema validation

## Development

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build

# All checks at once
npm run check:ci
```

## License

MIT
