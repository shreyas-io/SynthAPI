import { GoogleAuthEntry } from "../components/GoogleAuthEntry";
import { SynthLogo } from "../../../components/atoms/SynthLogo";

export function SigninPage() {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <SynthLogo size={32} />
      </header>
      <section className="card form">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in</h1>
        <GoogleAuthEntry alternateAction="signup" />
      </section>
    </main>
  );
}
