'use client';

import { useState } from 'react';

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

interface PLCSelectorProps {
  plcs: PLC[];
  selectedPLC: string;
  selectedDate: string;
  selectedRegisters: string[];
  onPLCChange: (plc: string) => void;
  onDateChange: (date: string) => void;
  onRegistersChange: (registers: string[]) => void;
}

export default function PLCSelector({
  plcs,
  selectedPLC,
  selectedDate,
  selectedRegisters,
  onPLCChange,
  onDateChange,
  onRegistersChange,
}: PLCSelectorProps) {
  const selectedPLCConfig = plcs.find(p => p.name === selectedPLC);

  const handleRegisterToggle = (register: string) => {
    if (selectedRegisters.includes(register)) {
      onRegistersChange(selectedRegisters.filter(r => r !== register));
    } else {
      onRegistersChange([...selectedRegisters, register]);
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString.length === 8) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      return `${year}/${month}/${day}`;
    }
    return dateString;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">⚙️ انتخاب PLC</h2>
      
      {/* PLC Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          PLC:
        </label>
        <select
          value={selectedPLC}
          onChange={(e) => onPLCChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">انتخاب کنید...</option>
          {plcs.map((plc) => (
            <option key={plc.id} value={plc.name}>
              {plc.name} (ID: {plc.id})
            </option>
          ))}
        </select>
      </div>

      {/* Date Selection */}
      {selectedPLC && selectedPLCConfig && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 تاریخ:
          </label>
          <select
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">انتخاب تاریخ...</option>
            {selectedPLCConfig.availableDates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
          {selectedPLCConfig.availableDates.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              هیچ داده‌ای برای این PLC موجود نیست
            </p>
          )}
        </div>
      )}

      {/* Register Selection */}
      {selectedPLC && selectedPLCConfig && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📊 رجیسترها:
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                if (selectedRegisters.length === selectedPLCConfig.database_registers.length) {
                  onRegistersChange([]);
                } else {
                  onRegistersChange(selectedPLCConfig.database_registers.map(r => r.label));
                }
              }}
              className="w-full text-left p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {selectedRegisters.length === selectedPLCConfig.database_registers.length ? 
                '❌ حذف همه' : '✅ انتخاب همه'}
            </button>
            {selectedPLCConfig.database_registers.map((register) => (
              <div
                key={register.register}
                className="flex items-center space-x-2 space-x-reverse"
              >
                <input
                  type="checkbox"
                  id={register.register}
                  checked={selectedRegisters.includes(register.label)}
                  onChange={() => handleRegisterToggle(register.label)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor={register.register}
                  className="text-sm text-gray-700 cursor-pointer flex-1"
                >
                  <span className="font-medium">{register.label}</span>
                  <br />
                  <span className="text-xs text-gray-500">
                    {register.register} - {register.description}
                  </span>
                </label>
              </div>
            ))}
          </div>
          {selectedPLCConfig.database_registers.length === 0 && (
            <p className="text-sm text-gray-500">
              هیچ رجیستری تعریف نشده است
            </p>
          )}
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <h3 className="text-sm font-medium text-blue-800 mb-1">📋 اطلاعات:</h3>
        <p className="text-xs text-blue-700">
          تعداد PLCs: {plcs.length}
        </p>
        {selectedPLCConfig && (
          <>
            <p className="text-xs text-blue-700">
              تاریخ‌های موجود: {selectedPLCConfig.availableDates.length}
            </p>
            <p className="text-xs text-blue-700">
              رجیسترهای انتخاب شده: {selectedRegisters.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
