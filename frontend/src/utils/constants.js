// frontend/src/utils/constants.js
// Shared constants used across teacher + student views.
import {
  FileText, BookText, Video, Image, MousePointerClick, FlaskConical, ClipboardCheck,
  HelpCircle, Briefcase,
} from 'lucide-react';

// 8 resource types defined by the official program
export const RESOURCE_TYPES = {
  pdf_course:  { label: 'Cours PDF',           icon: FileText,         color: 'blue',   needs: 'pdf' },
  summary:     { label: 'Résumé',              icon: BookText,         color: 'purple', needs: 'pdf_or_html' },
  video:       { label: 'Vidéo',               icon: Video,            color: 'red',    needs: 'url' },
  image:       { label: 'Schéma / Image',      icon: Image,            color: 'pink',   needs: 'url' },
  interactive: { label: 'Activité interactive',icon: MousePointerClick,color: 'green',  needs: 'url_or_html' },
  tp:          { label: 'Travaux pratiques',   icon: FlaskConical,     color: 'amber',  needs: 'pdf' },
  evaluation:  { label: 'Évaluation pratique', icon: ClipboardCheck,   color: 'rose',   needs: 'pdf' },
};

// Items that count toward progression (resources + quizzes + projects)
export const QUIZ_META    = { label: 'Quiz',         icon: HelpCircle, color: 'indigo' };
export const PROJECT_META = { label: 'Mini-projet',  icon: Briefcase,  color: 'orange' };

export const LEVEL_LABEL = {
  tronc_commun: 'Tronc Commun',
  '1bac':       '1ère Bac',
  '2bac':       '2ème Bac',
};

// Helper for Tailwind: returns matching badge color classes
export function badgeClassFor(color) {
  const map = {
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    red:    'bg-red-100 text-red-700',
    pink:   'bg-pink-100 text-pink-700',
    green:  'bg-emerald-100 text-emerald-700',
    amber:  'bg-amber-100 text-amber-700',
    rose:   'bg-rose-100 text-rose-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return map[color] || 'bg-slate-100 text-slate-700';
}
