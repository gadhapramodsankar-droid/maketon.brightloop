import { Suspense } from 'react';
import { resetPasswordWithToken } from '../actions';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import Link from 'next/link';

interface ResetPasswordProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

async function ResetPasswordContent({ searchParams }: ResetPasswordProps) {
  const resolved = await searchParams;

  if (!resolved.token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <p className="text-rose-400 text-sm font-semibold">Missing recovery token.</p>
          <Link href="/login" className="text-xs text-indigo-400 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white">Create New Password</h1>
          <p className="text-xs text-slate-400">
            &gt; 8 characters, uppercase, lowercase &amp; special character
          </p>
        </div>

        {resolved.error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs">
            {resolved.error}
          </div>
        )}

        <form action={resetPasswordWithToken} className="space-y-4">
          <input type="hidden" name="token" value={resolved.token} />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Confirm Password
            </label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="password"
                name="confirmPassword"
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage(props: ResetPasswordProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading...</div>}>
      <ResetPasswordContent {...props} />
    </Suspense>
  );
}