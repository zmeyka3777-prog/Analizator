import React, { useState } from 'react';
import { ArrowLeft, Users, Briefcase, Database, Settings, Shield } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import UserManagement from './UserManagement';
import EmployeeManagement from './EmployeeManagement';
import DataManagement from './DataManagement';
import SystemSettings from './SystemSettings';

interface AdminPanelProps {
  onBack?: () => void;
}

type AdminTab = 'users' | 'employees' | 'data' | 'settings';

interface TabConfig {
  key: AdminTab;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const tabs: TabConfig[] = [
    {
      key: 'users',
      label: 'Пользователи',
      icon: <Users className="h-4 w-4" />,
      component: <UserManagement />,
    },
    {
      key: 'employees',
      label: 'Сотрудники',
      icon: <Briefcase className="h-4 w-4" />,
      component: <EmployeeManagement />,
    },
    {
      key: 'data',
      label: 'Управление данными',
      icon: <Database className="h-4 w-4" />,
      component: <DataManagement />,
    },
    {
      key: 'settings',
      label: 'Настройки системы',
      icon: <Settings className="h-4 w-4" />,
      component: <SystemSettings />,
    },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50/30">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-blue-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-gray-600 hover:text-[#004F9F]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад
                </Button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-[#6DB7FF] to-[#004F9F] rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#004F9F]">
                    Панель администратора
                  </h1>
                  <p className="text-xs text-gray-500">MDLP Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${
                    activeTab === tab.key
                      ? 'border-[#004F9F] text-[#004F9F] bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab?.component}
      </main>
    </div>
  );
}

export default AdminPanel;
