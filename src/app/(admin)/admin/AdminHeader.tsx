'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut, Home, ShieldCheck } from 'lucide-react';

interface AdminHeaderProps {
  user: {
    name: string | null;
    email: string;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between py-3">
        {/* Left side - Logo and Admin badge */}
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="text-lg font-bold text-white hover:text-primary transition-colors"
          >
            Pack Attack
          </Link>
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-500/50">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Admin</span>
          </div>
        </div>

        {/* Right side - Navigation and user */}
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Site</span>
          </Link>
          
          <div className="h-4 w-px bg-gray-700" />
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 hidden sm:inline">
              {user.name || user.email}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

