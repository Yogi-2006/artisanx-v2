import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useEffect } from 'react';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const { language, setLanguage } = useAuthStore();
    
    useEffect(() => {
        if (i18n.language !== language) {
            i18n.changeLanguage(language);
            document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
            document.documentElement.lang = language;
        }
    }, [language, i18n]);

    const changeLanguage = (lng: string) => {
        setLanguage(lng);
    };

    const languages = [
        { code: 'en', label: 'English' },
        { code: 'ta', label: 'தமிழ்' },
        { code: 'hi', label: 'हिन्दी' },
        { code: 'te', label: 'తెలుగు' },
        { code: 'kn', label: 'ಕನ್ನಡ' },
        { code: 'ml', label: 'മലയാളം' },
        { code: 'bn', label: 'বাংলা' },
        { code: 'mr', label: 'मराठी' },
        { code: 'ur', label: 'اردو' }
    ];

    return (
        <select 
            onChange={(e) => changeLanguage(e.target.value)} 
            value={language} 
            className="border-2 border-outline-variant/30 rounded-full py-1.5 px-3 pr-8 text-sm bg-surface-container-lowest text-on-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm font-medium appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%231b1b1c%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%223%205%206%208%209%205%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-no-repeat"
            aria-label="Select Language"
        >
            {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
    );
}
