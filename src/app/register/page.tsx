import { registerCustomer } from '../actions';
import { UserPlus, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const resolvedParams = await searchParams;
  const error = resolvedParams.error;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto border border-indigo-500/30">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white">Create Account</h1>
          <p className="text-xs text-slate-400">Join Brightloop Platform as a Customer</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form action={registerCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                name="name"
                required
                placeholder="Jane Doe"
                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                required
                placeholder="jane@example.com"
                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">One account per unique email.</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Confirm Password</label>
            <div className="relative">
              <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                name="confirmPassword"
                required
                placeholder="••••••••"
                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            Create My Account
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}