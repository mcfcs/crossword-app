import React, { useState } from 'react';
import { X, Check, RefreshCw } from './Icons';

// Optional sign-in: email magic-link (OTP) or Google. Guests never see this
// unless they choose to save/sync.
const AuthModal = ({ isOpen, onClose, auth }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // { ok, msg }
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const sendLink = async () => {
    if (!email.trim()) { setStatus({ ok: false, msg: 'Enter your email.' }); return; }
    setBusy(true); setStatus(null);
    try {
      const { error } = await auth.signInEmail(email.trim());
      if (error) throw error;
      setStatus({ ok: true, msg: 'Check your email for a sign-in link.' });
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'Could not send the link.' });
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true); setStatus(null);
    try {
      const { error } = await auth.signInGoogle();
      if (error) throw error;
    } catch (err) {
      setStatus({ ok: false, msg: err.message || 'Google sign-in failed.' });
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-ink/45 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div className="panel w-full max-w-md p-6 animate-rise-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="eyebrow">Optional</div>
            <h3 className="font-display text-2xl font-semibold text-ink">Sign in</h3>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink"><X size={20} /></button>
        </div>
        <p className="text-ink-soft text-sm mb-5">Save your created puzzles and sync history across devices. You can keep playing as a guest without an account.</p>

        <button onClick={google} disabled={busy} className="btn w-full mb-3">Continue with Google</button>

        <div className="flex items-center gap-3 my-3"><div className="rule-hair flex-1" /><span className="eyebrow">or email</span><div className="rule-hair flex-1" /></div>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" className="field mb-3" />
        <button onClick={sendLink} disabled={busy} className="btn btn-accent w-full">
          {busy ? <><RefreshCw size={16} className="animate-spin" />Sending…</> : <><Check size={16} />Email me a sign-in link</>}
        </button>

        {status && <div className={`mt-4 text-sm font-medium ${status.ok ? 'text-correct' : 'text-wrong'}`}>{status.msg}</div>}
      </div>
    </div>
  );
};

export default AuthModal;
