"use client";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { SignupInputType } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/schemas/auth/signup.schema";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const SignupForm = () => {
  const t = useTranslations("SignupForm");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignupInputType>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupInputType) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (response.ok) {
        toast({
          title: t("signupSuccessTitle") || "Signup successful!",
          description: t("signupSuccessDesc") || "You can now log in.",
          variant: "success",
        });
        reset();
      } else {
        toast({
          title: t("signupErrorTitle") || "Signup failed",
          description:
            result?.error ||
            result?.message ||
            t("signupErrorDesc") ||
            "An error occurred.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: t("signupErrorTitle") || "Signup failed",
        description:
          err?.message || t("signupErrorDesc") || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          {t("fullName")}
        </label>
        <input
          {...register("name")}
          id="name"
          className="w-full px-3 py-2 border rounded-md"
          placeholder={t("fullNamePlaceholder")}
          disabled={loading}
        />
        {errors.name && <p className="text-red-500">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          {t("email")}
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          className="w-full px-3 py-2 border rounded-md"
          placeholder={t("emailPlaceholder")}
          disabled={loading}
        />
        {errors.email && <p className="text-red-500">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          {t("password")}
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          className="w-full px-3 py-2 border rounded-md"
          placeholder={t("passwordPlaceholder")}
          disabled={loading}
        />
        {errors.password && (
          <p className="text-red-500">{errors.password.message}</p>
        )}
      </div>
      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium flex items-center justify-center"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
            {t("signingUp") || "Signing up..."}
          </span>
        ) : (
          t("signUp")
        )}
      </button>
      <p className="text-sm text-center text-muted-foreground mt-2">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-primary underline">
          {t("logIn")}
        </Link>
      </p>
    </form>
  );
};
export default SignupForm;
