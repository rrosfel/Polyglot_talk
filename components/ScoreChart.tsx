import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import type { SessionRecord } from '../types';

interface ScoreChartProps {
  data: SessionRecord[];
}

const ScoreChart: React.FC<ScoreChartProps> = ({ data }) => {
  // Reverse data so oldest is left, newest is right
  const chartData = [...data].reverse().map(session => ({
    name: new Date(session.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    Overall: session.overallScore,
    Syntax: session.syntaxScore,
    Grammar: session.grammarScore,
    Pronunciation: session.pronunciationScore,
  }));

  return (
    <div className="w-full h-64 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorOverall" x1="0" y1="0" x2="1" y2="0">
              <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.8}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.4} />
          <XAxis 
            dataKey="name" 
            stroke="#64748b" 
            fontSize={11} 
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="#64748b" 
            fontSize={11} 
            tickLine={false}
            axisLine={false}
            tickCount={5}
          />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                color: '#e2e8f0',
                fontSize: '12px'
            }}
            itemStyle={{ paddingBottom: '2px' }}
            cursor={{ stroke: '#475569', strokeWidth: 1 }}
          />
          <Line 
            type="monotone" 
            dataKey="Overall" 
            stroke="url(#colorOverall)" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
          />
          <Line type="monotone" dataKey="Syntax" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 4" opacity={0.5} />
          <Line type="monotone" dataKey="Grammar" stroke="#cbd5e1" strokeWidth={1.5} dot={false} strokeDasharray="4 4" opacity={0.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ScoreChart;