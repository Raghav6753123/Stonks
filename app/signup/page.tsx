
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, ArrowRight, Mail, Lock, User, Eye, EyeOff, Brain, Shield, Zap, Check, Rocket } from 'lucide-react';

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Animated stats
  const [userCount, setUserCount] = useState(12847);

  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount(prev => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Signup failed');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white flex">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-12 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14] to-[#0a0a12]" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#6366f1]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-[#10b981]/10 rounded-full blur-[100px]" />

        {/* Content */}
        <div className="relative z-10 max-w-lg">
          {/* Main heading */}
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Join {userCount.toLocaleString()}+ traders
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Start making smarter investment decisions with AI-powered insights
          </p>

          {/* Floating cards layout */}
          <div className="relative h-[350px]">
            {/* Main central card */}
            <div className="absolute top-[40px] left-[40px] bg-gradient-to-br from-[#12121a] to-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-6 shadow-[0_0_60px_rgba(16,185,129,0.15)] w-[280px] animate-float-fast z-20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Get Started Free</p>
                  <p className="text-gray-500 text-sm">No credit card required</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#10b981]" />
                  <span className="text-gray-300 text-sm">Unlimited AI predictions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#10b981]" />
                  <span className="text-gray-300 text-sm">Real-time market alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#10b981]" />
                  <span className="text-gray-300 text-sm">Portfolio tracking</span>
                </div>
              </div>
            </div>

            {/* Top right floating card */}
            <div className="absolute top-0 right-0 bg-gradient-to-br from-[#12121a] to-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 shadow-[0_0_40px_rgba(99,102,241,0.1)] w-[180px] animate-float-slow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-[#6366f1]" />
                </div>
                <p className="text-white text-sm font-medium">AI Ready</p>
              </div>
              <p className="text-gray-500 text-xs">Powered by GPT-4</p>
            </div>

            {/* Bottom left card */}
            <div className="absolute bottom-[20px] left-0 bg-gradient-to-br from-[#12121a] to-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 shadow-[0_0_40px_rgba(245,158,11,0.1)] w-[200px] animate-float-medium">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#f59e0b]" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Bank-grade</p>
                  <p className="text-gray-500 text-xs">256-bit encryption</p>
                </div>
              </div>
            </div>

            {/* Bottom right card */}
            <div className="absolute bottom-0 right-[20px] bg-gradient-to-br from-[#12121a] to-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-4 shadow-[0_0_40px_rgba(16,185,129,0.1)] w-[160px] animate-float-slow">
              <div className="text-center">
                <p className="text-3xl font-bold text-[#10b981]">4.9</p>
                <div className="flex justify-center gap-0.5 my-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3 h-3 text-[#f59e0b]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
                <p className="text-gray-500 text-xs">12K+ reviews</p>
              </div>
            </div>
          </div>

          {/* User avatars and join message */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center text-white text-sm font-bold border-2 border-[#0d0d14]">JD</div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white text-sm font-bold border-2 border-[#0d0d14]">AK</div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center text-white text-sm font-bold border-2 border-[#0d0d14]">MR</div>
              <div className="w-10 h-10 rounded-full bg-[#1e1e2e] flex items-center justify-center text-gray-400 text-xs font-medium border-2 border-[#0d0d14]">+5K</div>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Join them today</p>
              <p className="text-gray-500 text-xs">Signed up in the last 24h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 relative">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-[#6366f1]/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#10b981]/5 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-10 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Stonks</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-gray-400">Start your journey to smarter investing</p>
          </div>

          {/* Form Card */}
          <div className="bg-gradient-to-br from-[#12121a] to-[#0d0d14] border border-[#1e1e2e] rounded-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-300">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#10b981] transition-colors" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-11 h-12 bg-[#0a0a12] border-[#2a2a3a] hover:border-[#3a3a4a] focus:border-[#10b981] focus:ring-[#10b981]/20 rounded-xl text-white placeholder:text-gray-600"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-300">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#10b981] transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-11 h-12 bg-[#0a0a12] border-[#2a2a3a] hover:border-[#3a3a4a] focus:border-[#10b981] focus:ring-[#10b981]/20 rounded-xl text-white placeholder:text-gray-600"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#10b981] transition-colors" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-11 pr-11 h-12 bg-[#0a0a12] border-[#2a2a3a] hover:border-[#3a3a4a] focus:border-[#10b981] focus:ring-[#10b981]/20 rounded-xl text-white placeholder:text-gray-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Password strength hints */}
                <div className="flex gap-2 mt-2">
                  <div className={`h-1 flex-1 rounded-full ${formData.password.length > 0 ? 'bg-[#10b981]' : 'bg-[#2a2a3a]'}`} />
                  <div className={`h-1 flex-1 rounded-full ${formData.password.length >= 6 ? 'bg-[#10b981]' : 'bg-[#2a2a3a]'}`} />
                  <div className={`h-1 flex-1 rounded-full ${formData.password.length >= 8 ? 'bg-[#10b981]' : 'bg-[#2a2a3a]'}`} />
                  <div className={`h-1 flex-1 rounded-full ${formData.password.length >= 12 ? 'bg-[#10b981]' : 'bg-[#2a2a3a]'}`} />
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 w-4 h-4 rounded border-[#2a2a3a] bg-[#0a0a12] text-[#10b981] focus:ring-[#10b981]/20"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-400">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#10b981] hover:text-[#34d399]">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[#10b981] hover:text-[#34d399]">Privacy Policy</Link>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#10b981] hover:bg-[#10b981]/90 text-white font-medium rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {error && (
                <p className="text-sm text-red-400 mt-2" role="alert">
                  {error}
                </p>
              )}

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2a2a3a]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[#0f0f17] text-gray-500">or sign up with</span>
                </div>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 bg-[#0a0a12] border-[#2a2a3a] hover:border-[#3a3a4a] hover:bg-[#1a1a2a] text-white rounded-xl"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 bg-[#0a0a12] border-[#2a2a3a] hover:border-[#3a3a4a] hover:bg-[#1a1a2a] text-white rounded-xl"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </Button>
              </div>
            </form>
          </div>

          {/* Login Link */}
          <p className="mt-8 text-center text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#10b981] hover:text-[#34d399] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
