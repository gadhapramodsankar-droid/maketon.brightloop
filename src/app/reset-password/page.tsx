import { resetPasswordWithToken } from '../actions';
import { Lock, ShieldCheck, KeyRound } from 'lucide-react';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
interface ResetPasswordProps {
    searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordProps) {
    const resolved = await searchParams;

    if (!resolved.token) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
                    <p className="text-rose-400 text-sm font-semibold">Missing recovery token.</p>
                    <Link href="/login" className="text-xs text-indigo-400 hover:underline">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center mx-auto border border-indigo-500/30">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Create New Password</h1>
                    <p className="text-xs text-slate-400">8&gt characters, uppercase, lowercase & special character</p>
                </div>

                {resolved.error && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold text-center">
                        {resolved.error}
                    </div>
                )}

                <form action={resetPasswordWithToken} className="space-y-4">
                    <input type="hidden" name="token" value={resolved.token} />

                    <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">New Password</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <input
                                type="password"
                                name="newPassword"
                                required
                                placeholder="••••••••••••"
                                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">Confirm New Password</label>
                        <div className="relative">
                            <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <input
                                type="password"
                                name="confirmPassword"
                                required
                                placeholder="••••••••••••"
                                className="w-full text-sm bg-slate-800/60 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 cursor-pointer"
                    >
                        Update Password & Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}