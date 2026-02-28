import type { JSONSchema7 } from "json-schema";
import type {
  MicroCMSApiSchema,
  MicroCMSCustomFieldDefinition,
  MicroCMSField,
  MicroCMSSchemaBundle,
} from "../types/microcms-schema.js";

export type ToJsonSchemaOptions = {
  title?: string;
  /** Include x-microcms-* extension properties (default: false) */
  includeExtensions?: boolean;
};

export function toJsonSchema(
  schema: MicroCMSApiSchema,
  options?: ToJsonSchemaOptions,
): JSONSchema7 {
  const customFieldMap = buildCustomFieldMap(schema.customFields);
  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const field of schema.apiFields) {
    properties[field.fieldId] = convertField(field, customFieldMap, new Set(), options);
    if (field.required) {
      required.push(field.fieldId);
    }
  }

  const result: JSONSchema7 = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties,
  };

  if (options?.title) {
    result.title = options.title;
  }

  if (required.length > 0) {
    result.required = required;
  }

  return result;
}

export function bundleToJsonSchema(bundle: MicroCMSSchemaBundle): Record<string, JSONSchema7> {
  const result: Record<string, JSONSchema7> = {};

  for (const entry of bundle.apis) {
    result[entry.endpoint] = toJsonSchema(entry.api, {
      title: entry.endpoint,
    });
  }

  return result;
}

function buildCustomFieldMap(
  customFields?: MicroCMSCustomFieldDefinition[],
): Map<string, MicroCMSCustomFieldDefinition> {
  const map = new Map<string, MicroCMSCustomFieldDefinition>();
  if (!customFields) {
    return map;
  }

  for (const def of customFields) {
    map.set(def.createdAt, def);
  }

  return map;
}

function convertField(
  field: MicroCMSField,
  customFieldMap: Map<string, MicroCMSCustomFieldDefinition>,
  visited: Set<string>,
  options?: ToJsonSchemaOptions,
): JSONSchema7 {
  const base = convertFieldByKind(field, customFieldMap, visited, options);

  if (options?.includeExtensions) {
    const ext: Record<string, unknown> = {
      "x-microcms-field-id": field.fieldId,
      "x-microcms-field-name": field.name,
      "x-microcms-kind": field.kind,
    };
    return { ...base, ...ext } as JSONSchema7;
  }

  return base;
}

function convertFieldByKind(
  field: MicroCMSField,
  customFieldMap: Map<string, MicroCMSCustomFieldDefinition>,
  visited: Set<string>,
  options?: ToJsonSchemaOptions,
): JSONSchema7 {
  switch (field.kind) {
    case "text":
      return { type: "string" };

    case "textArea":
      return { type: "string" };

    case "richEditorV2":
      return { type: "string", contentMediaType: "text/html" } as JSONSchema7;

    case "select": {
      const values = field.selectItems.map((item) => item.value);
      if (field.multipleSelect) {
        return {
          type: "array",
          items: { type: "string", enum: values },
        };
      }
      return { type: "string", enum: values };
    }

    case "number": {
      const schema: JSONSchema7 = { type: "number" };
      if (field.numberMin !== undefined) {
        schema.minimum = field.numberMin;
      }
      if (field.numberMax !== undefined) {
        schema.maximum = field.numberMax;
      }
      return schema;
    }

    case "date":
      return { type: "string", format: "date-time" };

    case "boolean": {
      const schema: JSONSchema7 = { type: "boolean" };
      if (field.booleanInitialValue !== undefined) {
        schema.default = field.booleanInitialValue;
      }
      return schema;
    }

    case "media":
      return {
        type: "object",
        properties: {
          url: { type: "string", format: "uri" },
          height: { type: "number" },
          width: { type: "number" },
        },
        required: ["url"],
      };

    case "relation":
      return {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      };

    case "relationList":
      return {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
      };

    case "repeater":
      return convertRepeater(field.customFieldCreatedAtList, customFieldMap, visited, options);

    case "custom":
      return convertCustom(field.customFieldCreatedAt, customFieldMap, visited, options);

    default: {
      // Unknown kind — produce a permissive schema
      const _exhaustive: never = field;
      void _exhaustive;
      return {};
    }
  }
}

function convertRepeater(
  createdAtList: string[],
  customFieldMap: Map<string, MicroCMSCustomFieldDefinition>,
  visited: Set<string>,
  options?: ToJsonSchemaOptions,
): JSONSchema7 {
  const schemas: JSONSchema7[] = [];

  for (const createdAt of createdAtList) {
    const resolved = resolveCustomField(createdAt, customFieldMap, visited, options);
    if (resolved) {
      schemas.push(resolved);
    }
  }

  if (schemas.length === 0) {
    return { type: "array" };
  }

  if (schemas.length === 1) {
    return { type: "array", items: schemas[0] };
  }

  return { type: "array", items: { oneOf: schemas } };
}

function convertCustom(
  createdAt: string,
  customFieldMap: Map<string, MicroCMSCustomFieldDefinition>,
  visited: Set<string>,
  options?: ToJsonSchemaOptions,
): JSONSchema7 {
  const resolved = resolveCustomField(createdAt, customFieldMap, visited, options);
  return resolved ?? { type: "object" };
}

function resolveCustomField(
  createdAt: string,
  customFieldMap: Map<string, MicroCMSCustomFieldDefinition>,
  visited: Set<string>,
  options?: ToJsonSchemaOptions,
): JSONSchema7 | null {
  if (visited.has(createdAt)) {
    // Circular reference — return a permissive object schema
    return { type: "object" };
  }

  const def = customFieldMap.get(createdAt);
  if (!def) {
    return null;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(createdAt);

  const properties: Record<string, JSONSchema7> = {};
  const required: string[] = [];

  for (const field of def.fields) {
    properties[field.fieldId] = convertField(field, customFieldMap, nextVisited, options);
    if (field.required) {
      required.push(field.fieldId);
    }
  }

  const schema: JSONSchema7 = { type: "object", properties };
  if (required.length > 0) {
    schema.required = required;
  }

  return schema;
}
