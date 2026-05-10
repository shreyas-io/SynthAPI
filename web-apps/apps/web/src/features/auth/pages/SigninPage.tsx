import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "../../../shared/api/query_keys";
import { signin } from "../api/auth_api";

export function SigninPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: signin,
    async onSuccess() {
      queryClient.removeQueries({ queryKey: queryKeys.authUser });
      navigate("/projects");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ username, password });
  };

  return (
    <main className="auth-page">
      <form className="card form" onSubmit={submit}>
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in</h1>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {mutation.isError && <p className="error">{mutation.error.message}</p>}
        <button disabled={mutation.isPending}>Sign in</button>
        <p>
          No account? <Link to="/signup">Create one</Link>
        </p>
      </form>
    </main>
  );
}
