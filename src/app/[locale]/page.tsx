import { Dashboard } from '@/components/smart-dashboard';
import { Header } from '@/components/header';





export default async function Page() {


  return (

      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <Dashboard />
        </main>
      </div>

  );
}
