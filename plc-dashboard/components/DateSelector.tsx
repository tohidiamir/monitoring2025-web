import { useState, useEffect } from 'react';

interface AvailableDate {
  tableName: string;
  dateString: string;
  formattedDate: string;
  persianDate: string;
  jsDate: Date;
}

interface DateSelectorProps {
  plcId: string;
  onDateSelect: (dateString: string) => void;
  selectedDate?: string;
}

export default function DateSelector({ plcId, onDateSelect, selectedDate }: DateSelectorProps) {
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plcId) {
      loadAvailableDates();
    }
  }, [plcId]);

  const loadAvailableDates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/available-dates?plcId=${plcId}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableDates(data.availableDates);
        
        // اگر تاریخی انتخاب نشده، آخرین تاریخ موجود را انتخاب کن
        if (!selectedDate && data.availableDates.length > 0) {
          onDateSelect(data.availableDates[0].dateString);
        }
      } else {
        setError(data.message || 'خطا در دریافت تاریخ‌های موجود');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
      console.error('Error loading available dates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          انتخاب تاریخ
        </label>
        <div className="bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500">
          در حال بارگذاری...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          انتخاب تاریخ
        </label>
        <div className="bg-red-50 border border-red-300 rounded-md px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (availableDates.length === 0) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          انتخاب تاریخ
        </label>
        <div className="bg-yellow-50 border border-yellow-300 rounded-md px-3 py-2 text-sm text-yellow-600">
          هیچ داده‌ای برای این اتوکلاو موجود نیست
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        انتخاب تاریخ ({availableDates.length} تاریخ موجود)
      </label>
      <select
        value={selectedDate || ''}
        onChange={(e) => onDateSelect(e.target.value)}
        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">تاریخ را انتخاب کنید</option>
        {availableDates.map((date) => (
          <option key={date.dateString} value={date.dateString}>
            {date.persianDate}
          </option>
        ))}
      </select>
    </div>
  );
}
