// frontend/src/pages/Home.jsx (v6.2)
// Page d'accueil simple : hero avec présentation + 3 étapes "Comment ça marche"
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap, ArrowRight, Sparkles, KeyRound, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Home() {
  const { user } = useAuth();

  const dashLink = user
    ? user.role === 'super' ? '/super' : user.role === 'teacher' ? '/teacher' : '/student'
    : null;

  return (
    <div>
      {/* ========== HERO ========== */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1),transparent_50%)]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-sm mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span>Plateforme éducative pour Tronc Commun, 1ère & 2ème Bac</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight"
          >
          <br className="hidden sm:block" />
            Votre espace numérique <span className="text-amber-300">d'apprentissage</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto mb-8"
          >
            Retrouvez toutes vos ressources pédagogiques, activités interactives et évaluations dans un environnement simple et collaboratif.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {user ? (
              <Link to={dashLink} className="px-6 py-3 bg-white text-indigo-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition inline-flex items-center gap-2">
                Accéder à mon espace <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-6 py-3 bg-white text-indigo-700 rounded-xl font-semibold shadow-lg hover:shadow-xl transition inline-flex items-center gap-2">
                  Se connecter <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/register" className="px-6 py-3 bg-white/10 backdrop-blur text-white border-2 border-white/30 rounded-xl font-semibold hover:bg-white/20 transition">
                  Créer un compte
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ========== COMMENT ÇA MARCHE ========== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-3">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-slate-600">En 3 étapes simples</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition"
            >
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-lg">
                {i + 1}
              </div>
              <s.icon className="w-8 h-8 text-indigo-600 mb-3 mt-2" />
              <h3 className="font-bold text-slate-800 mb-2">{s.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{s.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Inline CTA */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-3 mt-12"
          >
            <Link to="/register" className="btn-primary">
              Je crée mon compte
            </Link>
            <Link to="/login" className="btn-secondary">
              J'ai déjà un compte
            </Link>
          </motion.div>
        )}
      </section>
    </div>
  );
}

const STEPS = [
  {
    icon: GraduationCap,
    title: 'Créez votre compte',
    description: 'Inscrivez-vous gratuitement en choisissant votre niveau scolaire (Tronc Commun, 1ère ou 2ème Bac).',
  },
  {
    icon: KeyRound,
    title: 'Débloquez vos matières',
    description: 'Saisissez le code d\'accès fourni par votre enseignant pour chaque matière à laquelle vous voulez accéder.',
  },
  {
    icon: TrendingUp,
    title: 'Révisez et progressez',
    description: 'Parcourez les ressources, passez les quiz, déposez vos projets et suivez votre progression en temps réel.',
  },
];
