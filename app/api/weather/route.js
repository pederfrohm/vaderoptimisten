import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ error: 'Ingen stad angiven' }, { status: 400 });
  }

  try {
    // 1. Hämta koordinater
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=sv&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return NextResponse.json({ error: 'Hittade inte staden' }, { status: 404 });
    }

    const { latitude, longitude, name } = geoData.results[0];
    const lat = latitude.toFixed(3);
    const lon = longitude.toFixed(3);

    // 2. Hämta väder från SMHI
    const smhiPromise = fetch(`https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`)
      .then(res => res.json())
      .then(data => {
        const now = data.timeSeries[0];
        const temp = now.parameters.find(p => p.name === 't').values[0];
        const wind = now.parameters.find(p => p.name === 'ws').values[0];
        const symbol = now.parameters.find(p => p.name === 'Wsymb2').values[0];
        
        let icon = 'cloud';
        if (symbol <= 3) icon = 'sun';
        if (symbol > 6) icon = 'rain';

        return { source: 'SMHI', temp, wind, icon, feelsLike: temp };
      })
      .catch((err) => {
        console.error("SMHI Error:", err);
        return null;
      });

    // 3. Hämta väder från YR
    const yrPromise = fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': 'Vaderoptimisten/1.0' }
    })
      .then(res => res.json())
      .then(data => {
        const now = data.properties.timeseries[0].data.instant.details;
        const nextHour = data.properties.timeseries[0].data.next_1_hours.summary.symbol_code;
        
        let icon = 'cloud';
        if (nextHour.includes('sun') || nextHour.includes('clear')) icon = 'sun';
        if (nextHour.includes('rain')) icon = 'rain';

        return { source: 'YR (Norge)', temp: now.air_temperature, wind: now.wind_speed, icon, feelsLike: now.air_temperature };
      })
      .catch((err) => {
        console.error("YR Error:", err);
        return null;
      });

    const [smhi, yr] = await Promise.all([smhiPromise, yrPromise]);
    let results = [smhi, yr].filter(r => r !== null);

    // 4. Optimism Score
    results = results.map(res => {
      let score = res.temp * 2; 
      if (res.icon === 'sun') score += 15;
      if (res.icon === 'rain') score -= 10;
      score -= res.wind;
      return { ...res, score };
    });

    return NextResponse.json({ city: name, results });

  } catch (error) {
    console.error("Main API Error:", error);
    return NextResponse.json({ error: 'Serverfel' }, { status: 500 });
  }
}