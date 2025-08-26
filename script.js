const API_KEY = "c6b92e2e4c3c5f053a568be9a72f2d46";

document.getElementById("searchBtn").addEventListener("click", getWeather);
document.getElementById("locationBtn").addEventListener("click", getLocation);

function getWeather() {
  const city = document.getElementById("city").value;
  const lat = document.getElementById("lat").value;
  const lon = document.getElementById("lon").value;

  let url = "";
  if (city) {
    url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
  } else if (lat && lon) {
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  } else {
    alert("Enter city or latitude/longitude");
    return;
  }

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.cod !== 200) {
        alert(data.message);
        return;
      }
      updateWeatherDisplay(data);
      fetchForecast(data.coord.lat, data.coord.lon);
      fetchAirQuality(data.coord.lat, data.coord.lon);
    })
    .catch(err => alert("Error fetching data"));
}

function updateWeatherDisplay(data) {
  document.getElementById("weather").innerHTML = `
    <h2>${data.name}, ${data.sys.country}</h2>
    <p>🌡 Temp: ${data.main.temp}°C</p>
    <p>☁ Weather: ${data.weather[0].description}</p>
    <p>💧 Humidity: ${data.main.humidity}%</p>
    <p>💨 Wind: ${data.wind.speed} m/s</p>
    <p>📍 Lat: ${data.coord.lat}, Lon: ${data.coord.lon}</p>
    <p>🌅 Sunrise: ${new Date(data.sys.sunrise*1000).toLocaleTimeString()}</p>
    <p>🌇 Sunset: ${new Date(data.sys.sunset*1000).toLocaleTimeString()}</p>
  `;
  generateTips(data);
}
function processChatMessage(message) {
  message = message.toLowerCase();

  // Match for current weather
  let currentMatch = message.match(/weather in (.+)/i);

  // Match for forecast / tomorrow / next days
  let forecastMatch = message.match(/forecast in (.+)/i);
  let tomorrowMatch = message.match(/tomorrow in (.+)/i);
  let fiveDaysMatch = message.match(/next 5 days in (.+)/i);

  if (currentMatch) {
    let city = currentMatch[1];
    fetchWeatherForChat(city);
  } else if (forecastMatch) {
    let city = forecastMatch[1];
    fetchForecastForChat(city, 5);
  } else if (tomorrowMatch) {
    let city = tomorrowMatch[1];
    fetchForecastForChat(city, 1);
  } else if (fiveDaysMatch) {
    let city = fiveDaysMatch[1];
    fetchForecastForChat(city, 5);
  } else {
    addMessage("🤖 Try asking: 'Weather in Delhi' or 'Forecast in Mumbai for next 5 days'", "bot-message");
  }
}

function fetchForecast(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
    .then(res => res.json())
    .then(data => {
      let forecastHTML = "<h3>5-Day Forecast</h3><div class='forecast'>";
      data.list.forEach((item, index) => {
        if (index % 8 === 0) {
          forecastHTML += `
            <div class="card">
              <p><b>${new Date(item.dt*1000).toLocaleDateString()}</b></p>
              <p>${item.main.temp}°C</p>
              <p>${item.weather[0].description}</p>
            </div>
          `;
        }
      });
      forecastHTML += "</div>";
      document.getElementById("forecast").innerHTML = forecastHTML;
    });
}

function fetchAirQuality(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
    .then(res => res.json())
    .then(data => {
      const aqi = data.list[0].main.aqi;
      const levels = ["Good 😊", "Fair 🙂", "Moderate 😐", "Poor 😷", "Very Poor 🤢"];
      document.getElementById("airQuality").innerHTML = `
        <h3>Air Quality</h3>
        <p>AQI: ${aqi} (${levels[aqi-1]})</p>
      `;
    });
}

function generateTips(data) {
  let tip = "🌞 Have a great day!";
  if (data.weather[0].main.toLowerCase().includes("rain")) tip = "🌧 Carry an umbrella!";
  else if (data.main.temp > 30) tip = "🥵 Stay hydrated, it's hot!";
  else if (data.main.temp < 10) tip = "🧥 Wear warm clothes!";
  else if (data.wind.speed > 10) tip = "💨 Windy outside, be careful!";
  document.getElementById("tips").innerHTML = `<h3>Suggestion</h3><p>${tip}</p>`;
}

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      document.getElementById("lat").value = lat;
      document.getElementById("lon").value = lon;
      getWeather();
    });
  } else {
    alert("Geolocation not supported");
  }
}
function fetchForecastForChat(city, days) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=c6b92e2e4c3c5f053a568be9a72f2d46&units=metric`)
    .then(res => res.json())
    .then(data => {
      if (data.cod === "200") {
        let daily = {};

        // Group by date
        data.list.forEach(item => {
          let date = new Date(item.dt * 1000).toLocaleDateString();
          if (!daily[date]) {
            daily[date] = { temps: [], conditions: [] };
          }
          daily[date].temps.push(item.main.temp);
          daily[date].conditions.push(item.weather[0].description);
        });

        let reply = `📅 Forecast for ${data.city.name}:\n`;
        let count = 0;

        for (let date in daily) {
          if (count >= days) break;
          let avgTemp = (daily[date].temps.reduce((a, b) => a + b, 0) / daily[date].temps.length).toFixed(1);
          let condition = mostCommon(daily[date].conditions);
          reply += `${date}: 🌡️ ${avgTemp}°C, ${condition}\n`;
          count++;
        }

        addMessage(reply, "bot-message");
      } else {
        addMessage("❌ Forecast not available.", "bot-message");
      }
    })
    .catch(() => addMessage("⚠️ Error fetching forecast.", "bot-message"));
}

function mostCommon(arr) {
  return arr.sort((a,b) =>
    arr.filter(v => v===a).length - arr.filter(v => v===b).length
  ).pop();
}
