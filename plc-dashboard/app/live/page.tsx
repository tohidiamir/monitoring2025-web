'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp } from '@/components/ui/icons';
import { formatPersianTime, formatRelativeTime, formatCurrentPersianTime } from '@/lib/timeUtils';

interface RegisterData {
  register: string;
  label: string;
  description: string;
  value: any;
  unit: string;
  isLight?: boolean;
}

interface PlcLatestData {
  plc: {
    id: number;
    name: string;
    displayName: string;
  };
  status: 'success' | 'warning' | 'offline' | 'no_data' | 'empty_table' | 'error';
  message: string;
  data: RegisterData[] | null;
  lastUpdate: string | null;
  tableName?: string;
  error?: string;
  secondsAgo?: number;
  isOnline?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
}

interface ApiResponse {
  success: boolean;
  data: PlcLatestData[];
  timestamp: string;
  error?: string;
  message?: string;
}

export default function LiveDataPage() {
  const [latestData, setLatestData] = useState<PlcLatestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const fetchLatestData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/latest-data');
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        setLatestData(result.data);
        setError(null);
        setLastRefresh(new Date());
      } else {
        setError(result.message || 'خطا در دریافت اطلاعات');
      }
    } catch (err) {
      setError('خطا در اتصال به سرور');
      console.error('Error fetching latest data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestData();
  }, []);

  // Auto refresh every 2 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLatestData, 2000); // 2 seconds
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const toggleExpanded = (plcId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(plcId)) {
      newExpanded.delete(plcId);
    } else {
      newExpanded.add(plcId);
    }
    setExpandedCards(newExpanded);
  };

  const getMainRegisters = (data: RegisterData[]) => {
    // اطلاعات اصلی: فشار، دمای اصلی، زمان اصلی، زمان اجرا، ثانیه اجرا، چراغ‌ها
    const mainRegisterNames = ['D500', 'D502', 'D520', 'D521', 'D522', 'D525', 'D526', 'D527'];
    return data.filter(register => mainRegisterNames.includes(register.register));
  };

  const getSecondaryRegisters = (data: RegisterData[]) => {
    // بقیه اطلاعات (غیر از اطلاعات اصلی)
    const mainRegisterNames = ['D500', 'D502', 'D520', 'D521', 'D522', 'D525', 'D526', 'D527'];
    return data.filter(register => !mainRegisterNames.includes(register.register));
  };

  const getStatusBadge = (status: string, connectionQuality?: string, secondsAgo?: number) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />متصل</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />اتصال ضعیف</Badge>;
      case 'offline':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />قطع شده</Badge>;
      case 'no_data':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />بدون داده</Badge>;
      case 'empty_table':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />جدول خالی</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />خطا</Badge>;
      default:
        return <Badge variant="outline">نامشخص</Badge>;
    }
  };

  const formatValue = (value: any, unit: string, register: RegisterData) => {
    if (value === null || value === undefined || value === 'N/A') {
      return 'N/A';
    }
    
    // Special formatting for lights
    if (register.isLight) {
      const isActive = value === 'فعال';
      let lightStyle = '';
      let lightIcon = '';
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
        <div className="flex items-center gap-2">
          <span className={`${bgColor} ${lightStyle} rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm`}>
            {lightIcon}
          </span>
          <span className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
            {value}
          </span>
        </div>
      );
    }
    
    return `${value} ${unit}`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="container mx-auto p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">نمایش زنده اطلاعات اتوکلاوها</h1>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            {autoRefresh ? 'خودکار (2 ثانیه)' : 'دستی'}
          </Button>
          <Button 
            onClick={fetchLatestData} 
            disabled={loading}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            بروزرسانی
          </Button>
        </div>
      </div>

      {lastRefresh && (
        <div className="text-sm text-gray-600 mb-4">
          آخرین بروزرسانی: {formatCurrentPersianTime()}
        </div>
      )}

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {latestData.map((plcData) => {
          const isExpanded = expandedCards.has(plcData.plc.id);
          const mainRegisters = plcData.data ? getMainRegisters(plcData.data) : [];
          const secondaryRegisters = plcData.data ? getSecondaryRegisters(plcData.data) : [];
          
          return (
            <Card key={plcData.plc.id} className="h-fit shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    {plcData.plc.displayName}
                  </CardTitle>
                  {getStatusBadge(plcData.status, plcData.connectionQuality, plcData.secondsAgo)}
                </div>
                {plcData.lastUpdate && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded-md border-l-4 border-blue-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">آخرین داده:</span>
                    </div>
                    <div className="mt-1 font-mono text-gray-800">
                      {formatPersianTime(plcData.lastUpdate)}
                    </div>
                    {plcData.secondsAgo && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        {formatRelativeTime(plcData.lastUpdate)}
                      </div>
                    )}
                  </div>
                )}
                {plcData.connectionQuality && (
                  <div className="text-xs bg-white p-2 rounded-md border">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">کیفیت اتصال:</span>
                      <div className="flex items-center gap-1">
                        {plcData.connectionQuality === 'excellent' && (
                          <>
                            <div className="flex gap-1">
                              <div className="w-2 h-4 bg-green-500 rounded"></div>
                              <div className="w-2 h-4 bg-green-500 rounded"></div>
                              <div className="w-2 h-4 bg-green-500 rounded"></div>
                            </div>
                            <span className="text-green-600 font-medium mr-1">عالی</span>
                          </>
                        )}
                        {plcData.connectionQuality === 'good' && (
                          <>
                            <div className="flex gap-1">
                              <div className="w-2 h-4 bg-yellow-500 rounded"></div>
                              <div className="w-2 h-4 bg-yellow-500 rounded"></div>
                              <div className="w-2 h-4 bg-gray-300 rounded"></div>
                            </div>
                            <span className="text-yellow-600 font-medium mr-1">خوب</span>
                          </>
                        )}
                        {plcData.connectionQuality === 'poor' && (
                          <>
                            <div className="flex gap-1">
                              <div className="w-2 h-4 bg-orange-500 rounded"></div>
                              <div className="w-2 h-4 bg-gray-300 rounded"></div>
                              <div className="w-2 h-4 bg-gray-300 rounded"></div>
                            </div>
                            <span className="text-orange-600 font-medium mr-1">ضعیف</span>
                          </>
                        )}
                        {plcData.connectionQuality === 'offline' && (
                          <>
                            <div className="flex gap-1">
                              <div className="w-2 h-4 bg-red-500 rounded"></div>
                              <div className="w-2 h-4 bg-gray-300 rounded"></div>
                              <div className="w-2 h-4 bg-gray-300 rounded"></div>
                            </div>
                            <span className="text-red-600 font-medium mr-1">قطع</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {plcData.status === 'success' && plcData.data ? (
                  <div className="space-y-2">
                    {/* اطلاعات اصلی - همیشه نمایش داده می‌شود */}
                    <div className="space-y-2">
                      {mainRegisters.map((register) => (
                        <div key={register.register} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                          <div>
                            <div className="font-medium text-sm">{register.label}</div>
                            <div className="text-xs text-gray-600">{register.description}</div>
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-sm">
                              {formatValue(register.value, register.unit, register)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* دکمه نمایش اطلاعات تکمیلی */}
                    {secondaryRegisters.length > 0 && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpanded(plcData.plc.id)}
                          className="w-full text-xs"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3 mr-1" />
                              مخفی کردن جزئیات
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3 mr-1" />
                              نمایش جزئیات بیشتر ({secondaryRegisters.length} مورد)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* اطلاعات تکمیلی - فقط در صورت باز بودن نمایش داده می‌شود */}
                    {isExpanded && secondaryRegisters.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="text-xs text-gray-600 font-medium">اطلاعات تکمیلی:</div>
                        {secondaryRegisters.map((register) => (
                          <div key={register.register} className="flex justify-between items-center p-2 bg-blue-50 rounded-md">
                            <div>
                              <div className="font-medium text-sm">{register.label}</div>
                              <div className="text-xs text-gray-600">{register.description}</div>
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-sm">
                                {formatValue(register.value, register.unit, register)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    {plcData.message}
                    {plcData.error && (
                      <div className="text-sm text-red-500 mt-2">{plcData.error}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {autoRefresh && (
        <div className="fixed bottom-4 left-4">
          <Badge variant="outline" className="bg-white">
            <Clock className="w-3 h-3 mr-1" />
            بروزرسانی خودکار فعال (هر 2 ثانیه)
          </Badge>
        </div>
      )}
      </div>
    </div>
  );
}
