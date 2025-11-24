"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, X, CloudSun, CloudRain, Sun, Cloud, 
  Wind, Umbrella, Trophy, ArrowRight, MapPin, Loader2, AlertCircle 
} from 'lucide-react';

// --- API KONFIGURATION ---
const API_URL = "https://api.open-meteo.com/v1/forecast";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

export default function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [winner, setWinner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [forecast, setForecast] = useState([]);

  // --- DEL 1: SÖK STAD ---
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2 && !selectedCity) {
        searchCities(query);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const searchCities = async (searchTerm) => {
    try {
      const response = await fetch(`${GEO_URL}?name=${searchTerm}&count=5&language=sv&format=json`);
      const data = await response.json();
      
      if (data.results) {
        setSuggestions(data.results);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Kunde inte hämta städer:", err);
    }
  };

  const handleSelectCity = (city) => {
    const cityName = city.name;
    const country = city.country;
    setQuery(`${cityName}, ${country}`);
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

  // --- DEL 2: HÄMTA VÄDER ---

  const fetchRealWeather = async (city) => {
    setLoading(true);
    setError(null);
    setWeatherData(null);
    setModalOpen(false); // Stäng modal om den är öppen

    try {
      // FIX: Vi tar bort 'models'-parametern för att garantera ett enkelt JSON-svar 
      // som alltid innehåller 'daily' på rätt ställe.
      const params = new URLSearchParams({
        latitude: city.latitude,
        longitude: city.longitude,
        current: "temperature_2m,weather_code,wind_speed_10m,precipitation",
        daily: "weather_code,temperature_2m_max,temperature_2m_min",
        timezone: "auto",
        forecast_days: 7 // Hämtar 7 dagar för att vara säker på att vi har data
      });

      const response = await fetch(`${API_URL}?${params.toString()}`);
      
      if (!response.ok) throw new Error('Kunde inte hämta väderdata');
      
      const data = await response.json();
      
      // Kontrollera att vi faktiskt fick data
      if (!data.current || !data.daily) {
        throw new Error("Ofullständig data från leverantören");
      }
      
      const baseTemp = data.current.temperature_2m;
      const baseCode = data.current.weather_code;
      const baseWind = data.current.wind_speed_10m;
      const baseRain = data.current.precipitation;

      const providers = [
        { id: 'smhi', name: 'SMHI (Simulerad)', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
        { id: 'yr', name: 'YR (MetNo)', color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-200' },
        { id: 'ow', name: 'OpenWeather', color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-200' },
        { id: 'accu', name: 'AccuWeather', color: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-200' }
      ];

      // Skapa variationer för jämförelsen
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
          daily: data.daily // Nu är vi säkra på att denna finns!
        };
      });

      const best = processedData.reduce((prev, current) => (prev.score > current.score) ? prev : current);

      setWeatherData(processedData);
      setWinner(best);

    } catch (err) {
      setError("Kunde inte ansluta till vädertjänsterna. Försök igen.");
      console.error(err);
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

  // --- HJÄLPFUNKTIONER ---

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
    if (code === 0) return "Klart";
    if (code === 1) return "Mest klart";
    if (code === 2) return "Halvklart";
    if (code === 3) return "Mulet";
    if (code >= 51 && code <= 67) return "Regn";
    if (code >= 71) return "Snöfall";
    if (code >= 95) return "Åska";
    return "Växlande";
  };

  // --- PROGNOS MODAL (Bug fixad här) ---

  const openForecast = () => {
    if (!winner || !winner.daily) {
      console.error("Ingen prognosdata tillgänglig");
      return;
    }
    
    try {
      const dailyData = winner.daily;
      const days = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
      
      // Säkerställ att vi har data att loopa över
      if (!dailyData.time || dailyData.time.length < 2) return;

      const newForecast = dailyData.time.slice(1, 6).map((dateStr, idx) => {
        const actualIndex = idx + 1; // Hoppa över idag (index 0)
        const dateObj = new Date(dateStr);
        const dayName = days[dateObj.getDay()];
        
        return {
          day: dayName,
          max: dailyData.temperature_2m_max[actualIndex],
          min: dailyData.temperature_2m_min[actualIndex],
          code: dailyData.weather_code[actualIndex]
        };
      });

      setForecast(newForecast);
      setModalOpen(true);
    } catch (e) {
      console.error("Fel vid skapande av prognos:", e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-indigo-600 p-4 font-sans text-gray-800 pb-20">
      
      {/* HEADER */}
      <header className="text-center mb-8 pt-6">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md flex items-center justify-center gap-2">
          <CloudSun className="text-yellow-300 w-10 h-10" />
          Väderkollen
        </h1>
        <p className="text-blue-100 text-sm md:text-base">Live-data via Open-Meteo API</p>
      </header>

      <main className="max-w-4xl mx-auto">
        
        {/* SEARCH SECTION */}
        <div className="relative max-w-lg mx-auto mb-10 z-30">
          <div className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if(e.target.value.length === 0) setSelectedCity(null);
              }}
              placeholder="Sök plats globalt (t.ex. Visby, Rom...)" 
              className="w-full p-4 pl-12 rounded-full shadow-lg border-none focus:ring-4 focus:ring-yellow-300 outline-none text-lg transition-all"
            />
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            
            {query && (
              <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* SUGGESTIONS LIST */}
          {suggestions.length > 0 && !selectedCity && (
            <div className="absolute w-full mt-2 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              {suggestions.map((city, idx) => (
                <div 
                  key={city.id || idx}
                  onClick={() => handleSelectCity(city)}
                  className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0"
                >
                  <span className="font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {city.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{city.country}</span>
                    {city.admin1 && <span className="text-xs text-gray-400">{city.admin1}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* STATUS STATES */}
        {loading && (
          <div className="text-center py-10 text-white">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-yellow-300" />
            <p className="font-semibold">Kontaktar satelliter...</p>
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
            
            {/* WINNER BANNER - Klickbar för modal */}
            <div 
              onClick={openForecast}
              className="bg-gradient-to-r from-yellow-200 to-yellow-400 rounded-2xl p-6 mb-8 shadow-lg transform hover:scale-[1.01] transition-transform cursor-pointer text-center relative overflow-hidden border-4 border-white/50 group"
            >
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-sm">
                Vinnare
              </div>
              
              <h2 className="text-2xl font-bold text-yellow-900 mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-700" />
                Dagens bästa väder!
              </h2>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 mb-6">
                <div className="text-center">
                  <p className="text-sm font-bold text-yellow-800 opacity-70 uppercase tracking-wide">Källa</p>
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
                        <span className="flex items-center gap-1"><Sun className="w-4 h-4"/> Torrt</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-yellow-500/30 pt-4">
                 <span className="inline-flex items-center gap-2 bg-white/60 hover:bg-white text-yellow-900 px-6 py-2 rounded-full font-semibold text-sm transition-colors shadow-sm">
                    Se prognos för veckan <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </span>
              </div>
            </div>

            {/* GRID */}
            <h3 className="text-white text-xl font-bold mb-4 ml-2 border-l-4 border-yellow-300 pl-3">
              Jämförelse
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
                      <span className="flex items-center gap-1">
                        {item.rain > 0 ? `${item.rain}mm` : '0mm'}
                      </span>
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
            {/* Modal Header */}
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-lg">Prognos 5 dagar</h3>
                <p className="text-indigo-200 text-sm">{selectedCity?.name} ({selectedCity?.country})</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal List */}
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


