import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieChartIcon, QrCode } from 'lucide-react';
import ChartTooltip from '../../common/ChartTooltip';

export default function DashboardCharts({ analyticsData, categoryStats, isDarkMode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-8 mt-4">
      <div className="w-full">
        <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Vistas</h4>
        <div className="h-56 w-full">
          {analyticsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDarkMode ? "#F8FAFC" : "#0F172A"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isDarkMode ? "#F8FAFC" : "#0F172A"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#E2E8F0"} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} tickMargin={10} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit="vistas" isDarkMode={isDarkMode} />} cursor={{ stroke: isDarkMode ? '#64748B' : '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="views" stroke={isDarkMode ? "#F8FAFC" : "#0F172A"} strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" activeDot={{ r: 6, fill: isDarkMode ? "#F8FAFC" : "#0F172A", stroke: isDarkMode ? '#1E293B' : '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>
          )}
        </div>
      </div>

      <div className="w-full">
        <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><QrCode className="w-4 h-4"/> Contactos (QR)</h4>
        <div className="h-56 w-full">
          {analyticsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84CC16" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#84CC16" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#334155" : "#E2E8F0"} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} tickMargin={10} minTickGap={20} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 11, fontWeight: 500 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip unit="clicks" isDarkMode={isDarkMode} />} cursor={{ stroke: isDarkMode ? '#64748B' : '#94A3B8', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="clicks" stroke="#84CC16" strokeWidth={3} fillOpacity={1} fill="url(#colorClicks)" activeDot={{ r: 6, fill: '#84CC16', stroke: isDarkMode ? '#1E293B' : '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>
          )}
        </div>
      </div>

      <div className="w-full">
        <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><PieChartIcon className="w-4 h-4"/> Categorías</h4>
        <div className="h-56 w-full">
          {categoryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryStats} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                  {categoryStats.map((entry, index) => {
                    const COLORS = ['#84CC16', isDarkMode ? '#F8FAFC' : '#0F172A', '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981'];
                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                  })}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className={`text-center px-3 py-2 rounded-xl shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-slate-900 border-slate-700 text-white'}`}>
                        <div className={`text-[10px] font-medium mb-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-300'}`}>{payload[0].name}</div>
                        <div className="text-[12px] font-bold">{payload[0].value} {payload[0].value === 1 ? 'anuncio' : 'anuncios'}</div>
                      </div>
                    );
                  }
                  return null;
                }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[13px] font-medium">No hay datos...</div>
          )}
        </div>
      </div>
    </div>
  );
}
