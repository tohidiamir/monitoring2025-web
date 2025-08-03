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

interface Register {
  register: string;
  label: string;
  description: string;
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
      const timestamp = new Date(item.Timestamp);
      return {
        ...item,
        time: timestamp.toLocaleTimeString('fa-IR', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }),
        fullTime: timestamp.toLocaleString('fa-IR'),
      };
    });
  }, [data]);

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
          <span>📈 تعداد رجیسترها: {displayRegisters.length}</span>
          <span>
            🕒 بازه زمانی: {chartData[0]?.time} - {chartData[chartData.length - 1]?.time}
          </span>
        </div>
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
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              labelFormatter={(value, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fullTime || value;
              }}
              formatter={(value: any, name: string) => [
                `${Number(value).toLocaleString('fa-IR')}`,
                name
              ]}
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
                name={`${register.label} (${register.register})`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Register Legend */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {displayRegisters.map((register, index) => (
          <div
            key={register.label}
            className="flex items-center p-2 bg-gray-50 rounded text-sm"
          >
            <div
              className="w-4 h-4 rounded mr-2"
              style={{ backgroundColor: colors[index % colors.length] }}
            ></div>
            <div>
              <div className="font-medium">{register.label}</div>
              <div className="text-xs text-gray-500">
                {register.register} - {register.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Data Summary */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayRegisters.map((register) => {
          const values = chartData
            .map(item => Number(item[register.label]))
            .filter(val => !isNaN(val));
          
          if (values.length === 0) return null;

          const min = Math.min(...values);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;

          return (
            <div key={register.label} className="bg-white border rounded p-3">
              <h4 className="font-medium text-sm mb-2">{register.label}</h4>
              <div className="space-y-1 text-xs text-gray-600">
                <div>حداقل: {min.toLocaleString('fa-IR')}</div>
                <div>حداکثر: {max.toLocaleString('fa-IR')}</div>
                <div>میانگین: {avg.toFixed(2).toLocaleString('fa-IR')}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
