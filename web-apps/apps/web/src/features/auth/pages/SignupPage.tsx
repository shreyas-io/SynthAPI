import { GoogleAuthEntry } from "../components/GoogleAuthEntry";

export function SignupPage() {
  return (
    <main className="auth-page">
      <section className="card form">
        <p className="eyebrow">Create workspace</p>
        <h1>Create account</h1>
        <GoogleAuthEntry alternateAction="signin" />
      </section>
    </main>
  );
}
