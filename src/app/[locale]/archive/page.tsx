import { Header } from "@/components/header";
import '@/app/globals.css';
import ArchiveMain from "@/components/archive-main";



export default async function ArchivePage() {




  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <ArchiveMain/>
      </main>
    </div>
  );
}
