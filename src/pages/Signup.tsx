import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { signUp, actionLoading, error, clearError } = useAuth();
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
      setLocalError('Both email and password are required.');
      return;
    }

    setLocalError(null);

    try {
      await signUp(email, password);
      navigate('/', { replace: true });
    } catch {
      // Context displays the error
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-muted/60 p-6 shadow-lg">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">JALYANTRA</p>
          <h1 className="text-2xl font-bold text-foreground">Create admin account</h1>
          <p className="text-sm text-muted-foreground">
            Sign up with an email/password account that has been granted admin rights in Firebase.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1 text-sm">
            <label className="font-semibold text-foreground" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="font-semibold text-foreground" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {(localError || error) && (
            <p className="text-sm text-destructive">
              {localError || error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={actionLoading}>
            {actionLoading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">Already have an account?</p>
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Go to <Link className="underline" to="/login">login</Link> to access the dashboard once you are listed under <code className="font-mono text-[11px]">/admins</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
