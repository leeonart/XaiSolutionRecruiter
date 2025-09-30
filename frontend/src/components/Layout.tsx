import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/',
    tooltip: 'System overview, status, and quick actions'
  },
  { 
    name: 'Jobs', 
    href: '/jobs',
    tooltip: 'View, manage, and edit job records in database'
  },
  { 
    name: 'Resume Management', 
    href: '/resume-management',
    tooltip: 'Comprehensive resume processing, upload, and AI matching'
  },
  { 
    name: 'Matches', 
    href: '/matches',
    tooltip: 'View job-resume matching results and ratings'
  },
  { 
    name: 'Prepare MTB (Google Sheets)', 
    href: '/processing',
    tooltip: 'Process Master Tracking Board CSV files and extract job IDs'
  },
  { 
    name: 'Job Description Downloads (MTB)', 
    href: '/job-description-downloads',
    tooltip: 'Download job description files from Google Drive'
  },
  { 
    name: 'Job Description Download (ZIP)', 
    href: '/job-file-organizer',
    tooltip: 'Select specific job files and manage downloads'
  },
  { 
    name: 'Job Recovery & Search', 
    href: '/job-recovery',
    tooltip: 'Find misplaced job files and cross-folder search functionality'
  },
  { 
    name: 'MTB Management', 
    href: '/mtb-management',
    tooltip: 'Master Tracking Board synchronization and job status management'
  },
  { 
    name: 'AI Job Processing (JSON)', 
    href: '/job-processing',
    tooltip: 'Process job files with AI to extract structured data'
  },
  { 
    name: 'Advanced Tools', 
    href: '/operations',
    tooltip: 'Advanced operations like text combining and pipeline runs'
  },
  { 
    name: 'Settings', 
    href: '/settings',
    tooltip: 'Configure AI agents and system settings'
  },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white p-2"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-shrink-0 items-center px-4 py-4">
            <h1 className="text-xl font-bold text-gray-900">AI Job Platform</h1>
          </div>
          <div className="mt-5 h-0 flex-1 overflow-y-auto">
            <nav className="space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    onClick={() => setSidebarOpen(false)}
                    title={item.tooltip}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">AI Job Platform</h1>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    title={item.tooltip}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            className="lg:hidden px-4"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <div className="relative w-full text-gray-400 focus-within:text-gray-600">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-sm font-medium text-gray-500">
                    AI-Powered Job Processing Platform
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}