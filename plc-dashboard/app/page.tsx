'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import PLCSelector from '@/components/PLCSelector';
import DateSelector from '@/components/DateSelector';
import DataChart from '@/components/DataChart';

interface PLC {
  id: number;
  name: string;
  displayName: string;
  availableDates: string[];
  database_registers: Array<{
    register: string;
    label: string;
    labelFa: string;
    description: string;
    descriptionFa: string;
  }>;
}

export default function Home() {
  const [plcs, setPLCs] = useState<PLC[]>([]);
  const [selectedPLC, setSelectedPLC] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedRegisters, setSelectedRegisters] = useState<string[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Helper function to extract Autoclave ID
  const getPLCId = (plcName: string): string => {
    const parts = plcName.split('_');
    return parts.length > 1 ? parts[1] : '01';
  };

  // Load Autoclaves on component mount
  useEffect(() => {
    loadPLCs();
  }, []);

  const loadPLCs = async () => {
    try {
      const response = await fetch('/api/plcs');
      const result = await response.json();
      
      if (result.success) {
        setPLCs(result.plcs);
      } else {
        setError('خطا در بارگذاری اتوکلاوها');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error(err);
    }
  };

  const loadData = async () => {
    if (!selectedPLC || !selectedDate) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        plc: selectedPLC,
        date: selectedDate,
      });

      if (selectedRegisters.length > 0) {
        params.append('registers', selectedRegisters.join(','));
      }

      const response = await fetch(`/api/data?${params}`);
      const result = await response.json();

      if (result.success) {
        setChartData(result.data);
      } else {
        setError(result.error || 'Failed to load data');
        setChartData([]);
      }
    } catch (err) {
      setError('Error loading data');
      setChartData([]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load data when selections change
  useEffect(() => {
    if (selectedPLC && selectedDate) {
      loadData();
    }
  }, [selectedPLC, selectedDate, selectedRegisters]);

  const selectedPLCConfig = plcs.find(p => p.name === selectedPLC);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="p-4" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            🏭 داشبورد مانیتورینگ اتوکلاو
            {selectedPLCConfig && (
              <span className="block text-xl text-blue-600 mt-2">
                {selectedPLCConfig.displayName || selectedPLCConfig.name}
              </span>
            )}
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              ❌ {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* PLC Selection Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">تنظیمات</h2>
              
              {/* PLC Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  انتخاب اتوکلاو
                </label>
                <select
                  value={selectedPLC}
                  onChange={(e) => {
                    setSelectedPLC(e.target.value);
                    setSelectedDate(''); // Reset date when PLC changes
                    setSelectedRegisters([]);
                  }}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">اتوکلاو را انتخاب کنید</option>
                  {plcs.map((plc) => (
                    <option key={plc.id} value={plc.name}>
                      {plc.displayName || plc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              {selectedPLC && (
                <DateSelector
                  plcId={getPLCId(selectedPLC)}
                  onDateSelect={setSelectedDate}
                  selectedDate={selectedDate}
                />
              )}

              {/* Register Selection */}
              {selectedPLCConfig && selectedDate && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    انتخاب رجیسترها ({selectedRegisters.length} انتخاب شده)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {selectedPLCConfig.database_registers.map((register) => (
                      <div key={register.register} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={register.register}
                          checked={selectedRegisters.includes(register.label)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRegisters([...selectedRegisters, register.label]);
                            } else {
                              setSelectedRegisters(selectedRegisters.filter(r => r !== register.label));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={register.register} className="mr-2 text-sm text-gray-700">
                          <div className="font-medium">{register.labelFa || register.label}</div>
                          <div className="text-xs text-gray-500">{register.descriptionFa || register.description}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Load Data Button */}
              {selectedPLC && selectedDate && (
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'در حال بارگذاری...' : 'بارگذاری داده‌ها'}
                </button>
              )}
            </div>
          </div>

          {/* Chart Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                📊 نمودار داده‌های PLC
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-gray-500">
                    🔄 در حال بارگذاری داده‌ها...
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <DataChart 
                  data={chartData} 
                  registers={selectedPLCConfig?.database_registers || []}
                  selectedRegisters={selectedRegisters}
                />
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  {selectedPLC && selectedDate ? 
                    '📭 داده‌ای برای نمایش وجود ندارد' : 
                    '👆 لطفاً اتوکلاو و تاریخ را انتخاب کنید'
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              🔗 وضعیت: {plcs.length > 0 ? 'متصل به دیتابیس' : 'در حال اتصال...'}
            </div>
            <div>
              📈 تعداد رکوردها: {chartData.length.toLocaleString('fa-IR')}
            </div>
            <div>
              🕒 آخرین بروزرسانی: {new Date().toLocaleString('fa-IR')}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
