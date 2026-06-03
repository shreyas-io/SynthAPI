import { GoogleAuthEntry } from "../components/GoogleAuthEntry";

export function SigninPage() {
  return (
    <main className="auth-page">
      <section className="card form">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in</h1>
        <GoogleAuthEntry alternateAction="signup" />
      </section>
    </main>
  );
}
