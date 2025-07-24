import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";


export async function generateMetadata({ params }: { params: { locale: string } }) {
  const locale = params?.locale || "en";
  const messages = (await import(`@/messages/${locale}.json`)).default;
  const title = messages.LoginPage?.loginTitle || "Login – ChoreChampion";
  return { title };
}

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md  text-primary-foreground overflow-hidden">
            <img src="/favicon.ico" alt="Logo" className="w-5 h-5 object-contain" />
          </div>
          {t("brandName")}
        </a>
        <LoginForm
          headerActions={
            <>
              <LanguageSwitcher />
              <ThemeToggle />
            </>
          }
        />
      </div>
    </div>
  )
}
