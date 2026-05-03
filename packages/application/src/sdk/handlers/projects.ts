import { AppContext } from "../..";

export async function Projects(ctx: AppContext) {
  return {
    createProject: (data: unknown) => {},
    getProject: (id: string) => {},
    deleteProject: (id: string) => {},
    updateProject: (id: string, data: unknown) => {},
  };
}
