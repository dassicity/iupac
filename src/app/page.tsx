'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/auth/AuthForm';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Show loading spinner during authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mb-4 mx-auto border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication form if not authenticated
  if (!isAuthenticated) {
    return (
      <AuthForm
        mode={authMode}
        onModeChange={setAuthMode}
      />
    );
  }

  // Show main dashboard if authenticated
  return <Dashboard />;
}
