import { LoginForm } from "@/components/LoginForm";
import { BrandLogo } from "@/components/BrandLogo";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <section className="login-brand-panel flex flex-col justify-center gap-6 p-8 lg:p-12">
        <BrandLogo showSubtitle href={null} size="md" />
        <div className="max-w-md space-y-3">
          <p className="login-brand-headline text-xl font-bold leading-snug">
            Seen, known &amp; loved.
          </p>
          <p className="login-brand-copy text-sm">
            Ministry operations dashboard for Community Church campuses in
            Central Michigan.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6 bg-base-200">
        <LoginForm />
      </section>
    </main>
  );
}
