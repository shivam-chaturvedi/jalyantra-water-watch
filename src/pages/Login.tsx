import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { logIn, actionLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    setLocalError(null);

    try {
      await logIn(email, password);
      navigate('/', { replace: true });
    } catch {
      // Error message is surfaced from context
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8 rounded-[32px] border border-teal-100 bg-white p-8 sm:p-10 shadow-2xl shadow-teal-900/5">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center shadow-inner">
             <img src="/logo.jpeg" alt="JalYantra" className="h-12 w-12 rounded-xl object-cover" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-teal-600">JalYantra Panel</p>
          <h1 className="text-3xl font-bold text-[#0f172a]">Admin Login</h1>
          <p className="text-sm text-slate-500">Welcome back. Enter your credentials to manage the portal.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 ml-1" htmlFor="email">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@jalyantra.tech"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 rounded-2xl border-slate-200 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 ml-1" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-2xl border-slate-200 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>

          {(localError || error) && (
            <div className="rounded-xl bg-red-50 p-3 border border-red-100">
              <p className="text-xs font-medium text-red-600 text-center">
                {localError || error}
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            className="h-12 w-full rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98]" 
            disabled={actionLoading}
          >
            {actionLoading ? 'Verifying...' : 'Sign in to Dashboard'}
          </Button>

          <button 
            type="button"
            onClick={() => window.location.assign('/')}
            className="w-full text-center text-xs font-medium text-slate-400 hover:text-teal-600 transition-colors py-2"
          >
            ← Back to public website
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
