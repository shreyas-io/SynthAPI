import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";

import { signup } from "../api/auth_api";

export function SignupPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: signup,
    onSuccess() {
      navigate("/signin");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ username, password });
  };

  return (
    <main className="auth-page">
      <form className="card form" onSubmit={submit}>
        <p className="eyebrow">Create workspace</p>
        <h1>Sign up</h1>
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
        <button disabled={mutation.isPending}>Create account</button>
        <p>
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
