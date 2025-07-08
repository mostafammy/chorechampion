'use client';

import { ArchiveTable } from "@/components/archive-table";
import { Header } from "@/components/header";
import { useAppContext } from '@/context/app-provider';
import { useTranslations } from 'next-intl';
import '@/app/globals.css';


export default function ArchivePage() {
  const { archivedTasks, members } = useAppContext();
  const t = useTranslations('ArchivePage');

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold font-headline mb-6">{t('title')}</h1>
          <p className="text-muted-foreground mb-8">
            {t('description')}
          </p>
          <ArchiveTable archivedTasks={archivedTasks} members={members} />
        </div>
      </main>
    </div>
  );
}
