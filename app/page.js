import React, { useState } from 'react';
import { 
  Search, 
  X, 
  CloudSun, 
  CloudRain, 
  Sun, 
  Cloud, 
  Wind, 
  Umbrella, 
  Trophy, 
  ArrowRight,
  MapPin 
} from 'lucide-react';

// --- MOCK DATA ---

const CITY_DATABASE = [
  { name: "Stockholm", country: "Sverige", lat: 59.32, lon: 18.06 },
  { name: "Göteborg", country: "Sverige", lat: 57.70, lon: 11.97 },
  { name: "Malmö", country: "Sverige", lat: 55.60, lon: 13.00 },
  { name: "Uppsala", country: "Sverige", lat: 59.85, lon: 17.63 },
  { name: "Paris", country: "Frankrike", lat: 48.85, lon: 2.35 },
  { name: "Paris", country: "USA (Texas)", lat: 33.66, lon: -95.55 },
  { name: "London", country: "Storbritannien", lat: 51.50, lon: -0.12 },
  { name: "London", country: "Kanada", lat: 42.98, lon: -81.24 },
  { name: "New York", country: "USA", lat: 40.71, lon: -74.00 },
  { name: "Tokyo", country: "Japan", lat: 35.67, lon: 139.65 },
  { name: "Oslo", country: "Norge", lat: 59.91, lon: 10.75 },
  { name: "Köpenhamn", country: "Danmark", lat: 55.67, lon: 12.56 },
  { name: "Berlin", country: "Tyskland", lat: 52.52, lon: 13.40 }
];

const PROVIDERS = [
  { id: 'smhi', name: 'SMHI', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  { id: 'yr', name: 'YR.no', color: 'text-cyan-600', bg: 'bg-cyan-50', ring: 'ring-cyan-200' },
  { id: 'openweather', name: 'OpenWeather', color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-200' },
  { id: 'accu', name: 'AccuWeather', color: 'text-yellow-600', bg: 'bg-yellow-50', ring: 'ring-yellow-200' }
];

export default function App() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [forecast, setForecast] = useState([]);

  // --- LOGIC: Search & Suggestions ---
  
  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length > 0) {
      const matches = CITY_DATABASE.filter(c => 
        c.name.toLowerCase().startsWith(val.toLowerCase())
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setWeatherData(null);
    setSelectedCity(null);
  };

  const handleSelectCity = (city) => {
    setQuery(`${city.name}, ${city.country}`);
    setSuggestions([]);
    setSelectedCity(city);
    fetchWeather(city);
  };

  // --- LOGIC: Weather Simulation ---

  const fetchWeather = (city) => {
    setLoading(true);
    setWeatherData(null);
    setWinner(null);

    // Simulate API delay
    setTimeout(() => {
      const results = generateMockData(city);
      const best = results.reduce((prev, current) => (prev.score > current.score) ? prev : current);
      
      setWeatherData(results);
      setWinner(best);
      setLoading(false);
    }, 800);
  };

  const generateMockData = (city) => {
    // Seed base temp based on city name length to be consistent
    const baseTemp = 10 + (city.name.length % 15); 

    return PROVIDERS.map(provider => {
      const variance = (Math.random() * 4) - 2; 
      const temp = Math.round(baseTemp + variance);
      
      const conditions = ['Sol', 'Molnigt', 'Regn', 'Delvis molnigt'];
      let conditionIndex = Math.floor(Math.random() * conditions.length);
      if(temp > 20) conditionIndex = 0; // Bias towards sun if warm
      
      const condition = conditions[conditionIndex];
      
      return {
        provider,
        temp,
        condition,
        wind: Math.floor(Math.random() * 10) + 1,
        rainChance: condition === 'Regn' ? Math.floor(Math.random() * 50) + 50 : Math.floor(Math.random() * 20),
        score: calculateScore(temp, condition)
      };
    });
  };

  const calculateScore = (temp, condition) => {
    let score = temp * 2;
    if (condition === 'Sol') score += 20;
    if (condition === 'Regn') score -= 30;
    if (condition === 'Molnigt') score -= 5;
    return score;
  };

  // --- LOGIC: Forecast Modal ---

  const openForecast = () => {
    if (!winner || !selectedCity) return;
    
    const days = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    const todayIndex = new Date().getDay();
    const newForecast = [];

    for (let i = 1; i <= 5; i++) {
      const dayName = days[(todayIndex + i) % 7];
      const forecastTemp = winner.temp + Math.floor(Math.random() * 6) - 3;
      const isRainy = Math.random() > 0.7;
      
      let type = 'sun';
      if (forecastTemp < 10) type = 'cloud';
      if (isRainy) type = 'rain';

      newForecast.push({ day: dayName, temp: forecastTemp, type });
    }
    
    setForecast(newForecast);
    setModalOpen(true);
  };

  // --- HELPERS: Icons ---

  const getWeatherIcon = (condition, className = "w-6 h-6") => {
    if (condition === 'Sol' || condition === 'sun') return <Sun className={`text-yellow-500 ${className}`} />;
    if (condition === 'Regn' || condition === 'rain') return <CloudRain className={`text-blue-400 ${className}`} />;
    if (condition === 'Delvis molnigt') return <CloudSun className={`text-gray-500 ${className}`} />;
    return <Cloud className={`text-gray-400 ${className}`} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-indigo-600 p-4 font-sans text-gray-800 pb-20">
      
      {/* HEADER */}
      <header className="text-center mb-8 pt-6">
        <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md flex items-center justify-center gap-2">
          <CloudSun className="text-yellow-300 w-10 h-10" />
          Väderkollen
        </h1>
        <p className="text-blue-100 text-sm md:text-base">Vi jämför SMHI, YR, OpenWeather & AccuWeather</p>
      </header>

      <main className="max-w-4xl mx-auto">
        
        {/* SEARCH SECTION */}
        <div className="relative max-w-lg mx-auto mb-10 z-30">
          <div className="relative">
            <input 
              type="text" 
              value={query}
              onChange={handleSearch}
              placeholder="Sök stad (t.ex. Stockholm, Paris...)" 
              className="w-full p-4 pl-12 rounded-full shadow-lg border-none focus:ring-4 focus:ring-yellow-300 outline-none text-lg transition-all"
            />
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            
            {query && (
              <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* SUGGESTIONS DROPDOWN */}
          {suggestions.length > 0 && (
            <div className="absolute w-full mt-2 bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
              {suggestions.map((city, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectCity(city)}
                  className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0"
                >
                  <span className="font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {city.name}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{city.country}</span>
                </div>
              ))}
            </div>
          )}
          
          {query.length > 0 && suggestions.length === 0 && !selectedCity && (
             <div className="absolute w-full mt-2 bg-white rounded-xl shadow-lg p-4 text-center text-gray-500 text-sm">
               Inga städer hittades i databasen.
             </div>
          )}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-yellow-300 mb-4"></div>
            <p className="text-white font-semibold">Hämtar data...</p>
          </div>
        )}

        {/* RESULTS AREA */}
        {!loading && weatherData && winner && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* WINNER BANNER */}
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
                  <p className="text-sm font-bold text-yellow-800 opacity-70 uppercase tracking-wide">Leverantör</p>
                  <p className="text-xl font-bold text-gray-800">{winner.provider.name}</p>
                </div>
                
                <div className="text-center flex flex-col items-center">
                  {getWeatherIcon(winner.condition, "w-16 h-16 mb-2 drop-shadow-sm")}
                  <p className="font-medium text-yellow-900">{winner.condition}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-6xl font-bold text-gray-900 leading-none">{winner.temp}°</p>
                  <div className="flex items-center justify-center gap-1 text-yellow-900 mt-2 text-sm font-medium">
                    <Umbrella className="w-4 h-4" />
                    {winner.rainChance}% risk
                  </div>
                </div>
              </div>

              <div className="border-t border-yellow-500/30 pt-4">
                 <span className="inline-flex items-center gap-2 bg-white/60 hover:bg-white text-yellow-900 px-6 py-2 rounded-full font-semibold text-sm transition-colors shadow-sm">
                    Se 5-dygnsprognos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                 </span>
              </div>
            </div>

            {/* GRID TITLE */}
            <h3 className="text-white text-xl font-bold mb-4 ml-2 border-l-4 border-yellow-300 pl-3">
              Alla leverantörer
            </h3>
            
            {/* CARDS GRID */}
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
                        <div className="text-sm text-gray-600">{item.condition}</div>
                      </div>
                      {getWeatherIcon(item.condition, "w-10 h-10 opacity-80")}
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-500 border-t border-black/5 pt-3 mt-auto">
                      <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {item.wind} m/s</span>
                      <span className="flex items-center gap-1"><Umbrella className="w-3 h-3" /> {item.rainChance}%</span>
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
                <h3 className="font-bold text-lg">5-dygnsprognos</h3>
                <p className="text-indigo-200 text-sm">{selectedCity?.name} enligt {winner.provider.name}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal List */}
            <div className="p-6 bg-gray-50 space-y-3">
              {forecast.map((day, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="w-24 font-semibold text-gray-700">{day.day}</div>
                  <div className="flex-1 flex items-center justify-center gap-2">
                    {getWeatherIcon(day.type)}
                    <span className="text-sm text-gray-500">
                      {day.type === 'sun' ? 'Soligt' : day.type === 'rain' ? 'Regn' : 'Mulet'}
                    </span>
                  </div>
                  <div className="w-16 text-right font-bold text-gray-800">{day.temp}°</div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-gray-100 text-center text-xs text-gray-500">
                Data är simulerad för demonstration.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

