import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logobmcbg1.png';
import { DevFillButton } from '../components/DevFillButton';

export function LoginPage() {
  const [nip, setNip] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [username, setUsername] = useState('');
  const [systemPassword, setSystemPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'employee' | 'system'>('employee');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
       await login(loginMode === 'employee' ? nip.trim() : username.trim(), loginMode === 'employee' ? birthdate : systemPassword);
      navigate('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'NIP atau tanggal lahir tidak valid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <section className="login-visual" aria-label="Visitor Management">
        <div className="login-visual-content">
          <img src={logo} alt="Braja Mukti Cakra" className="login-logo" />
          <h2>Visitor Management System</h2>
          <p>Ruang kerja digital untuk mengelola kedatangan visitor, safety induction, dan aktivitas area perusahaan secara tertib.</p>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
           <h1>Welcome</h1>
           <p className="login-helper">Masuk untuk mengelola kunjungan, check-in, dan checkout.</p>
           <div className="login-mode-switch" role="tablist" aria-label="Jenis login">
             <button type="button" className={loginMode === 'employee' ? 'active' : ''} onClick={() => setLoginMode('employee')} role="tab" aria-selected={loginMode === 'employee'}>Pegawai</button>
             <button type="button" className={loginMode === 'system' ? 'active' : ''} onClick={() => setLoginMode('system')} role="tab" aria-selected={loginMode === 'system'}>Akun sistem</button>
           </div>
          <div className="login-visitor-route">
            <div><strong>Anda visitor?</strong><span>Isi data kunjungan dan Safety Induction tanpa membuat akun.</span></div>
            <button type="button" onClick={() => navigate('/visitor/register')}>Mulai registrasi visitor</button>
          </div>
           {loginMode === 'employee' && <div className="mb-5 flex flex-wrap gap-2">
            <DevFillButton
              label="Isi data contoh Admin"
              onClick={() => { setNip('3490'); setBirthdate('110408'); }}
            />
            <DevFillButton
              label="Isi data contoh Security"
              onClick={() => { setNip('0377'); setBirthdate('030504'); }}
            />
           </div>}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
           {loginMode === 'employee' ? <><div>
            <label className="login-label" htmlFor="nip">NIP</label>
            <input
              id="nip"
              type="text"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Nomor Induk Pegawai"
              autoComplete="username"
              className="w-full"
              required
              disabled={isSubmitting}
            />
           </div>
           <div>
            <label className="login-label" htmlFor="birthdate">TANGGAL LAHIR</label>
            <input
              id="birthdate"
              type="password"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              placeholder="DD/MM/YY atau DDMMYY"
              autoComplete="current-password"
              className="w-full"
              required
              disabled={isSubmitting}
            />
           </div></> : <><div>
             <label className="login-label" htmlFor="username">USERNAME</label>
             <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username akun sistem" autoComplete="username" className="w-full" required disabled={isSubmitting} />
           </div>
           <div>
             <label className="login-label" htmlFor="system-password">PASSWORD</label>
             <input id="system-password" type="password" value={systemPassword} onChange={(e) => setSystemPassword(e.target.value)} placeholder="Password akun sistem" autoComplete="current-password" className="w-full" required disabled={isSubmitting} />
           </div></>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
      </section>
    </div>
  );
}
