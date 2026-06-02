import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../lib/query/query_keys";
import { getCurrentUser, signin, signout, signup } from "../api/auth_api";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.authUser,
    queryFn: getCurrentUser,
    retry: false,
  });
};

export const useSignin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signin,
    onSuccess() {
      queryClient.removeQueries({ queryKey: queryKeys.authUser });
    },
  });
};

export const useSignup = () => {
  return useMutation({
    mutationFn: signup,
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
