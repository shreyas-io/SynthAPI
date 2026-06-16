import { toolDefinitions } from "./definitions";
import { renderUiFormToolInputDto } from "./schemas";
import type { ITool } from "./types";

export const uiTools = {
  render_ui_form: {
    definition: toolDefinitions.render_ui_form,
    async execute(_ctx, _workspace, input) {
      renderUiFormToolInputDto.parse(input);
      return "Form Rendered on the UI";
    },
  },
} satisfies Pick<Record<string, ITool>, "render_ui_form">;
