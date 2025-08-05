'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Activity, FileText, Beaker } from '@/components/ui/icons';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'گزارش‌گیری',
      icon: BarChart3,
      isActive: pathname === '/'
    },
    {
      href: '/live',
      label: 'نمایش زنده',
      icon: Activity,
      isActive: pathname === '/live'
    },
    {
      href: '/sterilization',
      label: 'فرآیند استریل',
      icon: Beaker,
      isActive: pathname === '/sterilization'
    },
    {
      href: '/logs',
      label: 'لاگ‌های اتوکلاو',
      icon: FileText,
      isActive: pathname === '/logs'
    }
  ];

  return (
    <nav className="bg-white shadow-sm border-b" dir="rtl">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8 space-x-reverse">
            <h1 className="text-xl font-bold text-gray-900">سامانه مانیتورینگ اتوکلاوها</h1>
            
            <div className="flex space-x-4 space-x-reverse">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      item.isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 ml-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            سامانه مانیتورینگ صنعتی
          </div>
        </div>
      </div>
    </nav>
  );
}
