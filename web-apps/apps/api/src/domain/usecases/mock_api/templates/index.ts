import type { AppContext } from "../../../../server";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import { ProjectsUsecase } from "../projects";
import { seedStripeTemplate } from "./seed_stripe";

export type TemplateMetadata = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export const TemplatesUsecase = (context: AppContext) => {
  const getTemplatesList = (): TemplateMetadata[] => {
    return [
      {
        id: "stripe",
        name: "Stripe",
        description: "Payment processing endpoints including charges and customers. Completely stateful.",
        icon: "credit-card",
      },
    ];
  };

  const createProjectFromTemplate = async (
    user: AuthenticatedUser,
    templateId: string,
    organizationId: string
  ) => {
    // 1. Verify template exists
    const template = getTemplatesList().find((t) => t.id === templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (templateId === "stripe") {
      return await seedStripeTemplate(context, user, organizationId);
    }
    
    throw new Error("Template implementation not found");
  };

  return {
    getTemplatesList,
    createProjectFromTemplate,
  };
};
