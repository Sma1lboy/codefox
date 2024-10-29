'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, PartyPopper } from 'lucide-react';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';

type Step = 'welcome' | 'form' | 'success' | 'congrats';

export default function Register() {
  const router = useRouter();
  const { register, isLoading, isAuthenticated, validateToken } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    } else {
      validateToken();
    }
  }, [isAuthenticated, router, validateToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateAccount = async () => {
    if (formData.name && formData.email && formData.password) {
      setStep('success');

      try {
        const success = await register({
          username: formData.name,
          email: formData.email,
          password: formData.password,
        });

        if (success) {
          setStep('congrats');
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setStep('form');
        }
      } catch (error) {
        setStep('form');
      }
    }
  };

  const handleEnterChat = () => {
    console.log('enter');
    router.push('/');
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
    <div className="flex items-center justify-center min-h-screen bg-light-background dark:bg-dark-background overflow-hidden">
      <div className="w-full max-w-md p-8 relative">
        {/* Welcome Section */}
        <div
          className={`transition-all duration-500 ease-in-out space-y-6
            ${step === 'welcome' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 absolute'}`}
        >
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Welcome!
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Your Codefox server is live and ready to use. This step by step
            guide will help you set up your admin account. Admin account is the
            highest level of access in your server. Once created, you can invite
            other members to join your server.
          </p>
          <Button
            onClick={() => setStep('form')}
            disabled={isLoading}
            className="w-full h-12 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-lg text-lg"
          >
            Start
          </Button>
        </div>

        {/* Form Section */}
        <div
          className={`transition-all duration-500 ease-in-out
            ${
              step === 'form'
                ? 'translate-y-0 opacity-100'
                : step === 'welcome'
                  ? 'translate-y-full opacity-0 absolute'
                  : '-translate-y-full opacity-0 absolute'
            }`}
        >
          <h2 className="text-2xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-6">
            Create Admin Account
          </h2>
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                  Name
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="w-full h-12 px-4 rounded-lg border-light-border dark:border-dark-border 
                           bg-light-surface dark:bg-dark-surface
                           text-light-text-primary dark:text-dark-text-primary
                           focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                  Email
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="w-full h-12 px-4 rounded-lg border-light-border dark:border-dark-border 
                           bg-light-surface dark:bg-dark-surface
                           text-light-text-primary dark:text-dark-text-primary
                           focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                  Password
                </label>
                <Input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className="w-full h-12 px-4 rounded-lg border-light-border dark:border-dark-border 
                           bg-light-surface dark:bg-dark-surface
                           text-light-text-primary dark:text-dark-text-primary
                           focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <p className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Please store your password in a safe place. We do not store
                  your password and cannot recover it for you.
                </p>
              </div>
            </div>

            <Button
              onClick={handleCreateAccount}
              disabled={
                isLoading ||
                !formData.name ||
                !formData.email ||
                !formData.password
              }
              className="w-full h-12 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 
                       text-white rounded-lg text-lg"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </div>

        {/* Success Section */}
        <div
          className={`transition-all duration-500 ease-in-out text-center space-y-6
            ${step === 'success' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 absolute'}`}
        >
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center animate-bounce">
              <Check className="h-8 w-8 text-primary-500 dark:text-primary-400" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-light-text-primary dark:text-dark-text-primary">
            Processing...
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Please wait while we set up your account
          </p>
        </div>

        {/* Congratulations Section */}
        <div
          className={`transition-all duration-500 ease-in-out text-center space-y-6
            ${step === 'congrats' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 absolute'}`}
        >
          <div className="flex justify-center">
            <div className="h-24 w-24 rounded-full bg-primary-500 dark:bg-primary-600 flex items-center justify-center animate-pulse">
              <PartyPopper className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Congratulations, {formData.name}!
            </h2>
            <p className="text-xl text-light-text-secondary dark:text-dark-text-secondary">
              Your admin account has been successfully created
            </p>
          </div>
          <div className="pt-6">
            <Button
              onClick={handleEnterChat}
              disabled={isLoading}
              className="w-full h-12 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 
                       text-white rounded-lg text-lg transform transition-transform hover:scale-105"
            >
              {isLoading ? 'Loading...' : 'Enter Chat'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
