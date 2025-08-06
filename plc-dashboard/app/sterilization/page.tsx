'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import DataChart from '@/components/DataChart';

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
  highTempDuration: number;
  qualityScore: number;
  success: boolean;
}

export default function SterilizationPage() {
  const [plcs, setPLCs] = useState<PLC[]>([]);
  const [selectedPLC, setSelectedPLC] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [processes, setProcesses] = useState<SterilizationProcess[]>([]);
  const [processChartData, setProcessChartData] = useState<{[key: number]: any[]}>({});
  const [chartLoading, setChartLoading] = useState<{[key: number]: boolean}>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedProcessForChart, setSelectedProcessForChart] = useState<SterilizationProcess | null>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState<boolean>(false);

  const loadPLCs = async () => {
    try {
      const response = await fetch('/api/plcs');
      const result = await response.json();
      
      if (result.success && result.plcs) {
        setPLCs(result.plcs);
      } else {
        setError('خطا در بارگیری لیست اتوکلاوها');
      }
    } catch (error) {
      console.error('Error loading PLCs:', error);
      setError('خطا در برقراری ارتباط با سرور');
    }
  };

  const loadProcesses = async () => {
    if (!selectedPLC || !selectedDate) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `/api/sterilization-processes?plc=${selectedPLC}&date=${selectedDate}`
      );
      const result = await response.json();
      
      if (result.success) {
        setProcesses(result.processes || []);
      } else {
        setError(result.error || 'خطا در تشخیص فرآیند های استریل');
      }
    } catch (error) {
      console.error('Error loading processes:', error);
      setError('خطا در برقراری ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  // Load PLCs on mount
  useEffect(() => {
    loadPLCs();
  }, []);

  // Load processes when PLC or date changes
  useEffect(() => {
    if (selectedPLC && selectedDate) {
      loadProcesses();
    }
  }, [selectedPLC, selectedDate]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours} ساعت و ${mins} دقیقه` : `${mins} دقیقه`;
  };

  const loadProcessChart = async (process: SterilizationProcess) => {
    if (!selectedPLC) return;

    setChartLoading(prev => ({ ...prev, [process.id]: true }));
    
    try {
      const startTime = new Date(process.startTime);
      const endTime = new Date(process.endTime);
      
      // Add some padding - 30 minutes before and after
      const paddedStartTime = new Date(startTime.getTime() - 30 * 60 * 1000);
      const paddedEndTime = new Date(endTime.getTime() + 30 * 60 * 1000);
      
      const startHour = paddedStartTime.getHours();
      const endHour = Math.min(paddedEndTime.getHours() + 1, 23);
      
      const params = new URLSearchParams({
        plc: selectedPLC,
        date: selectedDate,
        startHour: startHour.toString(),
        endHour: endHour.toString(),
        registers: 'Temputare_main,Temputare_1,Temputare_2,Temputare_3,Temputare_4'
      });

      const response = await fetch(`/api/data?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Filter data to process timeframe with padding
        const filteredData = result.data.filter((row: any) => {
          const rowTime = new Date(row.Timestamp || row.timestamp);
          return rowTime >= paddedStartTime && rowTime <= paddedEndTime;
        });
        
        setProcessChartData(prev => ({ ...prev, [process.id]: filteredData }));
      }
    } catch (error) {
      console.error('Error loading process chart:', error);
    } finally {
      setChartLoading(prev => ({ ...prev, [process.id]: false }));
    }
  };

  const openChartModal = (process: SterilizationProcess) => {
    setSelectedProcessForChart(process);
    setIsChartModalOpen(true);
    if (!processChartData[process.id]) {
      loadProcessChart(process);
    }
  };

  const closeChartModal = () => {
    setIsChartModalOpen(false);
    setSelectedProcessForChart(null);
  };

  const selectedPLCConfig = plcs.find(p => p.name === selectedPLC);

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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openChartModal(process)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                          >
                            📊 نمایش نمودار
                          </button>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            process.success 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {process.success ? '✅ موفق' : '⚠️ ناقص'}
                          </span>
                        </div>
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
                          {` دما از ${process.minTemperature.toFixed(1)}°C شروع شده، به حداکثر ${process.maxTemperature.toFixed(1)}°C رسیده.`}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">مدت زمان استریل:</span>
                          {` ${formatDuration(process.sterilizationDuration)} بالای 120°C و ${formatDuration(process.highTempDuration || 0)} بالای 121°C باقی مانده است.`}
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

      {/* Chart Modal */}
      {isChartModalOpen && selectedProcessForChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  نمودار فرآیند استریل #{selectedProcessForChart.id}
                </h2>
                <button
                  onClick={closeChartModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                از {formatTime(selectedProcessForChart.startTime)} تا {formatTime(selectedProcessForChart.endTime)}
                {' | '}
                حداکثر دما: {selectedProcessForChart.maxTemperature.toFixed(1)}°C
                {' | '}
                مدت استریل: {formatDuration(selectedProcessForChart.sterilizationDuration)}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              {chartLoading[selectedProcessForChart.id] ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <span>در حال بارگذاری نمودار...</span>
                  </div>
                </div>
              ) : processChartData[selectedProcessForChart.id] && processChartData[selectedProcessForChart.id].length > 0 ? (
                <div>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700">
                      📊 نمودار داده‌های {processChartData[selectedProcessForChart.id].length.toLocaleString('fa-IR')} نقطه
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      🕒 شامل 30 دقیقه قبل و بعد از فرآیند برای نمایش بهتر روند
                    </div>
                  </div>
                  <DataChart 
                    data={processChartData[selectedProcessForChart.id]}
                    registers={[
                      { register: 'Temputare_main', label: 'Temputare_main', labelFa: 'دمای اصلی', description: 'Main Temperature', descriptionFa: 'دمای اصلی' },
                      { register: 'Temputare_1', label: 'Temputare_1', labelFa: 'دمای 1', description: 'Temperature 1', descriptionFa: 'دمای 1' },
                      { register: 'Temputare_2', label: 'Temputare_2', labelFa: 'دمای 2', description: 'Temperature 2', descriptionFa: 'دمای 2' },
                      { register: 'Temputare_3', label: 'Temputare_3', labelFa: 'دمای 3', description: 'Temperature 3', descriptionFa: 'دمای 3' },
                      { register: 'Temputare_4', label: 'Temputare_4', labelFa: 'دمای 4', description: 'Temperature 4', descriptionFa: 'دمای 4' }
                    ]}
                    selectedRegisters={['دمای اصلی']}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <div>داده‌ای برای این فرآیند یافت نشد</div>
                    <button 
                      onClick={() => loadProcessChart(selectedProcessForChart)}
                      className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      تلاش مجدد
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
