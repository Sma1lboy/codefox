'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface LoginFormData {
  username: string;
  password: string;
}

const LoginPage = () => {
  const { login, isLoading, isAuthenticated, validateToken } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await login({
        username: formData.username,
        password: formData.password,
      });
      if (res.success) {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const result = await validateToken();
      if (result.success) {
        router.push('/');
      }
    };
    checkAuth();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-light-background dark:bg-dark-background">
      <div
        className={`w-full max-w-md px-8 transition-all duration-1000 ease-in-out
          ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-semibold text-light-text-primary dark:text-dark-text-primary">
            Sign In
          </h1>
          <p className="text-gray-500">
            Enter credentials to login to your account
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Username
            </Label>
            <Input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              className="h-12 rounded-lg border-light-border dark:border-dark-border 
                       bg-light-surface dark:bg-dark-surface
                       text-light-text-primary dark:text-dark-text-primary
                       focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="h-12 rounded-lg border-light-border dark:border-dark-border 
                       bg-light-surface dark:bg-dark-surface
                       text-light-text-primary dark:text-dark-text-primary
                       focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 
                     text-white rounded-lg font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
