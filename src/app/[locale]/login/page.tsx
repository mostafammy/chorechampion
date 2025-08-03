import { LoginPageClient } from "@/components/login-page-client";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale = "en" } = await params;
  const messages = (await import(`@/messages/${locale}.json`)).default;
  const title = messages.LoginPage?.loginTitle || "Login – ChoreChampion";
  return { title };
}

export default function LoginPage() {
  return <LoginPageClient />;
}
