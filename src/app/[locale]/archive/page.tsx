import { Header } from "@/components/header";
import '@/app/globals.css';
// ✅ ENTERPRISE ARCHITECTURE: Import from feature-based archive domain
import { EnterpriseArchive } from "@/components/features/archive";
import { DebugArchiveData } from "@/components/debug/DebugArchiveData";

export default async function ArchivePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        {/* ✅ DEBUG: Temporary debug component to check data */}
        <DebugArchiveData />
        
        {/* ✅ FEATURE-BASED ARCHITECTURE: Use enterprise archive component */}
        <EnterpriseArchive />
      </main>
    </div>
  );
}
