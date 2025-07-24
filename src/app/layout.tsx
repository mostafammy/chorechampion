import './globals.css';
import { AppProvider } from '@/context/app-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import type { Metadata } from 'next';
import './globals.css';
import LoadingSpinner from '@/components/loading-spinner';
import getAllTasksService from "@/lib/getAllTasksService";
import {MergeCompletionDate} from "@/lib/completionDateService";
import {initialMembers} from "@/data/seed";
import { cookies } from 'next/headers';
import {NextIntlClientProvider} from "next-intl";
import {refreshTokenService} from "@/lib/auth/jwt/refreshTokenService";

export const metadata: Metadata = {
    title: "ChoreChampion",
    description: "Manage household chores with ease and a little bit of fun."
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    // const cookieStore = await cookies(); // Get cookies for authentication
    // const accessToken = cookieStore.get("access_token")?.value;
    // const refreshToken = cookieStore.get("refresh_token")?.value;
    // if (!accessToken) {
    //     if (refreshToken){
    //         console.log('No access token, but found refresh token. Attempting to refresh...');
    //         await refreshTokenService();
    //     }else {
    //         // If no access & refresh token, redirect to login or handle unauthenticated state
    //         return (
    //             <NextIntlClientProvider>
    //                 <div className="flex items-center justify-center h-screen">
    //                     <p>Please log in to continue.</p>
    //                 </div>
    //             </NextIntlClientProvider>
    //         );
    //     }
    //
    //
    // }
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <AppProvider>
            {children}
          </AppProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
