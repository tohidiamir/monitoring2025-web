'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatPersianTime } from '@/lib/timeUtils';
import { applyPressureTemperatureMultiplier, isPressureOrTemperatureRegister } from '@/lib/registerUtils';

interface Register {
  register: string;
  label: string;
  labelFa: string;
  description: string;
  descriptionFa: string;
}

interface DataChartProps {
  data: any[];
  registers: Register[];
  selectedRegisters: string[];
}

export default function DataChart({ data, registers, selectedRegisters }: DataChartProps) {
  // Generate colors for each register
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1',
    '#d084d0', '#87d068', '#ffb347', '#ff6b6b', '#4ecdc4',
  ];

  // Process data for chart
  const chartData = useMemo(() => {
    return data.map((item) => {
      // Convert timestamp to Iran time
      const timestamp = new Date(item.Timestamp);
      
      // Create a new item with processed values
      const processedItem = {
        ...item,
        time: timestamp.toLocaleTimeString('fa-IR', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Utc'
        }),
        fullTime: timestamp.toLocaleString('fa-IR', {
          timeZone: 'Utc'
        }),
      };

      // Apply 0.1 multiplier to pressure and temperature values
      registers.forEach(register => {
        if (isPressureOrTemperatureRegister(register.register, register.label, register.labelFa)) {
          const originalValue = item[register.label];
          if (originalValue !== null && originalValue !== undefined && !isNaN(Number(originalValue))) {
            // Keep the result as a number with proper precision
            const multipliedValue = Number(originalValue) * 0.1;
            processedItem[register.label] = multipliedValue;
          }
        }
      });

      return processedItem;
    });
  }, [data, registers]);

  // Get registers to display
  const displayRegisters = useMemo(() => {
    if (selectedRegisters.length > 0) {
      return registers.filter(reg => selectedRegisters.includes(reg.label));
    }
    return registers;
  }, [registers, selectedRegisters]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        📭 داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Chart Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>📊 تعداد نقاط داده: {chartData.length.toLocaleString('fa-IR')}</span>
          <span>📈 تعداد رجیسترها: {displayRegisters.length.toLocaleString('fa-IR')}</span>
          <span>
            🕒 بازه زمانی: {chartData[0]?.time} - {chartData[chartData.length - 1]?.time}
          </span>
        </div>
        {displayRegisters.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            رجیسترهای نمایش: {displayRegisters.map(r => r.labelFa || r.label).join('، ')}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const numValue = Number(value);
                if (isNaN(numValue)) return value;
                
                // Check if any of the displayed registers are pressure/temperature
                const hasPressureTemp = displayRegisters.some(r => 
                  isPressureOrTemperatureRegister(r.register, r.label, r.labelFa)
                );
                
                if (hasPressureTemp) {
                  return numValue.toLocaleString('fa-IR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  });
                }
                
                return Math.round(numValue).toLocaleString('fa-IR');
              }}
            />
            <Tooltip
              labelFormatter={(value, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fullTime || value;
              }}
              formatter={(value: any, name: string) => {
                // Extract register code from name (format: "Label (D500)")
                const registerMatch = name.match(/\(([^)]+)\)$/);
                const registerCode = registerMatch ? registerMatch[1] : '';
                
                // پیدا کردن رجیستر مربوطه برای نمایش نام فارسی
                const register = registers.find(r => 
                  name.includes(r.label) || r.register === registerCode
                );
                const displayName = register ? (register.labelFa || register.label) : name;
                
                // Format the value properly
                const numValue = Number(value);
                let formattedValue;
                
                if (isNaN(numValue)) {
                  formattedValue = value;
                } else if (register && isPressureOrTemperatureRegister(register.register, register.label, register.labelFa)) {
                  // Format pressure and temperature with 1 decimal place
                  formattedValue = numValue.toLocaleString('fa-IR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                  });
                } else {
                  // Format time and other values as integers
                  formattedValue = Math.round(numValue).toLocaleString('fa-IR');
                }
                
                return [
                  formattedValue,
                  displayName
                ];
              }}
              contentStyle={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
              }}
            />
            <Legend />
            {displayRegisters.map((register, index) => (
              <Line
                key={register.label}
                type="monotone"
                dataKey={register.label}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 1 }}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Register Legend */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {displayRegisters.filter(r => !['D525', 'D526', 'D527'].includes(r.register)).map((register, index) => (
          <div
            key={register.label}
            className="flex items-center p-2 bg-gray-50 rounded text-sm"
          >
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: colors[index % colors.length] }}
            ></div>
            <div>
              <div className="font-medium">{register.labelFa}</div>
              <div className="text-xs text-gray-500">
                {register.register} - {register.descriptionFa || register.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Light Status Display */}
      {displayRegisters.some(r => ['D525', 'D526', 'D527'].includes(r.register)) && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-3">🚦 وضعیت چراغ‌ها</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayRegisters
              .filter(r => ['D525', 'D526', 'D527'].includes(r.register))
              .map((register) => {
                // Get the latest value for this light
                const latestValue = chartData[chartData.length - 1]?.[register.label];
                const isActive = latestValue === 'فعال';
                
                let lightConfig = { color: '', bgColor: '', name: '', icon: '●' };
                
                if (register.register === 'D525') { // GREEN
                  lightConfig = {
                    color: isActive ? 'text-white' : 'text-gray-500',
                    bgColor: isActive ? 'bg-green-500' : 'bg-gray-300',
                    name: 'چراغ سبز',
                    icon: '●'
                  };
                } else if (register.register === 'D526') { // RED
                  lightConfig = {
                    color: isActive ? 'text-white' : 'text-gray-500',
                    bgColor: isActive ? 'bg-red-500' : 'bg-gray-300',
                    name: 'چراغ قرمز',
                    icon: '●'
                  };
                } else if (register.register === 'D527') { // YELLOW
                  lightConfig = {
                    color: isActive ? 'text-white' : 'text-gray-500',
                    bgColor: isActive ? 'bg-yellow-500' : 'bg-gray-300',
                    name: 'چراغ زرد',
                    icon: '●'
                  };
                }

                return (
                  <div key={register.label} className="bg-white border rounded p-4">
                    <div className="flex items-center gap-3">
                      <span className={`${lightConfig.bgColor} ${lightConfig.color} rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg`}>
                        {lightConfig.icon}
                      </span>
                      <div>
                        <div className="font-medium">{lightConfig.name}</div>
                        <div className={`text-sm ${isActive ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                          {latestValue || 'نامشخص'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Data Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayRegisters.filter(r => !['D525', 'D526', 'D527'].includes(r.register)).map((register) => {
          const values = chartData
            .map(item => Number(item[register.label]))
            .filter(val => !isNaN(val));
          
          if (values.length === 0) return null;

          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;

          // Check if this is a pressure or temperature register for proper formatting
          const isPressureOrTemp = isPressureOrTemperatureRegister(
            register.register, 
            register.label, 
            register.labelFa
          );

          const formatValue = (val: number) => {
            if (isPressureOrTemp) {
              return val.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
            }
            // For time and other values, show as integer
            return Math.round(val).toLocaleString('fa-IR');
          };

          return (
            <div key={register.label} className="bg-white border rounded p-3">
              <h4 className="font-medium text-sm mb-2">{register.labelFa}</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div>حداقل: {formatValue(min)}</div>
                <div>حداکثر: {formatValue(max)}</div>
                <div>میانگین: {formatValue(avg)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
