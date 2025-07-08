import { createNavigation } from 'next-intl/navigation';
import { locales } from '@/i18n';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
    locales,
    pathnames: {
        // Add your pathnames here if using pathname localization
        '/': '/',
        '/archive': '/archive',
        '/leaderboard': '/leaderboard',
        // Add more routes as needed
    }
});