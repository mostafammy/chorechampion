"use client";

import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogOut, AlertTriangle } from "lucide-react";
import LoadingSpinner from "@/components/loading-spinner";

type AuthCheckStatus = "checking" | "authenticated" | "unauthenticated";

export function LoginPageClient() {
  const t = useTranslations("LoginPage");
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthCheckStatus>("checking");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle successful login from LoginForm component
  const handleLoginSuccess = () => {
    console.log("Login successful - redirecting to dashboard");
    // Let the LoginForm handle the redirect
    // Don't change authStatus here to avoid conflicts
  };

  // Handle login error - keep user on login page
  const handleLoginError = () => {
    console.log("Login failed - staying on login page for user to see error");
    // Don't change authStatus - stay in unauthenticated state
    // This ensures user stays on login page to see error message
  };

  // Simple one-time authentication check for login page
  useEffect(() => {
    const checkAuthenticationStatus = async () => {
      try {
        const response = await fetch("/api/auth/token-status", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "valid") {
            console.log("User already authenticated - showing logout prompt");
            setAuthStatus("authenticated");
          } else {
            // Token needs refresh or is invalid - treat as unauthenticated for login page
            console.log("User not authenticated - showing login form");
            setAuthStatus("unauthenticated");
          }
        } else {
          // No valid authentication - this is expected on login page
          console.log("No valid authentication - showing login form");
          setAuthStatus("unauthenticated");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // On error, treat as unauthenticated (normal for login page)
        console.log("Auth check failed - showing login form");
        setAuthStatus("unauthenticated");
      }
    };

    // Only check authentication once when component mounts
    checkAuthenticationStatus();
  }, []); // Empty dependency array - only run once on mount

  const handleLogoutAndContinue = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        console.log("Logout successful");
      } else {
        console.warn("Logout endpoint returned:", response.status);
      }

      // Clear local storage
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (error) {
          console.warn("Failed to clear storage:", error);
        }
      }

      // Update state to show login form
      setAuthStatus("unauthenticated");
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if logout fails, show login form
      setAuthStatus("unauthenticated");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/");
  };

  // Show loading while checking authentication
  if (authStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show logout prompt if user is already authenticated
  if (authStatus === "authenticated") {
    return (
      <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="m8 3 4 8 5-5v11H5V7l3-4Z" />
              <path d="M13 11h7" />
            </svg>
            ChoreChampion
          </div>
        </div>
        
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px] px-4">
            <div className="flex justify-end space-x-2 mb-4">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 shadow-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-base mb-2">
                      {t("alreadyLoggedIn") || "You're already logged in"}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {t("logoutToLoginDifferentUser") || "You need to logout first to login as a different user. This ensures your data stays secure."}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 pt-2">
                    <Button
                      onClick={handleLogoutAndContinue}
                      variant="outline"
                      className="flex items-center justify-center gap-2 w-full bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      disabled={isLoggingOut}
                      size="lg"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {isLoggingOut ? (t("loggingOut") || "Logging out...") : (t("logoutAndContinue") || "Logout & Login as Different User")}
                      </span>
                    </Button>
                    
                    <Button
                      onClick={handleGoToDashboard}
                      className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md transition-all"
                      size="lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {t("goToDashboard") || "Continue to Dashboard"}
                      </span>
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Show login form if user is not authenticated
  return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="m8 3 4 8 5-5v11H5V7l3-4Z" />
            <path d="M13 11h7" />
          </svg>
          ChoreChampion
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;{t("testimonial") || "ChoreChampion has transformed how our family handles household tasks. It's fun, engaging, and keeps everyone motivated!"}&rdquo;
            </p>
            <footer className="text-sm">{t("testimonialAuthor") || "Sarah Johnson"}</footer>
          </blockquote>
        </div>
      </div>
      
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <LoginForm 
            headerActions={
              <div className="flex space-x-2">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            }
            onLoginSuccess={handleLoginSuccess}
            onLoginError={handleLoginError}
          />
          <p className="px-8 text-center text-sm text-muted-foreground">
            {t("signupPrompt") || "Don't have an account?"}{" "}
            <a
              href="/signup"
              className="underline underline-offset-4 hover:text-primary"
            >
              {t("signupLink") || "Sign up"}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
