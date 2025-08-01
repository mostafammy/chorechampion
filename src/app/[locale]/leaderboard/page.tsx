import { Header } from "@/components/header";
import { Leaderboard } from "@/components/leaderboard";
import '@/app/globals.css';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale = "en" } = await params;
  const messages = (await import(`@/messages/${locale}.json`)).default;
  const title = messages.LeaderboardPage?.title || "Leaderboard – ChoreChampion";
  return { title };
}

export default async function LeaderboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Leaderboard />
      </main>
    </div>
  );
}
