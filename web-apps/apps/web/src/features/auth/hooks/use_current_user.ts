import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { getCurrentUser } from "../api/auth_api";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.authUser,
    queryFn: getCurrentUser,
    retry: false,
  });
};
