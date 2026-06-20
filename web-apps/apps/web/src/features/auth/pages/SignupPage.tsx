import { GoogleAuthEntry } from "../components/GoogleAuthEntry";
import { SynthLogo } from "../../../components/atoms/SynthLogo";

export function SignupPage() {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <SynthLogo size={32} />
      </header>
      <section className="card form">
        <p className="eyebrow">Create workspace</p>
        <h1>Create account</h1>
        <GoogleAuthEntry alternateAction="signin" />
      </section>
    </main>
  );
}
