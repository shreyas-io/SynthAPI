import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import { getAuthProviders, getCurrentUser, signout } from "../api/auth_api";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.authUser,
    queryFn: getCurrentUser,
    retry: false,
  });
};

export const useAuthProviders = () => {
  return useQuery({
    queryKey: queryKeys.authProviders,
    queryFn: getAuthProviders,
  });
};

export const useSignout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signout,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: queryKeys.authUser });
    },
  });
};
