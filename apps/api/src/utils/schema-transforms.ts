import type { DomainFormFieldType, DomainPanelType } from "@ticketsbot/core";

export const API_TO_DOMAIN_FIELD_TYPE: Record<string, DomainFormFieldType> = {
  SHORT_TEXT: "TEXT",
  PARAGRAPH: "TEXT_AREA",
  SELECT: "SELECT",
  EMAIL: "EMAIL",
  NUMBER: "NUMBER",
  CHECKBOX: "CHECKBOX",
  RADIO: "RADIO",
  DATE: "DATE",
};

export const DOMAIN_TO_API_FIELD_TYPE: Record<DomainFormFieldType, string> = {
  TEXT: "SHORT_TEXT",
  TEXT_AREA: "PARAGRAPH",
  SELECT: "SELECT",
  MULTI_SELECT: "SELECT",
  EMAIL: "EMAIL",
  URL: "URL",
  NUMBER: "NUMBER",
  CHECKBOX: "CHECKBOX",
  RADIO: "RADIO",
  DATE: "DATE",
  TIME: "DATE",
  DATETIME: "DATE",
};

export const COMMON_TO_DOMAIN_FIELD_TYPE: Record<string, DomainFormFieldType> = {
  short_text: "TEXT",
  paragraph: "TEXT_AREA",
  select: "SELECT",
  email: "EMAIL",
  number: "NUMBER",
  url: "URL",
  phone: "TEXT",
  date: "DATE",
  checkbox: "CHECKBOX",
  radio: "RADIO",
};

export const transformPanelType = (apiType: string): DomainPanelType => {
  return apiType as DomainPanelType;
};

export const transformApiFieldToDomain = (apiField: any) => {
  const fieldType = API_TO_DOMAIN_FIELD_TYPE[apiField.type] || apiField.type;

  return {
    label: apiField.label,
    field_type: fieldType,
    placeholder: apiField.placeholder || null,
    help_text: apiField.helpText || null,
    validation_rules: {
      required: apiField.required ?? false,
      minLength: apiField.validationRules?.minLength,
      maxLength: apiField.validationRules?.maxLength,
      pattern: apiField.validationRules?.pattern,
      min: apiField.validationRules?.min,
      max: apiField.validationRules?.max,
      options: apiField.validationRules?.options,
      errorMessage: apiField.validationRules?.errorMessage,
    },
    position: apiField.position,
  };
};

export const transformDomainFieldToApi = (domainField: any) => {
  const apiType =
    DOMAIN_TO_API_FIELD_TYPE[domainField.field_type as DomainFormFieldType] ||
    domainField.field_type;

  return {
    id: domainField.id,
    type: apiType,
    label: domainField.label,
    placeholder: domainField.placeholder,
    helpText: domainField.help_text,
    required: domainField.validation_rules?.required ?? false,
    validationRules: {
      minLength: domainField.validation_rules?.minLength,
      maxLength: domainField.validation_rules?.maxLength,
      pattern: domainField.validation_rules?.pattern,
      min: domainField.validation_rules?.min,
      max: domainField.validation_rules?.max,
      options: domainField.validation_rules?.options,
      errorMessage: domainField.validation_rules?.errorMessage,
    },
    position: domainField.position,
  };
};

export const transformApiPanelToDomain = (apiPanel: any) => {
  const basePanel = apiPanel.singlePanel || apiPanel.multiPanel || apiPanel;

  return {
    type: apiPanel.type || "SINGLE",
    title: basePanel.title || apiPanel.title,
    content: basePanel.description || basePanel.content || null,
    guildId: apiPanel.guildId,
    channelId: basePanel.channelId || apiPanel.channelId,
    categoryId: basePanel.categoryId || apiPanel.categoryId || null,
    formId: basePanel.formId || null,
    emoji: basePanel.emoji || null,
    buttonText: basePanel.buttonText || "Create Ticket",
    color: basePanel.buttonColor || basePanel.color || null,
    welcomeMessage: basePanel.welcomeMessage || null,
    introTitle: basePanel.introTitle || null,
    introDescription: basePanel.introDescription || null,
    channelPrefix: basePanel.channelPrefix || null,
    mentionRoles: basePanel.mentionRoles || null,
    hideMentions: basePanel.hideMentions || false,
    parentPanelId: apiPanel.parentPanelId || null,
    orderIndex: apiPanel.orderIndex || 0,
    enabled: apiPanel.enabled ?? true,
    permissions: basePanel.permissions || null,
    imageUrl: basePanel.largeImageUrl || basePanel.imageUrl || null,
    thumbnailUrl: basePanel.smallImageUrl || basePanel.thumbnailUrl || null,
    textSections: basePanel.textSections
      ? Array.isArray(basePanel.textSections)
        ? basePanel.textSections.reduce((acc: any, section: any) => {
            acc[section.name] = section.value;
            return acc;
          }, {})
        : basePanel.textSections
      : null,
  };
};

export const transformDomainPanelToApi = (domainPanel: any) => {
  return {
    id: domainPanel.id,
    type: domainPanel.type,
    title: domainPanel.title,
    content: domainPanel.content,
    guildId: domainPanel.guildId,
    channelId: domainPanel.channelId,
    categoryId: domainPanel.categoryId,
    formId: domainPanel.formId,
    emoji: domainPanel.emoji,
    buttonText: domainPanel.buttonText,
    color: domainPanel.color,
    welcomeMessage: domainPanel.welcomeMessage,
    introTitle: domainPanel.introTitle,
    introDescription: domainPanel.introDescription,
    channelPrefix: domainPanel.channelPrefix,
    mentionRoles: domainPanel.mentionRoles,
    hideMentions: domainPanel.hideMentions,
    parentPanelId: domainPanel.parentPanelId,
    orderIndex: domainPanel.orderIndex,
    enabled: domainPanel.enabled,
    permissions: domainPanel.permissions,
    imageUrl: domainPanel.imageUrl,
    thumbnailUrl: domainPanel.thumbnailUrl,
    textSections: domainPanel.textSections,
    createdAt: domainPanel.createdAt,
    updatedAt: domainPanel.updatedAt,
    form: domainPanel.form,
    parentPanel: domainPanel.parentPanel,
    childPanels: domainPanel.childPanels,
    options: domainPanel.options,
  };
};
