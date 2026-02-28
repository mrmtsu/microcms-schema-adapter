// microCMS schema types based on actual API schema data from `microcms schema pull`

export type MicroCMSSchemaBundle = {
  version: string;
  pulledAt: string;
  serviceDomain: string | null;
  apis: MicroCMSApiEntry[];
};

export type MicroCMSApiEntry = {
  endpoint: string;
  api: MicroCMSApiSchema;
};

export type MicroCMSApiSchema = {
  apiFields: MicroCMSField[];
  customFields?: MicroCMSCustomFieldDefinition[];
};

export type MicroCMSCustomFieldDefinition = {
  createdAt: string;
  fieldId: string;
  name: string;
  fields: MicroCMSField[];
};

export type MicroCMSSelectItem = {
  id: string;
  value: string;
};

// Discriminated union for all field kinds

export type MicroCMSField =
  | MicroCMSTextField
  | MicroCMSTextAreaField
  | MicroCMSRichEditorV2Field
  | MicroCMSSelectField
  | MicroCMSNumberField
  | MicroCMSDateField
  | MicroCMSBooleanField
  | MicroCMSMediaField
  | MicroCMSRelationField
  | MicroCMSRelationListField
  | MicroCMSRepeaterField
  | MicroCMSCustomField;

type MicroCMSFieldBase = {
  fieldId: string;
  name: string;
  required?: boolean;
  description?: string;
};

export type MicroCMSTextField = MicroCMSFieldBase & {
  kind: "text";
  isUnique?: boolean;
};

export type MicroCMSTextAreaField = MicroCMSFieldBase & {
  kind: "textArea";
};

export type MicroCMSRichEditorV2Field = MicroCMSFieldBase & {
  kind: "richEditorV2";
};

export type MicroCMSSelectField = MicroCMSFieldBase & {
  kind: "select";
  multipleSelect: boolean;
  selectItems: MicroCMSSelectItem[];
  selectInitialValue?: MicroCMSSelectItem[];
};

export type MicroCMSNumberField = MicroCMSFieldBase & {
  kind: "number";
  numberMin?: number;
  numberMax?: number;
};

export type MicroCMSDateField = MicroCMSFieldBase & {
  kind: "date";
  dateFormat?: boolean;
};

export type MicroCMSBooleanField = MicroCMSFieldBase & {
  kind: "boolean";
  booleanInitialValue?: boolean;
};

export type MicroCMSMediaField = MicroCMSFieldBase & {
  kind: "media";
};

export type MicroCMSRelationField = MicroCMSFieldBase & {
  kind: "relation";
  referencedApiEndpoint: string;
  multipleSelect?: boolean;
};

export type MicroCMSRelationListField = MicroCMSFieldBase & {
  kind: "relationList";
  referencedApiEndpoint: string;
};

export type MicroCMSRepeaterField = MicroCMSFieldBase & {
  kind: "repeater";
  customFieldCreatedAtList: string[];
};

export type MicroCMSCustomField = MicroCMSFieldBase & {
  kind: "custom";
  customFieldCreatedAt: string;
};
