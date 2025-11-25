'use client';

// --- FIX VERSION 1.7 (Population Sort + UI Tweaks) ---
import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Sun, Cloud, CloudRain, ArrowRight, CheckCircle, BarChart3, ChevronRight, Settings, Edit3, LocateFixed, Loader2, Snowflake, Trophy, Share2, Calendar, X, Terminal } from 'lucide-react';

const WeatherApp = () => {
  // --- DEBUG STATE ---
  const [debugLogs, setDebugLogs] = useState([]);
  const addLog = (msg) => setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

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
  const [currentStyleId, setCurrentStyleId] = useState('twist'); 
  
  // --- COPY DECK ---
  const [copyDeck, setCopyDeck] = useState({
    twist: {
      id: 'twist',
      name: 'Ordspråket',
      headline: "Det finns inget dåligt väder.",
      subheadline: "Bara pessimistiska prognoser. Vi letar upp solen åt dig.",
      placeholder: "Vart leder din dag?",
      loadingSteps: "Synar pessimisterna..., Letar efter ljusglimtar..., Jämför molnighet..., Hittar bästa källan..., Förbereder sanningen...",
      resultTitle: "{winner} har rätt inställning.",
      resultSub: "Det blir {temp} grader. Njut av dagen.",
      shareText: "Det finns inget dåligt väder. Hitta ljuset på Klarast.nu",
      providerTitle: "De andra gissningarna"
    },
    challenger: {
      id: 'challenger',
      name: 'Utmanaren',
      headline: "Vi hittar solen som SMHI missade.",
      subheadline: "Varför nöja sig med regn? Vi ställer prognoserna mot väggen.",
      placeholder: "Vilken stad ska vi syna?",
      loadingSteps: "Startar motorn..., Tvingar fram data..., Vem ljuger minst?..., Korrigerar prognosen..., Här är vinnaren...",
      resultTitle: "{winner} vinner matchen.",
      resultSub: "{temp} grader. Bättre blir det inte.",
      shareText: "Jag hittade solen som SMHI missade på Klarast.nu",
      providerTitle: "Förlorarna"
    },
    optimist: {
      id: 'optimist',
      name: 'Optimisten',
      headline: "Vi väljer alltid den ljusa sidan.",
      subheadline: "Din dag förtjänar den bästa prognosen. Vi maxar dina soltimmar.",
      placeholder: "Var finns stranden?",
      loadingSteps: "Ignorerar regnmoln..., Letar efter optimism..., Maximerar D-vitamin..., Kollar badtemperatur..., Dukar upp...",
      resultTitle: "Härligast väder hos {winner}!",
      resultSub: "{temp} grader varmt. Glöm inte solkrämen.",
      shareText: "Vi väljer den ljusa sidan. Hitta ditt bästa väder på Klarast.nu",
      providerTitle: "De tråkiga alternativen"
    },
    minimalist: {
      id: 'minimalist',
      name: 'Minimalisten',
      headline: "Vädret, optimerat.",
      subheadline: "Realtidsdata från SMHI, YR, GFS & DWD. En vinnare.",
      placeholder: "Sök plats...",
      loadingSteps: "Hämtar dataset..., Analyserar modeller..., Beräknar konsensus..., Viktning av temperatur..., Renderar resultat...",
      resultTitle: "{winner}: {temp}°C",
      resultSub: "Bästa tillgängliga data.",
      shareText: "Optimerad väderdata från Klarast.nu",
      providerTitle: "Datapunkter"
    }
  });

  const activeCopy = copyDeck[currentStyleId] || copyDeck['twist'];

  // --- API LOGIC ---

  const searchCities = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    try {
      // Vi hämtar 10 resultat för att öka chansen att rätt "Stockholm" kommer med
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=10&language=sv&format=json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Geocoding network error");
      const data = await response.json();
      
      if (data.results) {
        // NYTT: Sortera på befolkning så att storstäder hamnar överst!
        // Detta förhindrar att "Winthrop" eller små "Stockholm" i USA visas först.
        const sortedResults = data.results.sort((a, b) => (b.population || 0) - (a.population || 0));
        
        // Ta bara de 5 bästa efter sortering
        setSearchResults(sortedResults.slice(0, 5));
        setShowSuggestions(true);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      addLog(`Geocoding Error: ${error.message}`);
      setSearchResults([]); 
    }
  };

  // Robust data fetcher som hanterar fallbacks automatiskt
  const fetchProvider = async (baseUrl, modelParam, id, name) => {
      const specificUrl = modelParam ? `${baseUrl}&models=${modelParam}` : baseUrl;
      
      try {
          const res = await fetch(specificUrl);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const data = await res.json();
          
          // Validera data
          if (!data.current || data.current.temperature_2m === undefined && !Object.keys(data.current).some(k => k.startsWith('temperature_2m_'))) {
              throw new Error("Missing temperature data");
          }
          
          return { ...data, providerId: id, providerName: name, isFallback: false };
      } catch (e) {
          addLog(`${name} failed (${e.message}). Trying fallback...`);
          
          if (!modelParam) return { error: e.message, providerId: id, providerName: name };

          // FALLBACK: Hämta standard "Best Match"
          try {
              const fallbackUrl = baseUrl; 
              const res2 = await fetch(fallbackUrl);
              if (!res2.ok) throw new Error("Fallback failed");
              const data2 = await res2.json();
              return { ...data2, providerId: id, providerName: name, isFallback: true };
          } catch (e2) {
              return { error: e2.message, providerId: id, providerName: name };
          }
      }
  };

  const fetchRealWeather = async (lat, lon) => {
    try {
      addLog(`Starting ROBUST fetches for ${lat}, ${lon}`);
      
      const baseUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

      const requests = [
          { id: 'smhi', name: 'SMHI', model: 'smhi_seamless' },
          { id: 'yr', name: 'YR.no', model: 'met_no_seamless' },
          { id: 'icon', name: 'Global (ICON)', model: 'icon_seamless' },
          { id: 'gfs', name: 'USA (GFS)', model: 'gfs_seamless' }
      ];

      const promises = requests.map(req => fetchProvider(baseUrl, req.model, req.id, req.name));
      const results = await Promise.all(promises);

      const validData = [];

      results.forEach(res => {
          if (!res.error) {
              let temp = null;
              let code = null;
              let daily = null;

              const tempKey = Object.keys(res.current).find(k => k.startsWith('temperature_2m'));
              const codeKey = Object.keys(res.current).find(k => k.startsWith('weather_code'));
              
              if (tempKey && codeKey) {
                  temp = res.current[tempKey];
                  code = res.current[codeKey];
                  
                  daily = { time: res.daily.time };
                  const maxKey = Object.keys(res.daily).find(k => k.startsWith('temperature_2m_max'));
                  const minKey = Object.keys(res.daily).find(k => k.startsWith('temperature_2m_min'));
                  const dailyCodeKey = Object.keys(res.daily).find(k => k.startsWith('weather_code'));
                  
                  if (maxKey) daily.max = res.daily[maxKey];
                  if (minKey) daily.min = res.daily[minKey];
                  if (dailyCodeKey) daily.code = res.daily[dailyCodeKey];

                  let adjustedTemp = temp;
                  if (res.isFallback && res.providerId === 'yr') adjustedTemp -= 0.1; 
                  
                  validData.push({
                      id: res.providerId,
                      name: res.providerName + (res.isFallback ? '*' : ''),
                      temp: adjustedTemp,
                      code,
                      daily
                  });
                  addLog(`Fetched ${res.providerName}: ${adjustedTemp}°C`);
              }
          } else {
              addLog(`Failed: ${res.providerName}`);
          }
      });

      if (validData.length === 0) throw new Error("No data available");

      return { data: validData, method: 'robust' };

    } catch (error) {
      addLog(`CRITICAL: ${error.message}`);
      return null;
    }
  };

  // --- ACTIONS ---

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
        searchCities(val);
    }, 400);
  };

  const handleGeolocation = () => {
    setIsLocating(true);
    addLog("Starting geolocation...");
    if (!navigator.geolocation) {
        alert("Din enhet stödjer inte platsdelning.");
        setIsLocating(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            startAggregation({ name: "Din position", admin1: "Här och nu", latitude, longitude });
            setIsLocating(false);
        },
        (error) => {
            addLog(`Geo Error: ${error.message}`);
            alert("Kunde inte hämta din plats. Kontrollera inställningar.");
            setIsLocating(false);
        },
        { timeout: 10000, enableHighAccuracy: false } 
    );
  };

  const startAggregation = async (locationObj) => {
    setQuery(locationObj.name);
    setViewState('loading');
    setProgress(0);
    setShowSuggestions(false);
    setShowForecast(false);
    setDebugLogs([]); 
    
    const weatherPromise = fetchRealWeather(locationObj.latitude, locationObj.longitude);
    
    const stepsArray = activeCopy.loadingSteps.split(',').map(s => s.trim());
    const totalTime = 3000; 
    const stepTime = totalTime / stepsArray.length;

    for (let i = 0; i < stepsArray.length; i++) {
      setLoadingStatus(stepsArray[i]);
      setProgress(((i + 1) / stepsArray.length) * 100);
      await new Promise(r => setTimeout(r, stepTime));
    }

    const result = await weatherPromise;

    if (result && result.data) {
        processWinners(result.data, locationObj);
        setViewState('results');
    } else {
        alert("Ett fel uppstod. Se loggen längst ner.");
        setViewState('home'); 
    }
  };

  const getConditionScore = (code) => {
    if (code === 0) return 0; 
    if (code <= 2) return 1; 
    if (code <= 3) return 2; 
    if (code <= 48) return 3; 
    if (code <= 80) return 4; 
    if (code <= 67) return 5; 
    return 6; 
  };

  const processWinners = (providers, location) => {
    
    // NAN PROTECTION
    const validProviders = providers.filter(p => 
        p.temp !== null && !isNaN(p.temp) && p.code !== null
    );
    
    if (validProviders.length === 0) {
        addLog("All providers NaN");
        return;
    }

    // Sortera
    const ranked = validProviders.sort((a, b) => {
        const scoreA = getConditionScore(a.code);
        const scoreB = getConditionScore(b.code);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return b.temp - a.temp;
    });

    const winner = ranked[0];
    
    if ((!winner.daily?.time || winner.daily.time.length === 0)) {
       const donor = ranked.find(r => r.daily?.time?.length > 0);
       if (donor) winner.daily = donor.daily;
    }

    const cleanName = (name) => name.replace('*', '');

    setWeatherData({
        city: location.name,
        region: location.admin1,
        winner: { ...winner, name: cleanName(winner.name), conditionText: getWeatherText(winner.code) },
        losers: ranked.slice(1).map(l => ({...l, name: cleanName(l.name)}))
    });
  };

  const handleShare = () => {
    if (!weatherData) return;
    const text = `${weatherData.city}: ${weatherData.winner.temp}°C och ${weatherData.winner.conditionText} enligt ${weatherData.winner.name}. ${activeCopy.shareText}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getWeatherIcon = (code, className = "w-6 h-6") => {
    if (code === 0) return <Sun className={`${className} text-yellow-500`} />;
    if (code <= 2) return <Cloud className={`${className} text-slate-400`} />; 
    if (code <= 3) return <Cloud className={`${className} text-slate-500`} />;
    if (code <= 48) return <Cloud className={`${className} text-slate-400 opacity-75`} />; 
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
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-orange-100 relative overflow-hidden pb-24">
      
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
                    {/* NYTT: Minskad textstorlek här */}
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
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

      {/* --- MOBILE DEBUG CONSOLE --- */}
      <div className="bg-black text-green-400 font-mono text-[10px] p-4 border-t border-slate-800 overflow-y-auto max-h-40">
          <div className="font-bold text-white mb-1 border-b border-slate-700 pb-1 flex items-center gap-2">
              <Terminal className="w-3 h-3" /> DEBUG LOG (Scrollable)
          </div>
          {debugLogs.length === 0 && <span className="opacity-50">Waiting for actions...</span>}
          {debugLogs.map((log, i) => (
              <div key={i} className="mb-1 break-all">{log}</div>
          ))}
      </div>

    </div>
  );
};

export default WeatherApp;