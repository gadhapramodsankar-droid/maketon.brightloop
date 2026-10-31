import { requestPasswordReset, loginUser } from '../actions';
import { Lock, Mail, Layers } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

interface LoginPageProps {
    searchParams: Promise<{ error?: string; success?: string }>;
}

async function LoginContent({ searchParams }: LoginPageProps) {
    const resolvedParams = await searchParams;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">

                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto border border-indigo-500/30">
                        <Layers className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Brightloop</h1>
                    <p className="text-xs text-slate-400">Sign in to your portal</p>
                </div>

                {resolvedParams.error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold text-center">
                        {resolvedParams.error}
                    </div>
                )}

                {resolvedParams.success && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center">
                        {resolvedParams.success}
                    </div>
                )}

                <form action={loginUser} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Email Address</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="name@business.com"
                                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-bold text-slate-300 uppercase">Password</label>
                            <Link href="/forgot-password" className="text-xs text-indigo-400 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
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

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                        Sign In
                    </button>
                </form>

                <div className="text-center pt-2">
                    <p className="text-xs text-slate-400">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-indigo-400 font-bold hover:underline">
                            Create an Account
                        </Link>
                    </p>
                </div>

            </div>
        </div>
    );
}

export default function LoginPage(props: LoginPageProps) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading...</div>}>
            <LoginContent {...props} />
        </Suspense>
    );
}