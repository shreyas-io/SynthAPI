import _ from "lodash";

function extractTemplateParams(template: string): string[] {
  if (typeof template !== "string") return [];

  const regex = /\{\{[a-zA-Z_][a-zA-Z0-9_.]*\}\}/g;
  const matches = new Set(template.match(regex));

  return [...(matches ?? [])].map((v) => v.toString().slice(2, -2));
}

export const recursivelyMapTemplateParams = (
  template: unknown,
  context: Record<string, any>,
): any => {
  if (typeof template === "string") {
    return mapTemplateParams(template, context);
  }

  // recursively map arrays
  if (Array.isArray(template)) {
    return template.map((item) => recursivelyMapTemplateParams(item, context));
  }

  // recursively map objects
  if (template && typeof template === "object") {
    return Object.fromEntries(
      Object.entries(template).map(([key, entry]) => [
        key,
        recursivelyMapTemplateParams(entry, context),
      ]),
    );
  }

  return template;
};

export function mapTemplateParams(
  template: string,
  context: Record<string, any>,
): any {
  const template_params = extractTemplateParams(template);

  if (template_params.length === 1) {
    const t = template_params[0] as string;
    let val = _.get(context, t);

    const rebuilt_template = `{{${t}}}`;
    if (template === rebuilt_template) {
      return val;
    }

    if (typeof val !== "string") {
      val = JSON.stringify(val);
    }

    return template.replaceAll(rebuilt_template, val);
  }

  template_params.forEach((t) => {
    let val = _.get(context, t);
    const rebuilt_template = `{{${t}}}`;

    if (typeof val !== "string") {
      val = JSON.stringify(val);
    }

    template = template.replaceAll(rebuilt_template, val);
  });

  return template;
}
