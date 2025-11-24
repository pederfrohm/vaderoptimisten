'use client';

import React, { useState } from 'react';
import { Search, Sun, Cloud, CloudRain, Wind, ArrowRight, Thermometer } from 'lucide-react';

export default function WeatherOptimist() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Kunde inte hämta väder');

      const sorted = data.results.sort((a, b) => b.score - a.score);
      setResults(sorted);
    } catch (err) {
      setError('Hittade ingen data för den staden. Försök igen!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-4 font-sans">
      <div className="max-w-md mx-auto pt-10">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-yellow-400 rounded-full mb-4 shadow-lg">
            <Sun size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Väderoptimisten</h1>
          <p className="text-slate-600 mt-2">Vi hittar väderrapporten du <i>vill</i> ha.</p>
        </div>

        <form onSubmit={handleSearch} className="relative mb-8">
          <input
            type="text"
            placeholder="Vilken stad?"
            className="w-full p-4 pl-12 rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-lg text-slate-800"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Letar...' : 'Sök'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-4">
            {results.map((res, index) => (
              <div 
                key={res.source}
                className={`p-5 rounded-2xl border transition-all ${
                  index === 0 
                    ? 'bg-white border-yellow-400 shadow-xl scale-105 ring-2 ring-yellow-100' 
                    : 'bg-white/80 border-slate-100 text-slate-500 grayscale-[0.5]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Enligt {res.source}
                    </span>
                    <h3 className="text-2xl font-bold text-slate-800 mt-1">
                      {res.temp}°C
                    </h3>
                  </div>
                  {res.icon === 'sun' && <Sun className="text-yellow-500" size={28} />}
                  {res.icon === 'cloud' && <Cloud className="text-slate-400" size={28} />}
                  {res.icon === 'rain' && <CloudRain className="text-blue-400" size={28} />}
                </div>
                
                <div className="flex gap-4 text-sm mt-2">
                  <div className="flex items-center gap-1">
                    <Wind size={14} /> {res.wind} m/s
                  </div>
                  <div className="flex items-center gap-1">
                    <Thermometer size={14} /> Känns som {res.feelsLike}°
                  </div>
                </div>
                
                {index === 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-green-600 text-sm font-medium flex items-center gap-2">
                    <ArrowRight size={14} />
                    Vi väljer att tro på detta!
                  </div>
                )}
              </div>
            ))}
            
            <p className="text-center text-xs text-slate-400 mt-6">
              Data hämtas i realtid från SMHI och Met.no (YR).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}