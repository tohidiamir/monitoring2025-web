'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from '@/components/ui/icons';

interface RegisterData {
  register: string;
  label: string;
  description: string;
  value: any;
  unit: string;
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

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLatestData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const formatPersianTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

  const formatValue = (value: any, unit: string) => {
    if (value === null || value === undefined || value === 'N/A') {
      return 'N/A';
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
            {autoRefresh ? 'خودکار' : 'دستی'}
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
          آخرین بروزرسانی: {formatPersianTime(lastRefresh.toISOString())}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {latestData.map((plcData) => (
          <Card key={plcData.plc.id} className="h-fit">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">{plcData.plc.displayName}</CardTitle>
                {getStatusBadge(plcData.status, plcData.connectionQuality, plcData.secondsAgo)}
              </div>
              {plcData.lastUpdate && (
                <div className="text-sm text-gray-600">
                  آخرین داده: {formatPersianTime(plcData.lastUpdate)}
                  {plcData.secondsAgo && (
                    <span className="text-xs text-gray-500 mr-2">
                      ({plcData.secondsAgo} ثانیه پیش)
                    </span>
                  )}
                </div>
              )}
              {plcData.connectionQuality && (
                <div className="text-xs">
                  کیفیت اتصال: {
                    plcData.connectionQuality === 'excellent' ? '🟢 عالی' :
                    plcData.connectionQuality === 'good' ? '🟡 خوب' :
                    plcData.connectionQuality === 'poor' ? '🟠 ضعیف' : '🔴 قطع'
                  }
                </div>
              )}
            </CardHeader>
            <CardContent>
              {plcData.status === 'success' && plcData.data ? (
                <div className="space-y-3">
                  {plcData.data.map((register) => (
                    <div key={register.register} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{register.label}</div>
                        <div className="text-sm text-gray-600">{register.description}</div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-lg">
                          {formatValue(register.value, register.unit)}
                        </div>
                        <div className="text-xs text-gray-500">{register.register}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {plcData.message}
                  {plcData.error && (
                    <div className="text-sm text-red-500 mt-2">{plcData.error}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {autoRefresh && (
        <div className="fixed bottom-4 left-4">
          <Badge variant="outline" className="bg-white">
            <Clock className="w-3 h-3 mr-1" />
            بروزرسانی خودکار فعال
          </Badge>
        </div>
      )}
      </div>
    </div>
  );
}
