'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

interface PLC {
  id: number;
  name: string;
  displayName: string;
  availableDates: string[];
}

interface SterilizationProcess {
  id: number;
  startTime: string;
  endTime: string;
  duration: number;
  maxTemperature: number;
  minTemperature: number;
  sterilizationDuration: number;
  qualityScore: number;
  success: boolean;
}

export default function SterilizationPage() {
  console.log('🚀 SterilizationPage: Component initializing...');
  
  const [plcs, setPLCs] = useState<PLC[]>([]);
  const [selectedPLC, setSelectedPLC] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [processes, setProcesses] = useState<SterilizationProcess[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  console.log('🔄 SterilizationPage: State initialized successfully');

  const loadPLCs = async () => {
    try {
      console.log('🔍 Sterilization: Loading PLCs...');
      const response = await fetch('/api/plcs');
      const result = await response.json();
      
      console.log('📊 Sterilization: API response:', result);
      
      if (result.success && result.plcs) {
        console.log('✅ Sterilization: PLCs loaded successfully:', result.plcs);
        setPLCs(result.plcs);
      } else {
        console.error('❌ Sterilization: Failed to load PLCs:', result);
        setError('خطا در بارگیری لیست اتوکلاوها');
      }
    } catch (error) {
      console.error('❌ Sterilization: Error loading PLCs:', error);
      setError('خطا در برقراری ارتباط با سرور');
    }
  };

  const loadProcesses = async () => {
    if (!selectedPLC || !selectedDate) return;

    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Sterilization: Loading processes for', selectedPLC, selectedDate);
      const response = await fetch(
        `/api/sterilization-processes?plc=${selectedPLC}&date=${selectedDate}`
      );
      const result = await response.json();
      
      console.log('📊 Sterilization: Processes response:', result);
      
      if (result.success) {
        setProcesses(result.processes || []);
      } else {
        setError(result.error || 'خطا در تشخیص فرآیند های استریل');
      }
    } catch (error) {
      console.error('❌ Sterilization: Error loading processes:', error);
      setError('خطا در برقراری ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  // Load PLCs on mount
  useEffect(() => {
    console.log('🚀 Sterilization: Component mounted, loading PLCs...');
    loadPLCs();
  }, []);

  // Debug log when plcs state changes
  useEffect(() => {
    console.log('🔄 Sterilization: PLCs state changed:', plcs);
  }, [plcs]);

  // Load processes when PLC or date changes
  useEffect(() => {
    if (selectedPLC && selectedDate) {
      console.log('🔄 Sterilization: Loading processes for', selectedPLC, selectedDate);
      loadProcesses();
    }
  }, [selectedPLC, selectedDate]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours} ساعت و ${mins} دقیقه` : `${mins} دقیقه`;
  };

  const selectedPLCConfig = plcs.find(p => p.name === selectedPLC);

  console.log('🔍 Sterilization: Current state:', {
    plcsLength: plcs.length,
    selectedPLC,
    selectedDate,
    selectedPLCConfig,
    processesLength: processes.length
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="p-4" dir="rtl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            🧪 فرآیند های استریل
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

          {/* Selection Panel */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">انتخاب اتوکلاو و تاریخ</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PLC Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  انتخاب اتوکلاو
                </label>
                <select
                  value={selectedPLC}
                  onChange={(e) => {
                    setSelectedPLC(e.target.value);
                    setSelectedDate('');
                    setProcesses([]);
                  }}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">اتوکلاو را انتخاب کنید</option>
                  {plcs?.map((plc) => (
                    <option key={plc.id} value={plc.name}>
                      {plc.displayName || plc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  انتخاب تاریخ
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={!selectedPLC}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                >
                  <option value="">تاریخ را انتخاب کنید</option>
                  {selectedPLCConfig?.availableDates?.map((date) => {
                    // Format YYYYMMDD to proper date
                    const year = date.substring(0, 4);
                    const month = date.substring(4, 6);
                    const day = date.substring(6, 8);
                    const displayDate = new Date(`${year}-${month}-${day}`).toLocaleDateString('fa-IR');
                    
                    return (
                      <option key={date} value={date}>
                        {displayDate}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 text-center">
              🔄 در حال تشخیص فرآیند های استریل...
            </div>
          )}

          {/* Results */}
          {!loading && selectedPLC && selectedDate && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">
                فرآیند های استریل تشخیص داده شده ({processes.length} فرآیند)
              </h2>

              {processes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  هیچ فرآیند استریلی در این تاریخ تشخیص داده نشد
                </div>
              ) : (
                <div className="space-y-4">
                  {processes.map((process) => (
                    <div
                      key={process.id}
                      className={`border rounded-lg p-4 ${
                        process.success 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-medium">
                          فرآیند #{process.id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          process.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {process.success ? '✅ موفق' : '⚠️ ناقص'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-600">زمان شروع:</span>
                          <div className="mt-1">{formatTime(process.startTime)}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">زمان پایان:</span>
                          <div className="mt-1">{formatTime(process.endTime)}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">مدت کل:</span>
                          <div className="mt-1">{formatDuration(process.duration)}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">مدت استریل:</span>
                          <div className="mt-1">{formatDuration(process.sterilizationDuration)}</div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">حداکثر دما:</span>
                          <div className="mt-1">{process.maxTemperature.toFixed(1)}°C</div>
                        </div>
                        
                        <div>
                          <span className="font-medium text-gray-600">حداقل دما:</span>
                          <div className="mt-1">{process.minTemperature.toFixed(1)}°C</div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-600">وضعیت:</span>
                          <div className="mt-1">
                            {process.success 
                              ? 'فرآیند استریل با موفقیت انجام شده' 
                              : 'فرآیند استریل کامل نبوده (زمان یا دمای کافی نداشته)'
                            }
                          </div>
                        </div>
                      </div>

                      {/* Process Details */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">توضیحات فرآیند:</span>
                          {` دما از ${process.minTemperature.toFixed(1)}°C شروع شده، به حداکثر ${process.maxTemperature.toFixed(1)}°C رسیده و مدت ${formatDuration(process.sterilizationDuration)} در محدوده استریل (بالای 100°C) باقی مانده است.`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
