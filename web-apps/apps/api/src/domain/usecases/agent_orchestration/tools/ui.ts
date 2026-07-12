import { toolDefinitions } from "./definitions";
import { renderUiFormToolInputDto } from "./schemas";
import type { ITool } from "./types";

export const uiTools = {
  render_ui_form: {
    definition: toolDefinitions.render_ui_form,
    async execute(_ctx, _workspace, input, runs_in_turn) {
      if (runs_in_turn > 100) return { error: 'You have used the "render_ui_form" tool for the max number of times in this turn. You can call this tool again after the user responds.' };
      renderUiFormToolInputDto.parse(input);
      return "Form Rendered on the UI";
    },
  },
} satisfies Pick<Record<string, ITool>, "render_ui_form">;
