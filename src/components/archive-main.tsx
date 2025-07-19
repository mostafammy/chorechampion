'use client';

import {useAppContext} from "@/context/app-provider";
import {useTranslations} from "next-intl";
import {ArchiveTable} from "@/components/archive-table";
import '@/app/globals.css';


const ArchiveMain = () => {
    const { archivedTasks, members } = useAppContext();
    const t = useTranslations('ArchivePage');
    return (
        <div className="container mx-auto">
            <h1 className="text-4xl font-bold font-headline mb-6">{t('title')}</h1>
            <p className="text-muted-foreground mb-8">
                {t('description')}
            </p>
            <ArchiveTable archivedTasks={archivedTasks} members={members}/>
        </div>
    )
}
export default ArchiveMain
