import _ from "lodash";

function extractTemplateParams(template: string): string[] {
  if (typeof template !== "string") return [];

  const regex = /\{\{[a-zA-Z_][a-zA-Z0-9_.]*\}\}/g;
  const matches = new Set(template.match(regex));

  return [...(matches ?? [])].map((v) => v.toString());
}

function mapTemplateParams(
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
