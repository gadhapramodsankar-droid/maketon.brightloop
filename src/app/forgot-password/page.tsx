import { requestPasswordReset } from '../actions';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';

interface ForgotPasswordProps {
    searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordProps) {
    const resolved = await searchParams;

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto border border-indigo-500/30">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Reset Password</h1>
                    <p className="text-xs text-slate-400">Enter your registered email to receive a secure recovery link.</p>
                </div>

                {resolved.error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold text-center">
                        {resolved.error}
                    </div>
                )}

                {resolved.success && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-semibold text-center">
                        {resolved.success}
                    </div>
                )}

                <form action={requestPasswordReset} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Registered Email</label>
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

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                        Send Recovery Link
                    </button>
                </form>

                <div className="text-center pt-2">
                    <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}