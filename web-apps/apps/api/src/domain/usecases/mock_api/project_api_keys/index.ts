import { randomBytes } from "node:crypto";

import type { AppContext } from "../../../../server";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type {
  CreatedProjectApiKeyEt,
  ProjectApiKeyEt,
} from "../../../entities/project_api_key";
import {
  HttpStatusCode,
  MockApiException,
} from "../../../exceptions/exception";
import {
  decryptBuffer,
  decryptString,
  encryptBuffer,
  ENVELOPE_ENCRYPTION_ALGORITHM,
  encryptString,
  safeEqualStrings,
} from "../../../../infrastructure/encryption/envelope";
import { ProjectsUsecase } from "../projects";

const DEK_LENGTH_BYTES = 32;
const API_KEY_LENGTH_BYTES = 32;
const API_KEY_PREFIX = "synthapi_pk_";
const MAX_API_KEYS_PER_PROJECT = 15;

type ActiveKek = {
  id: string;
  key_name: string;
  value: string;
};

const createApiKey = (): string =>
  `${API_KEY_PREFIX}${randomBytes(API_KEY_LENGTH_BYTES).toString("base64url")}`;

const getActiveKek = async (ctx: AppContext): Promise<ActiveKek> => {
  const kek = await ctx.db
    .selectFrom("key_encryption_keys")
    .select(["key_name", "id"])
    .orderBy("created_at", "desc")
    .limit(1)
    .executeTakeFirst();

  if (!kek) {
    throw new MockApiException({
      public_message: "Active encryption keys not found for project.",
      status_code: HttpStatusCode.PRECONDITION_FAILED,
    });
  }

  const keyValue = (ctx.env as any)[kek.key_name];

  if (!keyValue) {
    throw new MockApiException({
      public_message:
        "Project API key encryption is not configured. Set ACTIVE_ENCRYPTION_KEY_NAME or an ENCRYPTION_KEY_* secret.",
      status_code: HttpStatusCode.PRECONDITION_FAILED,
    });
  }

  return {
    id: kek.id,
    key_name: kek.key_name,
    value: keyValue,
  };
};

const getKekValue = (env: AppContext["env"], keyName: string): string => {
  const value = (env as any)[keyName];

  if (!value) {
    throw new MockApiException({
      public_message: "Project API key encryption key is not configured.",
      status_code: HttpStatusCode.INTERNAL_SERVER_ERROR,
    });
  }

  return value;
};

export const ProjectApiKeysUsecase = (ctx: AppContext) => {
  const projects = ProjectsUsecase(ctx);

  return {
    listProjectApiKeys: async (
      user: AuthenticatedUser,
      projectId: string,
    ): Promise<ProjectApiKeyEt[]> => {
      const project = await projects.getProject(user, projectId);
      await projects.assertOrganizationAccess(user, project.organization_id);

      return await ctx.db
        .selectFrom("project_api_keys")
        .select([
          "id",
          "project_id",
          "name",
          "key_prefix",
          "key_suffix",
          "created_by_user_id",
          "deleted_at",
          "created_at",
          "updated_at",
        ])
        .where("project_id", "=", projectId)
        .where("deleted_at", "is", null)
        .orderBy("created_at", "desc")
        .execute();
    },

    createProjectApiKey: async (
      user: AuthenticatedUser,
      projectId: string,
      input: { name: string },
    ): Promise<CreatedProjectApiKeyEt> => {
      const project = await projects.getProject(user, projectId);
      await projects.assertOrganizationWriteAccess(
        user,
        project.organization_id,
      );

      const activeKeys = await ctx.db
        .selectFrom("project_api_keys")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("project_id", "=", projectId)
        .where("deleted_at", "is", null)
        .executeTakeFirstOrThrow();

      if (Number(activeKeys.count) >= MAX_API_KEYS_PER_PROJECT) {
        throw new MockApiException({
          public_message: `Maximum limit of ${MAX_API_KEYS_PER_PROJECT} API keys per project reached.`,
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }

      const activeKek = await getActiveKek(ctx);
      const apiKey = createApiKey();
      const dek = randomBytes(DEK_LENGTH_BYTES);
      const encryptedDek = encryptBuffer(dek, activeKek.value);
      const encryptedApiKey = encryptString(apiKey, dek);

      const created = await ctx.db.transaction().execute(async (trx) => {
        const dataEncryptionKey = await trx
          .insertInto("data_encryption_keys")
          .values({
            key_encryption_key_id: activeKek.id,
            algorithm: ENVELOPE_ENCRYPTION_ALGORITHM,
            encrypted_key: encryptedDek.encrypted_value,
            iv: encryptedDek.iv,
            auth_tag: encryptedDek.auth_tag,
          })
          .returning(["id"])
          .executeTakeFirstOrThrow();

        return await trx
          .insertInto("project_api_keys")
          .values({
            project_id: projectId,
            data_encryption_key_id: dataEncryptionKey.id,
            name: input.name,
            key_prefix: apiKey.slice(0, 20),
            key_suffix: apiKey.slice(-8),
            encrypted_key: encryptedApiKey.encrypted_value,
            iv: encryptedApiKey.iv,
            auth_tag: encryptedApiKey.auth_tag,
            created_by_user_id: user.id,
          })
          .returning([
            "id",
            "project_id",
            "name",
            "key_prefix",
            "key_suffix",
            "created_by_user_id",
            "deleted_at",
            "created_at",
            "updated_at",
          ])
          .executeTakeFirstOrThrow();
      });

      return {
        ...created,
        api_key: apiKey,
      };
    },

    revokeProjectApiKey: async (
      user: AuthenticatedUser,
      projectId: string,
      keyId: string,
    ): Promise<void> => {
      const project = await projects.getProject(user, projectId);
      await projects.assertOrganizationWriteAccess(
        user,
        project.organization_id,
      );

      const membership = await ctx.db
        .selectFrom("organization_memberships")
        .select("role")
        .where("organization_id", "=", project.organization_id)
        .where("user_id", "=", user.id)
        .where("status", "=", "active")
        .executeTakeFirst();

      const role = membership?.role ?? "viewer";

      let query = ctx.db
        .updateTable("project_api_keys")
        .set({ deleted_at: new Date() })
        .where("id", "=", keyId)
        .where("project_id", "=", projectId)
        .where("deleted_at", "is", null);

      if (role === "member") {
        query = query.where("created_by_user_id", "=", user.id);
      }

      const result = await query.executeTakeFirst();

      if (Number(result.numUpdatedRows) === 0) {
        throw new MockApiException({
          public_message:
            "API key not found or you do not have permission to revoke it.",
          status_code: HttpStatusCode.FORBIDDEN,
        });
      }
    },

    validateProjectApiKey: async (
      projectId: string,
      providedApiKey: string | undefined,
    ): Promise<{ required: boolean; valid: boolean }> => {
      const rows = await ctx.db
        .selectFrom("project_api_keys")
        .innerJoin(
          "data_encryption_keys",
          "data_encryption_keys.id",
          "project_api_keys.data_encryption_key_id",
        )
        .innerJoin(
          "key_encryption_keys",
          "key_encryption_keys.id",
          "data_encryption_keys.key_encryption_key_id",
        )
        .select([
          "project_api_keys.encrypted_key as encrypted_api_key",
          "project_api_keys.iv as api_key_iv",
          "project_api_keys.auth_tag as api_key_auth_tag",
          "data_encryption_keys.encrypted_key as encrypted_dek",
          "data_encryption_keys.iv as dek_iv",
          "data_encryption_keys.auth_tag as dek_auth_tag",
          "key_encryption_keys.key_name as kek_key_name",
        ])
        .where("project_api_keys.project_id", "=", projectId)
        .where("project_api_keys.deleted_at", "is", null)
        .execute();

      if (rows.length === 0) {
        return { required: false, valid: true };
      }

      if (!providedApiKey) {
        return { required: true, valid: false };
      }

      for (const row of rows) {
        const kekValue = getKekValue(ctx.env, row.kek_key_name);
        const dek = decryptBuffer(
          {
            encrypted_value: row.encrypted_dek,
            iv: row.dek_iv,
            auth_tag: row.dek_auth_tag,
          },
          kekValue,
        );
        const apiKey = decryptString(
          {
            encrypted_value: row.encrypted_api_key,
            iv: row.api_key_iv,
            auth_tag: row.api_key_auth_tag,
          },
          dek,
        );

        if (safeEqualStrings(apiKey, providedApiKey)) {
          return { required: true, valid: true };
        }
      }

      return { required: true, valid: false };
    },
  };
};
