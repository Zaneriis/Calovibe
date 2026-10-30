import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { readAccess, type View } from './access';


function App() {
  const [view, setView] = useState<View>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dark, setDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [csrf, setCsrf] = useState<string | null>(null);
  const pending = useRef(false);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => {
    pending.current = true;
    let active = true;
    void readAccess().then(access => {
      if (active) { setView(access.view); setCsrf(access.csrf); pending.current = false; }
    });
    return () => { active = false; };
  }, []);
  async function retry() {
    if (pending.current) return;
    pending.current = true;
    setView('loading'); setMessage(''); setCsrf(null);
    const access = await readAccess();
    setView(access.view); setCsrf(access.csrf); pending.current = false;
  }
  async function logout() {
    if (pending.current || !csrf) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch('/auth/logout', { method: 'POST', signal: AbortSignal.timeout(10000), credentials: 'same-origin', headers: { 'X-CSRF-Token': csrf } });
      if (response.status === 204 || response.status === 401) { setCsrf(null); setView('anonymous'); }
      else if (response.status === 403) setMessage('Déconnexion refusée. Vérifiez votre session avant de réessayer.');
      else setMessage('La déconnexion n’a pas pu être confirmée. Vous pouvez réessayer.');
    } catch { setMessage('La déconnexion n’a pas pu être confirmée. Vous pouvez réessayer.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="shell">
    <header><a className="brand" href="/" aria-label="Calovibe, accueil"><span aria-hidden="true" className="mark">c</span>calovibe<span className="brand-dot">.</span></a><button className="theme" onClick={() => setDark(!dark)} aria-pressed={dark}>Thème {dark ? 'sombre' : 'clair'}</button></header>
    <main id="main"><p className="eyebrow">VOTRE ESPACE PERSONNEL</p><h1>Bienvenue sur Calovibe</h1><p className="intro">Votre suivi alimentaire, à votre rythme.</p>
      <section className="card" aria-labelledby="access-title" aria-busy={view === 'loading' || busy}>
        <div className="symbol" aria-hidden="true">{view === 'connected' ? '✓' : '↗'}</div>
        <h2 id="access-title">{view === 'loading' ? 'Vérification de votre session' : view === 'connected' ? 'Vous êtes connecté' : view === 'forbidden' ? 'Accès non autorisé' : view === 'error' ? 'Connexion au service impossible' : 'Connectez-vous à votre espace'}</h2>
        <p role="status">{view === 'loading' ? 'Un instant, nous vérifions votre accès.' : view === 'connected' ? 'Votre session est active et le service est disponible.' : view === 'forbidden' ? 'Ce compte ne dispose pas des droits nécessaires pour accéder à Calovibe.' : view === 'error' ? 'Le service est momentanément indisponible. Réessayez dans quelques instants.' : 'La connexion s’effectue sur la page sécurisée de votre fournisseur d’identité.'}</p>
        {view === 'anonymous' && <a className="primary" href="/auth/login">Se connecter <span aria-hidden="true">↗</span></a>}
        {(view === 'error' || view === 'forbidden') && <button className="primary" onClick={retry}>Vérifier à nouveau</button>}
        {view === 'connected' && <div className="available"><span className="dot" aria-hidden="true"/> Service disponible</div>}
        {message && <p role="alert" className="error">{message}</p>}
        {csrf && view !== 'loading' && <button className="secondary" disabled={busy} onClick={() => void logout()}>{busy ? 'Déconnexion en cours…' : 'Se déconnecter'}</button>}
      </section>
      <p className="footnote">Un espace privé, réservé à votre usage personnel.</p>
    </main><footer>Calovibe · Suivi alimentaire personnel</footer>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);




