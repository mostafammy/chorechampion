import { Dashboard } from "@/components/dashboard";
import { Header } from "@/components/header";
import '@/app/globals.css'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <Dashboard />
      </main>
    </div>
  );
}
