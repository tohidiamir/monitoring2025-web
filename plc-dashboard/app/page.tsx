'use client';

import { useState, useEffect } from 'react';
import PLCSelector from '@/components/PLCSelector';
import DataChart from '@/components/DataChart';

interface PLC {
  id: number;
  name: string;
  availableDates: string[];
  database_registers: Array<{
    register: string;
    label: string;
    description: string;
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

  // Load PLCs on component mount
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
        setError('Failed to load PLCs');
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
    <div className="min-h-screen bg-gray-100 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          🏭 داشبورد مانیتورینگ PLC
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            ❌ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* PLC Selection Panel */}
          <div className="lg:col-span-1">
            <PLCSelector
              plcs={plcs}
              selectedPLC={selectedPLC}
              selectedDate={selectedDate}
              selectedRegisters={selectedRegisters}
              onPLCChange={setSelectedPLC}
              onDateChange={setSelectedDate}
              onRegistersChange={setSelectedRegisters}
            />
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
                    '👆 لطفاً PLC و تاریخ را انتخاب کنید'
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
  );
}
