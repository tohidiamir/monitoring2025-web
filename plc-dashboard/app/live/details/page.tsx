'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import DataChart from '@/components/DataChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Activity } from '@/components/ui/icons';
import { formatPersianTime } from '@/lib/timeUtils';
import { isPressureOrTemperatureRegister, isMainTemperaturePressureRegister } from '@/lib/registerUtils';

interface RegisterData {
  register: string;
  label: string;
  description: string;
  labelFa: string;
  descriptionFa: string;
  value: any;
  unit: string;
  isLight?: boolean;
}

interface PlcDetailData {
  plc: {
    id: number;
    name: string;
    displayName: string;
  };
  status: 'success' | 'warning' | 'offline' | 'no_data' | 'empty_table' | 'error';
  message: string;
  data: RegisterData[] | null;
  lastUpdate: string | null;
  secondsAgo?: number;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
  error?: string;
}

interface HistoricalData {
  Timestamp: string;
  [key: string]: any;
}

export default function PLCDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plcId = searchParams.get('id');
  const plcName = searchParams.get('name');
  
  const [plcData, setPlcData] = useState<PlcDetailData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [registers, setRegisters] = useState<RegisterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch current PLC data
  const fetchLatestData = async () => {
    try {
      const response = await fetch('/api/latest-data');
      const result = await response.json();
      
      if (result.success && result.data) {
        const targetPlc = result.data.find((plc: any) => plc.plc.id.toString() === plcId);
        
        if (targetPlc) {
          setPlcData(targetPlc);
          if (targetPlc.data) {
            setRegisters(targetPlc.data);
          }
        } else {
          setError(`اتوکلاو با شناسه ${plcId} یافت نشد`);
        }
      } else {
        setError('خطا در دریافت اطلاعات از API');
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching latest data:', err);
      setError('خطا در اتصال به سرور');
    } finally {
      setLoading(false);
    }
  };

  // Fetch historical data for chart (last 2 hours)
  const fetchHistoricalData = async () => {
    if (!plcName) {
      return;
    }
    
    try {
      setChartLoading(true);
      
      // Get current time and 2 hours ago
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      
      // Format date for API (YYYY-MM-DD) - use current date since data is within same day
      const date = now.toISOString().split('T')[0];
      
      // Get hours for API (0-23)
      const currentHour = now.getHours();
      const startHour = twoHoursAgo.getHours();
      
      const params = new URLSearchParams({
        plc: plcName,
        date: date,
        startHour: startHour.toString(),
        endHour: currentHour.toString()
      });

      const response = await fetch(`/api/data?${params.toString()}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setHistoricalData(result.data);
      } else {
        setHistoricalData([]);
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setHistoricalData([]);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    if (plcId) {
      fetchLatestData();
      fetchHistoricalData();
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        fetchLatestData();
      }, 5000);

      // Refresh historical data every 30 seconds
      const chartInterval = setInterval(() => {
        fetchHistoricalData();
      }, 30000);

      return () => {
        clearInterval(interval);
        clearInterval(chartInterval);
      };
    } else {
      setLoading(false);
    }
  }, [plcId, plcName]);

  const formatValue = (value: any, unit: string, register: RegisterData) => {
    if (value === null || value === undefined || value === 'N/A') {
      return 'N/A';
    }

    // Handle light registers
    if (register?.isLight || ['D525', 'D526', 'D527'].includes(register.register)) {
      const isActive = value === 'فعال' || value === 1 || value === '1';
      
      let lightIcon = '●';
      let lightStyle = '';
      let bgColor = '';
      
      if (register.register === 'D525') { // GREEN
        lightIcon = '●';
        if (isActive) {
          lightStyle = 'text-white';
          bgColor = 'bg-green-500';
        } else {
          lightStyle = 'text-gray-500';
          bgColor = 'bg-gray-300';
        }
      } else if (register.register === 'D526') { // RED
        lightIcon = '●';
        if (isActive) {
          lightStyle = 'text-white';
          bgColor = 'bg-red-500';
        } else {
          lightStyle = 'text-gray-500';
          bgColor = 'bg-gray-300';
        }
      } else if (register.register === 'D527') { // YELLOW
        lightIcon = '●';
        if (isActive) {
          lightStyle = 'text-white';
          bgColor = 'bg-yellow-500';
        } else {
          lightStyle = 'text-gray-500';
          bgColor = 'bg-gray-300';
        }
      }
      
      return (
        <div className="flex items-center gap-3">
          <span className={`${bgColor} ${lightStyle} rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-lg`}>
            {lightIcon}
          </span>
          <span className={`font-medium text-lg ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
            {isActive ? 'فعال' : 'غیرفعال'}
          </span>
        </div>
      );
    }
    
    // Format numeric values
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      if (unit === 'بار' || unit === '°C') {
        // For pressure and temperature, format with 1 decimal place
        return `${numValue.toFixed(1)} ${unit}`;
      } else {
        // For time and other values, show as integer without decimals
        return `${Math.round(numValue)} ${unit}`;
      }
    }
    
    return `${value} ${unit}`;
  };

  const getStatusBadge = (status: string, quality?: string, secondsAgo?: number) => {
    const baseClasses = "text-xs font-medium flex items-center gap-1";
    
    switch (status) {
      case 'success':
        return <Badge className={`${baseClasses} bg-green-100 text-green-800`}>
          <CheckCircle className="w-3 h-3" />
          آنلاین
        </Badge>;
      case 'warning':
        return <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
          <AlertCircle className="w-3 h-3" />
          هشدار
        </Badge>;
      case 'offline':
        return <Badge className={`${baseClasses} bg-red-100 text-red-800`}>
          <AlertCircle className="w-3 h-3" />
          آفلاین
        </Badge>;
      default:
        return <Badge className={`${baseClasses} bg-gray-100 text-gray-800`}>
          <AlertCircle className="w-3 h-3" />
          نامشخص
        </Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="mr-2 text-lg">در حال بارگذاری...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!plcData && !loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-4">اتوکلاو مورد نظر یافت نشد</div>
            <div className="text-sm text-gray-400 mb-4">
              شناسه اتوکلاو: {plcId || 'نامشخص'} | نام: {plcName || 'نامشخص'}
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center gap-2 mx-auto"
            >
              ← بازگشت به صفحه اصلی
            </Button>
            {error && (
              <div className="mt-4 text-red-500 text-sm">{error}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                ← بازگشت
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Activity className="w-6 h-6 text-blue-500" />
                  {plcData?.plc.displayName || `اتوکلاو ${plcId}`}
                </h1>
                <p className="text-gray-600 text-sm">جزئیات کامل اتوکلاو</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {plcData && getStatusBadge(plcData.status, plcData.connectionQuality, plcData.secondsAgo)}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  fetchLatestData();
                  fetchHistoricalData();
                }}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </Button>
            </div>
          </div>
          
          {/* Last Update Info */}
          {plcData.lastUpdate && (
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium">آخرین بروزرسانی:</span>
                <span className="font-bold text-gray-800">{plcData.lastUpdate}</span>
                {plcData.secondsAgo && (
                  <span className="text-xs text-gray-500">
                    ({plcData.secondsAgo < 60 
                      ? `${plcData.secondsAgo} ثانیه پیش`
                      : plcData.secondsAgo < 3600
                      ? `${Math.floor(plcData.secondsAgo / 60)} دقیقه پیش`
                      : `${Math.floor(plcData.secondsAgo / 3600)} ساعت پیش`
                    })
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {plcData.status === 'success' && plcData.data ? (
          <div className="space-y-6">
            {/* Current Data Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  وضعیت فعلی اتوکلاو
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {plcData.data.map((register) => (
                    <div
                      key={register.register}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        ['D525', 'D526', 'D527'].includes(register.register)
                          ? 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
                          : isPressureOrTemperatureRegister(register.register, register.label, register.labelFa)
                          ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'
                          : 'bg-gradient-to-br from-gray-50 to-blue-50 border-gray-200'
                      }`}
                    >
                      <div className="space-y-2">
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">
                            {register.labelFa || register.label}
                          </div>
                          <div className="text-xs text-gray-600">
                            {register.register} - {register.descriptionFa || register.description}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatValue(register.value, register.unit, register)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Historical Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  نمودار دو ساعت گذشته
                  {historicalData.length > 0 && (
                    <Badge variant="outline" className="mr-2">
                      {historicalData.length.toLocaleString('fa-IR')} نقطه داده
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500 ml-2" />
                    <span>در حال بارگذاری نمودار...</span>
                  </div>
                ) : historicalData.length > 0 ? (
                  <div>
                    {/* Chart Info */}
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-700">
                        📊 نمودار داده‌های {historicalData.length.toLocaleString('fa-IR')} نقطه از دو ساعت گذشته
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        🕒 از {historicalData[0]?.Timestamp ? new Date(historicalData[0].Timestamp).toLocaleString('fa-IR') : 'نامشخص'} 
                        تا {historicalData[historicalData.length - 1]?.Timestamp ? new Date(historicalData[historicalData.length - 1].Timestamp).toLocaleString('fa-IR') : 'نامشخص'}
                      </div>
                    </div>
                    <DataChart 
                      data={historicalData}
                      registers={registers}
                      selectedRegisters={['فشار', 'دمای اصلی']}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-500">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <div>داده‌ای برای دو ساعت گذشته یافت نشد</div>
                      <div className="text-sm text-gray-400 mt-1">
                        PLC: {plcName} | ممکن است سیستم در این بازه زمانی آفلاین بوده باشد
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-4"
                        onClick={() => {
                          fetchHistoricalData();
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        تلاش مجدد
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <div className="text-gray-500 text-lg">{plcData.message}</div>
              {plcData.error && (
                <div className="text-sm text-red-500 mt-2">{plcData.error}</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
