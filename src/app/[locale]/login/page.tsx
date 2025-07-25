import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale = "en" } = await params;
  const messages = (await import(`@/messages/${locale}.json`)).default;
  const title = messages.LoginPage?.loginTitle || "Login – ChoreChampion";
  return { title };
}

export default function LoginPage() {
  const t = useTranslations("LoginPage");
  // const cookiesStore = await cookies();
  //
  // const accessToken = cookiesStore.get("access_token")?.value;
  // const refreshToken = cookiesStore.get("refresh_token")?.value;
  //
  //   if (accessToken) {
  //     try {
  //       const decoded = await verifyAccessToken(accessToken);
  //       if (decoded) {
  //         // Redirect to the dashboard or home page if already logged in
  //         return Response.redirect(new URL("/dashboard", window.location.href));
  //       }else {
  //           console.log("Access token is invalid or expired. Refreshing...");
  //           // Optionally, you can redirect to the login page or handle it accordingly
  //           if (refreshToken) {
  //             // Call the refresh token service to get a new access token
  //             const res = await fetch("/api/auth/refresh", {
  //               method: "POST",
  //               headers: {
  //                 "Content-Type": "application/json",
  //               },
  //               credentials: "include",
  //             });
  //
  //             if (res.ok) {
  //               const data = await res.json();
  //               console.log("New access token received:", data.accessToken);
  //               // Optionally, redirect to the dashboard or home page
  //               return Response.redirect(new URL("/dashboard", window.location.href));
  //             } else {
  //               console.error("Failed to refresh access token");
  //             }
  //           } else {
  //             console.error("No refresh token available");
  //           }
  //
  //       }
  //     } catch (error) {
  //       console.error("Error: ", error);
  //     }
  //   }

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
