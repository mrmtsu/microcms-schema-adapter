import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bundleToJsonSchema, toJsonSchema } from "../src/index.js";
import type { MicroCMSApiSchema, MicroCMSSchemaBundle } from "../src/index.js";

async function loadFixture(name: string): Promise<MicroCMSApiSchema> {
  const path = resolve(import.meta.dirname, "fixtures", name);
  return JSON.parse(await readFile(path, "utf8"));
}

// --- Field kind conversion tests ---

describe("toJsonSchema", () => {
  describe("text field", () => {
    it("converts text to string", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          { fieldId: "title", name: "Title", kind: "text", required: true, isUnique: false },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.title).toEqual({ type: "string" });
      expect(result.required).toEqual(["title"]);
    });
  });

  describe("textArea field", () => {
    it("converts textArea to string", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [{ fieldId: "body", name: "Body", kind: "textArea" }],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.body).toEqual({ type: "string" });
      expect(result.required).toBeUndefined();
    });
  });

  describe("richEditorV2 field", () => {
    it("converts richEditorV2 to string with contentMediaType", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [{ fieldId: "content", name: "Content", kind: "richEditorV2", required: true }],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.content).toEqual({
        type: "string",
        contentMediaType: "text/html",
      });
    });
  });

  describe("select field", () => {
    it("converts single select to string enum", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          {
            fieldId: "process",
            name: "Process",
            kind: "select",
            multipleSelect: false,
            selectItems: [
              { id: "washed", value: "Washed" },
              { id: "natural", value: "Natural" },
            ],
          },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.process).toEqual({
        type: "string",
        enum: ["Washed", "Natural"],
      });
    });

    it("converts multi select to array of string enum", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          {
            fieldId: "tags",
            name: "Tags",
            kind: "select",
            multipleSelect: true,
            selectItems: [
              { id: "a", value: "A" },
              { id: "b", value: "B" },
            ],
          },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.tags).toEqual({
        type: "array",
        items: { type: "string", enum: ["A", "B"] },
      });
    });
  });

  describe("number field", () => {
    it("converts number with min/max", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          { fieldId: "rating", name: "Rating", kind: "number", numberMin: 1, numberMax: 10 },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.rating).toEqual({
        type: "number",
        minimum: 1,
        maximum: 10,
      });
    });

    it("converts number without constraints", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [{ fieldId: "count", name: "Count", kind: "number" }],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.count).toEqual({ type: "number" });
    });
  });

  describe("date field", () => {
    it("converts date to string with format date-time", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [{ fieldId: "publishedAt", name: "Published", kind: "date" }],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.publishedAt).toEqual({
        type: "string",
        format: "date-time",
      });
    });
  });

  describe("boolean field", () => {
    it("converts boolean with default", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          { fieldId: "isActive", name: "Active", kind: "boolean", booleanInitialValue: true },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.isActive).toEqual({
        type: "boolean",
        default: true,
      });
    });

    it("converts boolean without default", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [{ fieldId: "isEvergreen", name: "Evergreen", kind: "boolean" }],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.isEvergreen).toEqual({ type: "boolean" });
    });
  });

  describe("media field", () => {
    it("converts media to object with url, height, width", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [{ fieldId: "photo", name: "Photo", kind: "media" }],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.photo).toEqual({
        type: "object",
        properties: {
          url: { type: "string", format: "uri" },
          height: { type: "number" },
          width: { type: "number" },
        },
        required: ["url"],
      });
    });
  });

  describe("relation field", () => {
    it("converts relation to object with id", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          {
            fieldId: "author",
            name: "Author",
            kind: "relation",
            referencedApiEndpoint: "authors",
          },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.author).toEqual({
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      });
    });
  });

  describe("relationList field", () => {
    it("converts relationList to array of objects with id", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          {
            fieldId: "tags",
            name: "Tags",
            kind: "relationList",
            referencedApiEndpoint: "tags",
          },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.tags).toEqual({
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
      });
    });
  });

  describe("custom field", () => {
    it("resolves custom field definition", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          { fieldId: "meta", name: "Meta", kind: "custom", customFieldCreatedAt: "cf-1" },
        ],
        customFields: [
          {
            createdAt: "cf-1",
            fieldId: "seoMeta",
            name: "SEO Meta",
            fields: [
              {
                fieldId: "ogTitle",
                name: "OG Title",
                kind: "text",
                required: true,
                isUnique: false,
              },
              { fieldId: "ogDescription", name: "OG Desc", kind: "textArea" },
            ],
          },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.meta).toEqual({
        type: "object",
        properties: {
          ogTitle: { type: "string" },
          ogDescription: { type: "string" },
        },
        required: ["ogTitle"],
      });
    });

    it("returns object for unresolved custom field", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          { fieldId: "meta", name: "Meta", kind: "custom", customFieldCreatedAt: "unknown" },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.meta).toEqual({ type: "object" });
    });
  });

  describe("repeater field", () => {
    it("resolves repeater with single custom field", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          {
            fieldId: "items",
            name: "Items",
            kind: "repeater",
            customFieldCreatedAtList: ["cf-1"],
          },
        ],
        customFields: [
          {
            createdAt: "cf-1",
            fieldId: "item",
            name: "Item",
            fields: [{ fieldId: "label", name: "Label", kind: "text", isUnique: false }],
          },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.items).toEqual({
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" } },
        },
      });
    });

    it("resolves repeater with multiple custom fields using oneOf", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          {
            fieldId: "blocks",
            name: "Blocks",
            kind: "repeater",
            customFieldCreatedAtList: ["cf-1", "cf-2"],
          },
        ],
        customFields: [
          {
            createdAt: "cf-1",
            fieldId: "textBlock",
            name: "Text",
            fields: [{ fieldId: "body", name: "Body", kind: "textArea" }],
          },
          {
            createdAt: "cf-2",
            fieldId: "imageBlock",
            name: "Image",
            fields: [{ fieldId: "image", name: "Image", kind: "media" }],
          },
        ],
      };
      const result = toJsonSchema(schema);
      const items = result.properties?.blocks as any;
      expect(items.type).toBe("array");
      expect(items.items.oneOf).toHaveLength(2);
    });

    it("returns empty array schema for unresolved repeater", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          {
            fieldId: "items",
            name: "Items",
            kind: "repeater",
            customFieldCreatedAtList: ["unknown"],
          },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.properties?.items).toEqual({ type: "array" });
    });
  });

  describe("circular reference", () => {
    it("prevents infinite recursion with circular custom fields", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          { fieldId: "node", name: "Node", kind: "custom", customFieldCreatedAt: "cf-a" },
        ],
        customFields: [
          {
            createdAt: "cf-a",
            fieldId: "node",
            name: "Node",
            fields: [
              { fieldId: "child", name: "Child", kind: "custom", customFieldCreatedAt: "cf-a" },
            ],
          },
        ],
      };
      const result = toJsonSchema(schema);
      const node = result.properties?.node as any;
      expect(node.type).toBe("object");
      // The circular child should be a plain object
      expect(node.properties.child).toEqual({ type: "object" });
    });
  });

  describe("required fields", () => {
    it("correctly collects required fields", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [
          { fieldId: "title", name: "Title", kind: "text", required: true, isUnique: false },
          { fieldId: "body", name: "Body", kind: "textArea" },
          { fieldId: "slug", name: "Slug", kind: "text", required: true, isUnique: true },
        ],
      };
      const result = toJsonSchema(schema);
      expect(result.required).toEqual(["title", "slug"]);
    });
  });

  describe("options", () => {
    it("sets title when provided", () => {
      const schema: MicroCMSApiSchema = { apiFields: [] };
      const result = toJsonSchema(schema, { title: "MyAPI" });
      expect(result.title).toBe("MyAPI");
    });

    it("includes x-microcms extensions when enabled", () => {
      const schema: MicroCMSApiSchema = {
        apiFields: [{ fieldId: "name", name: "Name", kind: "text", isUnique: false }],
      };
      const result = toJsonSchema(schema, { includeExtensions: true });
      const prop = result.properties?.name as any;
      expect(prop["x-microcms-field-id"]).toBe("name");
      expect(prop["x-microcms-field-name"]).toBe("Name");
      expect(prop["x-microcms-kind"]).toBe("text");
    });
  });

  describe("edge cases", () => {
    it("handles empty apiFields", () => {
      const schema: MicroCMSApiSchema = { apiFields: [] };
      const result = toJsonSchema(schema);
      expect(result.type).toBe("object");
      expect(result.properties).toEqual({});
      expect(result.required).toBeUndefined();
    });
  });
});

// --- bundleToJsonSchema tests ---

describe("bundleToJsonSchema", () => {
  it("converts bundle to record of JSON schemas", () => {
    const bundle: MicroCMSSchemaBundle = {
      version: "0.x",
      pulledAt: "2025-01-01T00:00:00.000Z",
      serviceDomain: "test",
      apis: [
        {
          endpoint: "posts",
          api: {
            apiFields: [
              { fieldId: "title", name: "Title", kind: "text", required: true, isUnique: false },
            ],
          },
        },
        {
          endpoint: "tags",
          api: {
            apiFields: [
              { fieldId: "name", name: "Name", kind: "text", required: true, isUnique: false },
            ],
          },
        },
      ],
    };
    const result = bundleToJsonSchema(bundle);
    expect(Object.keys(result)).toEqual(["posts", "tags"]);
    expect(result.posts.title).toBe("posts");
    expect(result.tags.title).toBe("tags");
    expect(result.posts.properties?.title).toEqual({ type: "string" });
  });
});

// --- Fixture-based integration tests ---

describe("fixture integration", () => {
  it("converts coffee-beans.json", async () => {
    const schema = await loadFixture("coffee-beans.json");
    const result = toJsonSchema(schema, { title: "coffee_beans" });

    expect(result.$schema).toBe("http://json-schema.org/draft-07/schema#");
    expect(result.type).toBe("object");
    expect(result.required).toEqual(["name"]);

    // text field
    expect(result.properties?.name).toEqual({ type: "string" });

    // single select
    const process = result.properties?.process as any;
    expect(process.type).toBe("string");
    expect(process.enum).toContain("ウォッシュド");
    expect(process.enum).toContain("ナチュラル");

    // relationList
    expect(result.properties?.tags).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    });

    // media
    const photo = result.properties?.photo as any;
    expect(photo.type).toBe("object");
    expect(photo.properties.url).toEqual({ type: "string", format: "uri" });
  });

  it("converts tech-articles.json", async () => {
    const schema = await loadFixture("tech-articles.json");
    const result = toJsonSchema(schema);

    expect(result.required).toEqual(["title", "content"]);

    // richEditorV2
    expect(result.properties?.content).toEqual({
      type: "string",
      contentMediaType: "text/html",
    });

    // textArea
    expect(result.properties?.summary).toEqual({ type: "string" });

    // date
    expect(result.properties?.lastReviewedAt).toEqual({
      type: "string",
      format: "date-time",
    });

    // boolean
    expect(result.properties?.isEvergreen).toEqual({ type: "boolean" });
  });

  it("converts coffee-brews.json", async () => {
    const schema = await loadFixture("coffee-brews.json");
    const result = toJsonSchema(schema);

    expect(result.required).toEqual(["bean", "date"]);

    // relation
    expect(result.properties?.bean).toEqual({
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    });

    // number with min/max
    expect(result.properties?.rating).toEqual({
      type: "number",
      minimum: 1,
      maximum: 10,
    });
  });

  it("converts tags.json", async () => {
    const schema = await loadFixture("tags.json");
    const result = toJsonSchema(schema);

    expect(result.required).toEqual(["name"]);
    expect(result.properties?.name).toEqual({ type: "string" });
  });
});
