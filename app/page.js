"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, X, CloudSun, CloudRain, Sun, Cloud, 
  Wind, Umbrella, Trophy, ArrowRight, MapPin, Loader2, AlertCircle, Settings, FileText, ChevronLeft
} from 'lucide-react';

// --- TEMA-DEFINITIONER (NU MED ARRAYER) ---
const themes = {
  sunChaser: {
    id: 'sunChaser',
    title: "Väderkollen",
    slogan: "Vi vägrar dåligt väder – vi hittar solen åt dig.",
    placeholder: "Var ska vi jaga solstrålar idag?",
    // Här är arrayen med slumpmässiga texter du bad om:
    loadingMessages: [
      "Skuffar undan molnen...",
      "Kalibrerar solstolen...",
      "Jagar bort regnet...",
      "Putsar på solen...",
      "Letar efter blå himmel..."
    ],
    winnerLabel: "Solsäkrast!",
    winnerTitle: "Här strålar det mest!",
    winnerSource: "Dagens solhjälte",
    button: "Jaga vidare i veckan",
    gridTitle: "Vad säger de andra?",
    style: "from-blue-400 to-indigo-600"
  },
  bonVivant: {
    id: 'bonVivant',
    title: "Väderkollen",
    slogan: "Maxa dina soltimmar och njut av dagen.",
    placeholder: "Vart drömmer du dig bort?",
    loadingMessages: [
      "Förbereder prognosen för njutning...",
      "Kollar om det är roséväder...",
      "Hittar den bästa uteserveringen...",
      "Mäter livskvalitén...",
      "Ser över vindarna..."
    ],
    winnerLabel: "Bästa val",
    winnerTitle: "Det ser ljuvligt ut!",
    winnerSource: "Vår favorit",
    button: "Se veckans ljusglimtar",
    gridTitle: "Alternativa bud",
    style: "from-emerald-400 to-teal-600"
  },
  joySpreader: {
    id: 'joySpreader',
    title: "Glädjeprognosen",
    slogan: "Positiva nyheter först. Alltid.",
    placeholder: "Sök din lyckoplats här...",
    loadingMessages: [
      "Filtrerar bort negativ energi...",
      "Laddar upp optimism...",
      "Skapar din egen sol...",
      "Ignorerar dåliga prognoser...",
      "Manifestar bra väder..."
    ],
    winnerLabel: "Vinnare!",
    winnerTitle: "Äntligen goda nyheter!",
    winnerSource: "Optimisten",
    button: "Fortsätt drömma (Prognos)",
    gridTitle: "Vad säger pessimisterna?",
    style: "from-pink-400 to-rose-600"
  }
};

// --- API KONFIGURATION ---
const API_URL = "https://api.open-meteo.com/v1/forecast";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

export default function App() {
  // STATE
  const [activeTheme, setActiveTheme] = useState(themes.sunChaser);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false); // Visar den stora tabellen
  
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(""); // Håller den slumpade texten
  const [error, setError] = useState(null);
  const [winner, setWinner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [forecast, setForecast] = useState([]);

  // --- INIT: Läs URL & LocalStorage ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTheme = params.get('theme');
    const adminParam = params.get('admin');

    if (adminParam === 'true') setIsAdminMode(true);

    if (urlTheme && themes[urlTheme]) {
      setActiveTheme(themes[urlTheme]);
    } else {
      const savedTheme = localStorage.getItem('weatherTheme');
      if (savedTheme && themes[savedTheme]) {
        setActiveTheme(themes[savedTheme]);
      }
    }
  }, []);

  // --- ADMIN FUNCTION ---
  const changeTheme = (themeKey) => {
    const newTheme = themes[themeKey];
    setActiveTheme(newTheme);
    localStorage.setItem('weatherTheme', themeKey);
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('theme', themeKey);
    window.history.pushState({}, '', newUrl);
  };

  // --- HELPER: Slumpa laddtext ---
  const getRandomLoadingText = () => {
    const messages = activeTheme.loadingMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // --- APP LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2 && !selectedCity) searchCities(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const searchCities = async (searchTerm) => {
    try {
      const response = await fetch(`${GEO_URL}?name=${searchTerm}&count=5&language=sv&format=json`);
      const data = await response.json();
      setSuggestions(data.results || []);
    } catch (err) { console.error(err); }
  };

  const handleSelectCity = (city) => {
    setQuery(`${city.name}, ${city.country}`);
    setSuggestions([]);
    setSelectedCity(city);
    fetchRealWeather(city);
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setWeatherData(null);
    setSelectedCity(null);
    setWinner(null);
    setError(null);
    setModalOpen(false);
  };

  const fetchRealWeather = async (city) => {
    setLoading(true);
    setLoadingText(getRandomLoadingText()); // Sätt slumpad text här
    setError(null);
    setWeatherData(null);
    setModalOpen(false);

    try {
      const params = new URLSearchParams({
        latitude: city.latitude,
        longitude: city.longitude,
        current: "temperature_2m,weather_code,wind_speed_10m,precipitation",
        daily: "weather_code,temperature_2m_max,temperature_2m_min",
        timezone: "auto",
        forecast_days: 7 
      });

      const response = await fetch(`${API_URL}?${params.toString()}`);
      if (!response.ok) throw new Error('Kunde inte hämta data');
      const data = await response.json();
      
      if (!data.current || !data.daily) throw new Error("Ofullständig data");
      
      const baseTemp = data.current.temperature_2m;
      const baseCode = data.current.weather_code;
      const baseWind = data.current.wind_speed_10m;
      const baseRain = data.current.precipitation;

      const providers = [
        { id: 'smhi', name: 'SMHI', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
        { id: 'yr', name: 'YR.no', color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-200' },
        { id: 'ow', name: 'OpenWeather', color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-200' },
        { id: 'accu', name: 'AccuWeather', color: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-200' }
      ];

      const processedData = providers.map((provider, index) => {
        const variance = index === 0 ? 0 : (Math.random() * 1.5) - 0.75; 
        const temp = Number((baseTemp + variance).toFixed(1));
        
        return {
          provider,
          temp,
          conditionCode: baseCode,
          wind: Number((baseWind + (Math.random())).toFixed(1)),
          rain: baseRain,
          score: calculateScore(temp, baseRain, baseCode),
          daily: data.daily 
        };
      });

      const best = processedData.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      setWeatherData(processedData);
      setWinner(best);

    } catch (err) {
      setError("Hoppsan! Molnen var i vägen för uppkopplingen.");
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (temp, rain, code) => {
    let score = temp * 2;
    if (rain > 0) score -= (rain * 5);
    if (code <= 3) score += 10;
    if (code >= 50) score -= 20;
    return score;
  };

  const getWMOIcon = (code, className = "w-6 h-6") => {
    if (code === 0) return <Sun className={`text-yellow-500 ${className}`} />;
    if (code === 1 || code === 2) return <CloudSun className={`text-yellow-400 ${className}`} />;
    if (code === 3) return <Cloud className={`text-gray-400 ${className}`} />;
    if (code >= 51 && code <= 67) return <CloudRain className={`text-blue-400 ${className}`} />;
    if (code >= 71) return <CloudRain className={`text-indigo-300 ${className}`} />;
    if (code >= 95) return <Wind className={`text-purple-500 ${className}`} />;
    return <CloudSun className={`text-gray-400 ${className}`} />;
  };

  const getWMODescription = (code) => {
    if (code === 0) return "Strålande sol";
    if (code === 1 || code === 2) return "Mest klart";
    if (code === 3) return "Molnigt";
    if (code >= 51 && code <= 67) return "Regn";
    if (code >= 71) return "Snö";
    if (code >= 95) return "Åska";
    return "Växlande";
  };

  const openForecast = () => {
    if (!winner || !winner.daily) return;
    try {
      const dailyData = winner.daily;
      const days = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
      if (!dailyData.time || dailyData.time.length < 2) return;

      const newForecast = dailyData.time.slice(1, 6).map((dateStr, idx) => {
        const actualIndex = idx + 1;
        const dateObj = new Date(dateStr);
        return {
          day: days[dateObj.getDay()],
          max: dailyData.temperature_2m_max[actualIndex],
          min: dailyData.temperature_2m_min[actualIndex],
          code: dailyData.weather_code[actualIndex]
        };
      });
      setForecast(newForecast);
      setModalOpen(true);
    } catch (e) { console.error(e); }
  };

  // --- CONTENT DASHBOARD RENDER ---
  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="text-blue-600" /> Copywriting Dashboard
            </h1>
            <button 
              onClick={() => setShowDashboard(false)}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft size={16} /> Tillbaka till Appen
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider w-1/6">Sektion</th>
                    <th className="p-4 font-bold text-blue-700 w-1/4">☀️ Solsökaren</th>
                    <th className="p-4 font-bold text-emerald-700 w-1/4">☕ Livsnjutaren</th>
                    <th className="p-4 font-bold text-pink-700 w-1/4">🎉 Glädjespridaren</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Title */}
                  <tr>
                    <td className="p-4 font-medium text-gray-400">Huvudrubrik</td>
                    <td className="p-4">{themes.sunChaser.title}</td>
                    <td className="p-4">{themes.bonVivant.title}</td>
                    <td className="p-4">{themes.joySpreader.title}</td>
                  </tr>
                  {/* Slogan */}
                  <tr>
                    <td className="p-4 font-medium text-gray-400">Underrubrik</td>
                    <td className="p-4 italic">{themes.sunChaser.slogan}</td>
                    <td className="p-4 italic">{themes.bonVivant.slogan}</td>
                    <td className="p-4 italic">{themes.joySpreader.slogan}</td>
                  </tr>
                  {/* Placeholder */}
                  <tr>
                    <td className="p-4 font-medium text-gray-400">Sökruta</td>
                    <td className="p-4 text-sm bg-gray-50 rounded border border-gray-100">{themes.sunChaser.placeholder}</td>
                    <td className="p-4 text-sm bg-gray-50 rounded border border-gray-100">{themes.bonVivant.placeholder}</td>
                    <td className="p-4 text-sm bg-gray-50 rounded border border-gray-100">{themes.joySpreader.placeholder}</td>
                  </tr>
                  {/* Loading Array */}
                  <tr>
                    <td className="p-4 font-medium text-gray-400 align-top">
                      Laddar-texter<br/>
                      <span className="text-xs text-gray-400 font-normal">(Slumpas fram)</span>
                    </td>
                    <td className="p-4 align-top">
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                        {themes.sunChaser.loadingMessages.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </td>
                    <td className="p-4 align-top">
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                        {themes.bonVivant.loadingMessages.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </td>
                    <td className="p-4 align-top">
                      <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                        {themes.joySpreader.loadingMessages.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </td>
                  </tr>
                  {/* Winner Title */}
                  <tr>
                    <td className="p-4 font-medium text-gray-400">Vinnarrubrik</td>
                    <td className="p-4 font-bold">{themes.sunChaser.winnerTitle}</td>
                    <td className="p-4 font-bold">{themes.bonVivant.winnerTitle}</td>
                    <td className="p-4 font-bold">{themes.joySpreader.winnerTitle}</td>
                  </tr>
                  {/* Winner Label */}
                  <tr>
                    <td className="p-4 font-medium text-gray-400">Label (Tag)</td>
                    <td className="p-4"><span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">{themes.sunChaser.winnerLabel}</span></td>
                    <td className="p-4"><span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">{themes.bonVivant.winnerLabel}</span></td>
                    <td className="p-4"><span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">{themes.joySpreader.winnerLabel}</span></td>
                  </tr>
                  {/* Button */}
                  <tr>
                    <td className="p-4 font-medium text-gray-400">Knapptext</td>
                    <td className="p-4"><button className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">{themes.sunChaser.button}</button></td>
                    <td className="p-4"><button className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">{themes.bonVivant.button}</button></td>
                    <td className="p-4"><button className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full">{themes.joySpreader.button}</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className={`min-h-screen bg-gradient-to-br ${activeTheme.style} p-4 font-sans text-gray-800 pb-20 transition-colors duration-500`}>
      
      {/* ADMIN CONTROLS (Visas bara om ?admin=true) */}
      {isAdminMode && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl z-50 border border-gray-700 w-64 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="font-bold text-sm uppercase tracking-wider">Admin</span>
            </div>
            <span className="text-xs text-green-400">● Active</span>
          </div>
          
          <div className="space-y-2 mb-4">
            <button 
              onClick={() => changeTheme('sunChaser')}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTheme.id === 'sunChaser' ? 'bg-blue-600 font-bold' : 'hover:bg-gray-800'}`}
            >
              ☀️ Solsökaren
            </button>
            <button 
              onClick={() => changeTheme('bonVivant')}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTheme.id === 'bonVivant' ? 'bg-emerald-600 font-bold' : 'hover:bg-gray-800'}`}
            >
              ☕ Livsnjutaren
            </button>
            <button 
              onClick={() => changeTheme('joySpreader')}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTheme.id === 'joySpreader' ? 'bg-pink-600 font-bold' : 'hover:bg-gray-800'}`}
            >
              🎉 Glädjespridaren
            </button>
          </div>

          <button 
            onClick={() => setShowDashboard(true)}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded border border-gray-600 mb-2"
          >
            <FileText size={12} /> Visa Textöversikt
          </button>
          
          <button 
            onClick={() => setIsAdminMode(false)} 
            className="text-xs text-gray-500 hover:text-white underline w-full text-center"
          >
            Dölj Admin
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="text-center mb-8 pt-6">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md flex items-center justify-center gap-2">
          <CloudSun className="text-yellow-300 w-10 h-10" />
          {activeTheme.title}
        </h1>
        <p className="text-blue-100 text-sm md:text-base italic">
          "{activeTheme.slogan}"
        </p>
      </header>

      <main className="max-w-4xl mx-auto">
        
        {/* SÖKFÄLT */}
        <div className="relative max-w-lg mx-auto mb-10 z-30">
          <div className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if(e.target.value.length === 0) setSelectedCity(null);
              }}
              placeholder={activeTheme.placeholder}
              className="w-full p-4 pl-12 rounded-full shadow-lg border-none focus:ring-4 focus:ring-yellow-300 outline-none text-lg transition-all"
            />
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            {query && (
              <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {suggestions.length > 0 && !selectedCity && (
            <div className="absolute w-full mt-2 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              {suggestions.map((city, idx) => (
                <div key={city.id || idx} onClick={() => handleSelectCity(city)} className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0">
                  <span className="font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" /> {city.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{city.country}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LOADING (MED SLUMPAD TEXT) */}
        {loading && (
          <div className="text-center py-10 text-white">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-yellow-300" />
            <p className="font-semibold text-lg animate-pulse">{loadingText}</p>
          </div>
        )}

        {error && (
          <div className="text-center py-6 bg-red-100/90 rounded-xl max-w-md mx-auto mb-6 text-red-600 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>{error}</p>
          </div>
        )}

        {/* RESULTS */}
        {!loading && weatherData && winner && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* VINNAR BANNER */}
            <div 
              onClick={openForecast}
              className="bg-gradient-to-r from-yellow-200 to-yellow-400 rounded-2xl p-6 mb-8 shadow-lg transform hover:scale-[1.01] transition-transform cursor-pointer text-center relative overflow-hidden border-4 border-white/50 group"
            >
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-sm">
                {activeTheme.winnerLabel}
              </div>
              
              <h2 className="text-2xl font-bold text-yellow-900 mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-700" />
                {activeTheme.winnerTitle}
              </h2>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 mb-6">
                <div className="text-center">
                  <p className="text-sm font-bold text-yellow-800 opacity-70 uppercase tracking-wide">{activeTheme.winnerSource}</p>
                  <p className="text-xl font-bold text-gray-800">{winner.provider.name}</p>
                </div>
                <div className="text-center flex flex-col items-center">
                  {getWMOIcon(winner.conditionCode, "w-16 h-16 mb-2 drop-shadow-sm")}
                  <p className="font-medium text-yellow-900">{getWMODescription(winner.conditionCode)}</p>
                </div>
                <div className="text-center">
                  <p className="text-6xl font-bold text-gray-900 leading-none">{winner.temp}°</p>
                  <div className="flex items-center justify-center gap-1 text-yellow-900 mt-2 text-sm font-medium">
                    {winner.rain > 0 ? (
                        <span className="flex items-center gap-1"><Umbrella className="w-4 h-4"/> {winner.rain}mm</span>
                    ) : (
                        <span className="flex items-center gap-1"><Sun className="w-4 h-4"/> Inget regn</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-yellow-500/30 pt-4">
                 <span className="inline-flex items-center gap-2 bg-white/60 hover:bg-white text-yellow-900 px-6 py-2 rounded-full font-semibold text-sm transition-colors shadow-sm">
                    {activeTheme.button} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </span>
              </div>
            </div>

            {/* GRID */}
            <h3 className="text-white text-xl font-bold mb-4 ml-2 border-l-4 border-yellow-300 pl-3">
              {activeTheme.gridTitle}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {weatherData.map((item, idx) => {
                const isWinner = item.provider.id === winner.provider.id;
                return (
                  <div key={idx} className={`${item.provider.bg} rounded-xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col justify-between ${isWinner ? `ring-2 ring-offset-2 ring-offset-blue-500 ${item.provider.ring}` : ''}`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`font-bold ${item.provider.color}`}>{item.provider.name}</span>
                      {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-3xl font-bold text-gray-800 mb-1">{item.temp}°</div>
                        <div className="text-sm text-gray-600">{getWMODescription(item.conditionCode)}</div>
                      </div>
                      {getWMOIcon(item.conditionCode, "w-10 h-10 opacity-80")}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 border-t border-black/5 pt-3 mt-auto">
                      <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {item.wind} m/s</span>
                      <span className="flex items-center gap-1">{item.rain > 0 ? `${item.rain}mm` : 'Torrt'}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </main>

      {/* FORECAST MODAL */}
      {modalOpen && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-lg">Prognos 5 dagar</h3>
                <p className="text-indigo-200 text-sm">{selectedCity?.name} ({selectedCity?.country})</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-gray-50 space-y-3">
              {forecast.length > 0 ? forecast.map((day, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="w-20 font-semibold text-gray-700">{day.day}</div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {getWMOIcon(day.code)}
                    <span className="text-sm text-gray-500 hidden sm:block">
                      {getWMODescription(day.code)}
                    </span>
                  </div>
                  <div className="w-24 text-right flex justify-end gap-2 text-sm">
                     <span className="font-bold text-gray-800">{Math.round(day.max)}°</span>
                     <span className="text-gray-400">{Math.round(day.min)}°</span>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-500">Laddar prognos...</p>
              )}
            </div>
            <div className="p-4 bg-gray-100 text-center text-xs text-gray-500">
                Data levereras av Open-Meteo API.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


