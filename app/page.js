'use client';

import React, { useState, useRef } from 'react';
import { Search, MapPin, Sun, Cloud, CloudRain, Wind, ArrowRight, CheckCircle, BarChart3, ChevronRight, Settings, Edit3, LocateFixed, Loader2, Snowflake, Trophy, Share2, Calendar, X } from 'lucide-react';

const WeatherApp = () => {
  // --- STATE ---
  const [viewState, setViewState] = useState('home'); 
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [weatherData, setWeatherData] = useState(null);
  const [showForecast, setShowForecast] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [loadingStatus, setLoadingStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const searchTimeout = useRef(null);

  // --- ADMIN STATE ---
  const [showAdmin, setShowAdmin] = useState(false);
  const [currentStyleId, setCurrentStyleId] = useState('poetic');
  
  // --- COPY DECK ---
  const [copyDeck, setCopyDeck] = useState({
    poetic: {
      id: 'poetic',
      name: 'Poetisk (Original)',
      headline: "Hur ser himlen ut?",
      subheadline: "Vi letar efter ljuset i alla prognoser.",
      placeholder: "Vart leder din dag?",
      loadingSteps: "Känner av vinden..., Lyssnar på molnen..., Frågar SMHI om råd..., Tolkar atmosfären..., Hittar det bästa ljuset...",
      resultTitle: "{winner} lovar bäst väder.",
      resultSub: "Lita på ljuset.",
      shareText: "Jag fann ljuset via Klarast.nu.",
      providerTitle: "Andra bud"
    },
    bold: {
      id: 'bold',
      name: 'Kaxig',
      headline: "Sluta gissa vädret.",
      subheadline: "Vi ställer SMHI mot YR. Vinnaren får din uppmärksamhet.",
      placeholder: "Vilken stad ska vi syna?",
      loadingSteps: "Startar motorn..., Tvingar fram data från SMHI..., Ställer YR mot väggen..., Krossar siffrorna..., Räknar ut vem som levererar..., Här är vinnaren...",
      resultTitle: "{winner} krossar motståndet.",
      resultSub: "{temp} grader. Det är det enda som räknas.",
      shareText: "Hittade bästa vädret på Klarast.nu. Sluta gissa du med.",
      providerTitle: "Förlorarna"
    },
    vacation: {
      id: 'vacation',
      name: 'Semesterräddaren',
      headline: "Rädda semestern.",
      subheadline: "Vi hittar den mest optimistiska prognosen. Maxa dina soltimmar.",
      placeholder: "Var finns stranden?",
      loadingSteps: "Scannar stränder..., Letar efter glasskiosker..., Ignorerar regnmoln..., Letar efter optimism..., Optimerar solbrännan...",
      resultTitle: "{winner} är din semesterhjälte!",
      resultSub: "{temp} grader varmt. Packa väskan.",
      shareText: "Jag har hittat solen! Kolla här: Klarast.nu",
      providerTitle: "Pessimisterna"
    },
    street: {
      id: 'street',
      name: 'Gatans Lag',
      headline: "Vem ljuger minst?",
      subheadline: "Vi synar bluffen. Bästa prognosen vinner.",
      placeholder: "Vart ska du?",
      loadingSteps: "Kollar läget..., Vem snackar skit?..., Synar bluffen..., Fixar siffrorna..., Håll i hatten...",
      resultTitle: "{winner} har rätta virket.",
      resultSub: "{temp} bast. Det är vad det är.",
      shareText: "Kolla läget på Klarast.nu",
      providerTitle: "Golarna"
    }
  });

  const activeCopy = copyDeck[currentStyleId];

  // --- FALLBACK DATA GENERATOR ---
  const generateFallbackData = (cityName) => {
    const baseTemp = 18 + Math.floor(Math.random() * 5);
    const date = new Date();
    const futureDates = Array.from({length: 6}, (_, i) => {
        const d = new Date(date);
        d.setDate(date.getDate() + i);
        return d.toISOString();
    });

    return {
        city: cityName || "Okänd plats",
        winner: {
            id: 'smhi', name: 'SMHI', temp: baseTemp, code: 0, conditionText: 'Soligt',
            daily: { time: futureDates, code: [0,0,1,2,0,0], max: [baseTemp, baseTemp+1, baseTemp-1, baseTemp, baseTemp+2, baseTemp], min: [10,11,9,10,12,10] }
        },
        losers: [
            { id: 'yr', name: 'YR.no', temp: baseTemp - 1, code: 2 },
            { id: 'gfs', name: 'USA (GFS)', temp: baseTemp - 2, code: 3 },
            { id: 'dwd', name: 'Global', temp: baseTemp - 1, code: 1 }
        ]
    };
  };

  // --- API LOGIC ---

  const searchCities = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=5&language=sv&format=json`);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      if (data.results) {
        setSearchResults(data.results);
        setShowSuggestions(true);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.warn("Geocoding failed, using fallback suggestions:", error);
      setSearchResults([
          { id: 1, name: searchTerm, country: "Sökning", admin1: "Klicka för att söka", latitude: 59.32, longitude: 18.06 }
      ]);
      setShowSuggestions(true);
    }
  };

  const fetchRealWeather = async (lat, lon) => {
    try {
      const models = "smhi_seamless,met_no_seamless,dwd_icon,gfs_seamless";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&models=${models}&timezone=auto`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Weather fetch failed");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Weather fetch error, returning null to trigger fallback:", error);
      return null;
    }
  };

  // --- ACTIONS ---

  const handleCopyUpdate = (field, value) => {
    setCopyDeck(prev => ({
      ...prev,
      [currentStyleId]: {
        ...prev[currentStyleId],
        [field]: value
      }
    }));
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
        searchCities(val);
    }, 300);
  };

  const handleGeolocation = () => {
    setIsLocating(true);
    
    if (!navigator.geolocation) {
        handleLocateError("Ej stöd");
        return;
    }

    const geoTimeout = setTimeout(() => {
        handleLocateError("Timeout");
    }, 5000);

    navigator.geolocation.getCurrentPosition(
        (position) => {
            clearTimeout(geoTimeout);
            const { latitude, longitude } = position.coords;
            const locationObj = { 
                name: "Din position", 
                admin1: "Här och nu", 
                country: "", 
                latitude, 
                longitude 
            };
            setIsLocating(false);
            startAggregation(locationObj);
        },
        (error) => {
            clearTimeout(geoTimeout);
            handleLocateError(error.message);
        }
    );
  };

  const handleLocateError = (msg) => {
    console.warn("Geolocation failed:", msg);
    setIsLocating(false);
    startAggregation({ name: "Stockholm (Demo)", admin1: "Plats ej funnen", latitude: 59.3293, longitude: 18.0686 });
  };

  const startAggregation = async (locationObj) => {
    setQuery(locationObj.name);
    setViewState('loading');
    setProgress(0);
    setShowSuggestions(false);
    setShowForecast(false);

    const weatherPromise = fetchRealWeather(locationObj.latitude, locationObj.longitude);
    
    const stepsArray = activeCopy.loadingSteps.split(',').map(s => s.trim());
    const totalTime = 4000; 
    const stepTime = totalTime / stepsArray.length;

    for (let i = 0; i < stepsArray.length; i++) {
      setLoadingStatus(stepsArray[i]);
      setProgress(((i + 1) / stepsArray.length) * 100);
      await new Promise(r => setTimeout(r, stepTime));
    }

    let data = null;
    try {
        data = await weatherPromise;
    } catch (e) {
        console.error(e);
    }

    if (data) {
        processWinners(data, locationObj);
    } else {
        setWeatherData(generateFallbackData(locationObj.name));
    }
    setViewState('results');
  };

  const getConditionScore = (code) => {
    if (code === 0) return 0; // Sol
    if (code <= 2) return 1; // Halvklart
    if (code <= 3) return 2; // Moln
    if (code <= 48) return 3; // Dimma
    if (code <= 80) return 4; // Skurar
    if (code <= 67) return 5; // Regn
    return 6; // Snö/Åska
  };

  const processWinners = (apiData, location) => {
    const safeGet = (val, fallback) => (val === null || val === undefined) ? fallback : val;

    const providers = [
        { 
            id: 'smhi', name: "SMHI", 
            temp: safeGet(apiData.current.temperature_2m_smhi_seamless, 0), 
            code: safeGet(apiData.current.weather_code_smhi_seamless, 3),
            daily: {
                max: apiData.daily.temperature_2m_max_smhi_seamless || [],
                min: apiData.daily.temperature_2m_min_smhi_seamless || [],
                code: apiData.daily.weather_code_smhi_seamless || [],
                time: apiData.daily.time || []
            }
        },
        { 
            id: 'yr', name: "YR.no", 
            temp: safeGet(apiData.current.temperature_2m_met_no_seamless, 0), 
            code: safeGet(apiData.current.weather_code_met_no_seamless, 3),
            daily: { max: [], min: [], code: [], time: [] } 
        },
        { 
            id: 'dwd', name: "Global", 
            temp: safeGet(apiData.current.temperature_2m_dwd_icon, 0), 
            code: safeGet(apiData.current.weather_code_dwd_icon, 3),
            daily: { max: [], min: [], code: [], time: [] }
        },
        { 
            id: 'gfs', name: "USA (GFS)", 
            temp: safeGet(apiData.current.temperature_2m_gfs_seamless, 0), 
            code: safeGet(apiData.current.weather_code_gfs_seamless, 3),
            daily: { max: [], min: [], code: [], time: [] }
        }
    ];

    const ranked = providers.sort((a, b) => {
        const scoreA = getConditionScore(a.code);
        const scoreB = getConditionScore(b.code);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return b.temp - a.temp;
    });

    const winner = ranked[0];
    
    if (!winner.daily.time.length && ranked.find(r => r.id === 'smhi')?.daily?.time?.length) {
        winner.daily = ranked.find(r => r.id === 'smhi').daily;
    }

    setWeatherData({
        city: location.name,
        region: location.admin1,
        winner: { ...winner, conditionText: getWeatherText(winner.code) },
        losers: ranked.slice(1)
    });
  };

  const handleShare = () => {
    if (!weatherData) return;
    const text = `${weatherData.city}: ${weatherData.winner.temp}°C och ${weatherData.winner.conditionText} enligt ${weatherData.winner.name}. ${activeCopy.shareText}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Helper: Icons & Text
  const getWeatherIcon = (code, className = "w-6 h-6") => {
    if (code === 0) return <Sun className={`${className} text-yellow-500`} />;
    if (code <= 3) return <Cloud className={`${className} text-slate-400`} />;
    if (code <= 48) return <Cloud className={`${className} text-slate-500`} />;
    if (code <= 67) return <CloudRain className={`${className} text-blue-400`} />;
    if (code <= 77) return <Snowflake className={`${className} text-cyan-300`} />;
    if (code >= 80) return <CloudRain className={`${className} text-blue-600`} />;
    if (code >= 95) return <ArrowRight className={`${className} text-purple-500`} />;
    return <Sun className={`${className} text-orange-400`} />;
  };

  const getWeatherText = (code) => {
    if (code === 0) return "Soligt";
    if (code <= 2) return "Halvklart";
    if (code <= 3) return "Molnigt";
    if (code <= 48) return "Dimma";
    if (code <= 67) return "Regn";
    if (code <= 77) return "Snö";
    return "Ostadigt";
  };

  const Logo = ({ size = "default" }) => (
    <div className={`flex items-center gap-3 ${size === "large" ? "flex-col" : ""}`}>
      <div className={`relative flex items-center justify-center ${size === "large" ? "w-24 h-24" : "w-10 h-10"}`}>
        <div className="absolute inset-0 bg-orange-100 rounded-full scale-150 opacity-30 animate-pulse"></div>
        <div className="absolute inset-0 bg-yellow-50 rounded-full scale-110 opacity-50"></div>
        <Sun className={`${size === "large" ? "w-20 h-20" : "w-8 h-8"} text-yellow-500 relative z-10`} fill="#fbbf24" strokeWidth={1.5}/>
      </div>
      <div className={`flex flex-col ${size === "large" ? "items-center mt-4" : "-space-y-1"}`}>
        <span className={`${size === "large" ? "text-5xl" : "text-xl"} font-bold tracking-tighter text-slate-900 font-sans`}>
          Klarast<span className="text-orange-500">.</span>
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 relative overflow-hidden">
      
      {/* HEADER */}
      <header className="absolute top-0 w-full z-40 p-6 flex justify-between items-center">
        {viewState !== 'home' ? (
            <div onClick={() => {setViewState('home'); setQuery('');}} className="cursor-pointer hover:opacity-80 transition animate-in fade-in">
                <Logo />
            </div>
        ) : <div></div>}
      </header>

      {/* --- ADMIN PANEL --- */}
      <div className={`fixed inset-y-0 right-0 z-50 transition-transform duration-300 transform ${showAdmin ? 'translate-x-0' : 'translate-x-full'} bg-slate-900 text-white w-96 shadow-2xl border-l border-slate-700 flex flex-col`}>
        {!showAdmin && (
            <button onClick={() => setShowAdmin(true)} className="absolute left-0 top-1/2 -translate-x-full bg-slate-900 p-3 rounded-l-xl text-orange-400 shadow-lg border border-r-0 border-slate-700 flex flex-col items-center gap-2">
                <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
                <span className="text-[10px] font-bold uppercase rotate-90 w-4 whitespace-nowrap mt-2">Admin</span>
            </button>
        )}
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-950">
                <div className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-orange-500" /><h3 className="font-bold text-lg">Redigerare</h3></div>
                <button onClick={() => setShowAdmin(false)} className="text-slate-400 hover:text-white"><ChevronRight className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Tema</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(copyDeck).map((style) => (
                            <button key={style.id} onClick={() => setCurrentStyleId(style.id)} className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition ${currentStyleId === style.id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                {style.name}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Simplified fields for brevity */}
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <label className="text-[10px] text-orange-400 uppercase font-bold mb-1 block">Dela-text</label>
                    <textarea value={activeCopy.shareText} onChange={(e) => handleCopyUpdate('shareText', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:border-orange-500 focus:outline-none" rows="2" />
                </div>
            </div>
        </div>
      </div>

      <main className="min-h-screen flex flex-col items-center justify-center px-4 relative max-w-5xl mx-auto transition-all duration-300">
        
        {/* VIEW: HOME */}
        {viewState === 'home' && (
          <div className="w-full max-w-xl text-center animate-in fade-in zoom-in duration-700">
            <div className="mb-12 flex justify-center"><Logo size="large" /></div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight min-h-[5rem]">{activeCopy.headline}</h1>
            <p className="text-xl text-slate-500 mb-10 font-medium min-h-[3rem]">{activeCopy.subheadline}</p>

            <form onSubmit={(e) => { e.preventDefault(); if(searchResults.length > 0) startAggregation(searchResults[0]); else searchCities(query); }} className="relative group z-20 max-w-md mx-auto">
              <div className="relative flex items-center">
                <input 
                    type="text" 
                    value={query} 
                    onChange={handleInputChange} 
                    className="block w-full pl-6 pr-14 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-bold placeholder-slate-400 focus:outline-none focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100 transition-all shadow-sm hover:shadow-lg" 
                    placeholder={activeCopy.placeholder} 
                    autoFocus 
                />
                <button type="submit" className="absolute right-2 aspect-square bg-slate-900 text-white rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center shadow-lg h-10 w-10"><Search className="w-5 h-5" /></button>
              </div>

               <div className="mt-4 flex justify-center">
                    <button type="button" onClick={handleGeolocation} disabled={isLocating} className="flex items-center gap-2 text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-full transition-colors">
                        {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                        {isLocating ? "Hittar plats..." : "Hämta min plats"}
                    </button>
               </div>

              {/* Suggestions */}
              {showSuggestions && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 text-left">
                      {searchResults.map((city, idx) => (
                          <div key={idx} onClick={() => startAggregation(city)} className="px-6 py-4 hover:bg-orange-50 cursor-pointer flex justify-between items-center group border-b border-slate-50 last:border-0 transition-colors">
                              <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-slate-300 group-hover:text-orange-500" />
                                <div>
                                    <div className="font-bold text-slate-900 text-lg flex items-center gap-2">{city.name} {city.country_code && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded">{city.country_code}</span>}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{[city.admin1, city.country].filter(Boolean).join(', ')}</div>
                                </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                      ))}
                  </div>
              )}
            </form>
          </div>
        )}

        {/* VIEW: LOADING */}
        {viewState === 'loading' && (
            <div className="w-full max-w-md text-center">
                <div className="relative w-40 h-40 mx-auto mb-12">
                    <div className="absolute inset-0 bg-orange-100 rounded-full animate-ping opacity-75 duration-[2000ms]"></div>
                    <div className="absolute inset-0 flex items-center justify-center z-10"><Sun className="w-20 h-20 text-yellow-500 animate-[spin_10s_linear_infinite]" /></div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3 transition-all duration-300 min-h-[2.5rem] tracking-tight">{loadingStatus}</h3>
                <div className="w-48 mx-auto bg-slate-100 rounded-full h-1.5 mt-8 overflow-hidden">
                    <div className="bg-orange-500 h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        )}

        {/* VIEW: RESULTS */}
        {viewState === 'results' && weatherData && (
            <div className="w-full max-w-4xl animate-in slide-in-from-bottom-8 duration-700 pb-20 pt-10">
                
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-5 py-2 rounded-full text-slate-600 font-bold text-sm mb-6">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        {weatherData.city}
                    </div>
                    <h2 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-4">
                        {activeCopy.resultTitle.replace('{winner}', weatherData.winner.name)}
                    </h2>
                     <p className="text-xl text-slate-500 font-medium">
                        {activeCopy.resultSub.replace('{temp}', Math.round(weatherData.winner.temp))}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* WINNER CARD */}
                    <div className="md:col-span-2 bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500 opacity-20 blur-[80px] rounded-full transform translate-x-10 -translate-y-10"></div>
                         
                         <div className="relative z-10 flex flex-col h-full justify-between">
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500 text-slate-900 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-yellow-500/20">
                                        <Trophy className="w-3 h-3" /> Vinnare
                                    </div>
                                    <span className="font-bold text-lg">{weatherData.winner.name}</span>
                                </div>
                                {getWeatherIcon(weatherData.winner.code, "w-16 h-16")}
                             </div>
                             
                             <div className="flex items-baseline gap-4 mb-6">
                                <span className="text-8xl font-bold tracking-tighter">{Math.round(weatherData.winner.temp)}°</span>
                                <span className="text-2xl text-slate-400 font-medium">{weatherData.winner.conditionText}</span>
                             </div>

                             <div className="flex gap-4">
                                 <button 
                                    onClick={handleShare}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                 >
                                     {copied ? <CheckCircle className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                                     {copied ? "Länk kopierad!" : "Dela bästa vädret"}
                                 </button>
                                 <button 
                                    onClick={() => setShowForecast(!showForecast)}
                                    className={`px-4 rounded-xl font-bold transition-all ${showForecast ? 'bg-white text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
                                 >
                                     {showForecast ? <X className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                                 </button>
                             </div>
                         </div>
                    </div>

                    {/* LOSERS LIST */}
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col">
                        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            {activeCopy.providerTitle}
                        </h3>
                        <div className="flex-1 flex flex-col justify-center gap-4">
                            {weatherData.losers.map((provider, idx) => (
                                <div key={idx} className="flex items-center justify-between group opacity-70 hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                            {getWeatherIcon(provider.code, "w-4 h-4")}
                                        </div>
                                        <span className="font-bold text-slate-700">{provider.name}</span>
                                    </div>
                                    <div className="font-bold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg min-w-[3.5rem] text-center">
                                        {Math.round(provider.temp)}°
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 5-DAY FORECAST (WINNER) */}
                {showForecast && (
                    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-[2rem] p-8 animate-in slide-in-from-top-4 fade-in">
                        <h3 className="text-slate-900 font-bold mb-6 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            5-dygnsprognos enligt vinnaren ({weatherData.winner.name})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {weatherData.winner.daily?.time && weatherData.winner.daily.time.length > 1 ? (
                                weatherData.winner.daily.time.slice(1, 6).map((date, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 text-center flex flex-col items-center">
                                        <span className="text-xs font-bold text-slate-400 uppercase mb-2">
                                            {new Date(date).toLocaleDateString('sv-SE', { weekday: 'short' })}
                                        </span>
                                        {getWeatherIcon(weatherData.winner.daily.code?.[idx + 1], "w-8 h-8 mb-2")}
                                        <div className="flex gap-2 text-sm">
                                            <span className="font-bold text-slate-900">{Math.round(weatherData.winner.daily.max?.[idx + 1])}°</span>
                                            <span className="text-slate-400">{Math.round(weatherData.winner.daily.min?.[idx + 1])}°</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-5 text-center text-slate-400 py-4">Ingen långtidsprognos tillgänglig för denna modell.</div>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-12 flex justify-center">
                    <button onClick={() => { setQuery(''); setViewState('home'); }} className="group bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2">
                        <span>Sök ny plats</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default WeatherApp;

