const apiKey = "2e143698365c4e5c92a112425242909";
const baseUrl = "https://api.weatherapi.com/v1";

let currentCity = "Colombo";
let units = "metric";

const cityInput = document.getElementById("city-search");
const searchButton = document.getElementById("search-btn");
const celsiusBtn = document.getElementById("celsius-btn");
const fahrenheitBtn = document.getElementById("fahrenheit-btn");
const locationBtn = document.getElementById("location-btn");
const themeToggle = document.getElementById("theme-toggle");

searchButton.addEventListener("click", handleSearch);
cityInput.addEventListener("keypress", handleEnterKey);
celsiusBtn.addEventListener("click", () => setUnits("metric"));
fahrenheitBtn.addEventListener("click", () => setUnits("imperial"));
locationBtn.addEventListener("click", getUserLocation);
themeToggle.addEventListener("click", toggleTheme);

function handleSearch() {
	if (cityInput.value.trim()) {
		currentCity = cityInput.value.trim();
		getWeather();
	}
}

function handleEnterKey(event) {
	if (event.key === "Enter" && cityInput.value.trim()) {
		currentCity = cityInput.value.trim();
		getWeather();
	}
}

function setUnits(newUnits) {
	units = newUnits;
	updateUnitButtons();
	getWeather();
}

function updateUnitButtons() {
	if (units === "metric") {
		celsiusBtn.classList.add("active");
		fahrenheitBtn.classList.remove("active");
	} else {
		celsiusBtn.classList.remove("active");
		fahrenheitBtn.classList.add("active");
	}
}

function getUserLocation() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				currentCity = `${latitude},${longitude}`;
				getWeather();
			},
			(error) => {
				console.error("Error getting user location:", error);
				displayError("Unable to get your location. Please enter a city name.");
			}
		);
	} else {
		displayError("Geolocation is not supported by your browser.");
	}
}

function toggleTheme() {
	document.body.classList.toggle("dark-mode");
	const icon = themeToggle.querySelector("i");
	icon.classList.toggle("fa-moon");
	icon.classList.toggle("fa-sun");
	localStorage.setItem(
		"theme",
		document.body.classList.contains("dark-mode") ? "dark" : "light"
	);
}

function setTheme() {
	const savedTheme = localStorage.getItem("theme");
	if (
		savedTheme === "dark" ||
		(!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
	) {
		document.body.classList.add("dark-mode");
		themeToggle.querySelector("i").classList.remove("fa-moon");
		themeToggle.querySelector("i").classList.add("fa-sun");
	} else {
		document.body.classList.remove("dark-mode");
		themeToggle.querySelector("i").classList.remove("fa-sun");
		themeToggle.querySelector("i").classList.add("fa-moon");
	}
}

async function getWeather() {
	try {
		const currentWeather = await fetchWeatherData("current");
		const forecast = await fetchWeatherData("forecast", 3);

		updateCurrentWeather(currentWeather);
		updateForecast(forecast);
		updateHistoricalData();
		updateWeatherMap(
			currentWeather.location.lat,
			currentWeather.location.lon,
			currentWeather.location.name,
			currentWeather.current.wind_kph,
			currentWeather.current.precip_mm
		);
	} catch (error) {
		console.error("Error fetching the weather data:", error);
		displayError(
			"An error occurred while fetching weather data. Please try again."
		);
	}
}

async function fetchWeatherData(endpoint, days = 1, date = "") {
	const dateParam = date ? `&dt=${date}` : "";
	const url = `${baseUrl}/${endpoint}.json?key=${apiKey}&q=${currentCity}&days=${days}&aqi=no${dateParam}`;
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return await response.json();
}

function updateCurrentWeather(data) {
	document.getElementById("city-name").textContent = data.location.name;
	document.getElementById("weather-description").textContent =
		data.current.condition.text;
	document.getElementById("temperature").textContent =
		units === "metric" ? data.current.temp_c : data.current.temp_f;
	document.getElementById("feels-like").textContent =
		units === "metric" ? data.current.feelslike_c : data.current.feelslike_f;
	document.getElementById("humidity").textContent = data.current.humidity;
	document.getElementById("wind-speed").textContent =
		units === "metric" ? data.current.wind_kph : data.current.wind_mph;
	document.getElementById("pressure").textContent = data.current.pressure_mb;
	document.getElementById("visibility").textContent =
		units === "metric" ? data.current.vis_km : data.current.vis_miles;
	document.getElementById("rain").textContent = data.current.precip_mm;
	document.getElementById(
		"weather-icon"
	).src = `https:${data.current.condition.icon}`;

	document
		.querySelectorAll(".unit")
		.forEach((el) => (el.textContent = units === "metric" ? "°C" : "°F"));
	document.querySelector(".wind-unit").textContent =
		units === "metric" ? "km/h" : "mph";
}

function updateForecast(data) {
	const forecastContainer = document.querySelector(".forecast-container");
	forecastContainer.innerHTML = "";

	data.forecast.forecastday.forEach((day) => {
		const dayElement = document.createElement("div");
		dayElement.classList.add("forecast-item");
		dayElement.innerHTML = `
            <h3>${new Date(day.date).toLocaleDateString("en-US", {
							weekday: "short",
						})}</h3>
            <img src="https:${day.day.condition.icon}" alt="${
			day.day.condition.text
		}">
            <p>${units === "metric" ? day.day.avgtemp_c : day.day.avgtemp_f}${
			units === "metric" ? "°C" : "°F"
		}</p>
            <p>${day.day.condition.text}</p>
        `;
		forecastContainer.appendChild(dayElement);
	});
}

function updateAirQuality(data) {
	const airQualityContainer = document.getElementById("air-quality");
	const aqi = data.forecast.forecastday[0].day.air_quality["us-epa-index"];
	const aqiDescription = getAQIDescription(aqi);

	airQualityContainer.innerHTML = `
      <h3>Air Quality</h3>
      <p>AQI: ${aqi} - ${aqiDescription}</p>
  `;
}

function getAQIDescription(aqi) {
	switch (aqi) {
		case 1:
			return "Good";
		case 2:
			return "Moderate";
		case 3:
			return "Unhealthy for sensitive groups";
		case 4:
			return "Unhealthy";
		case 5:
			return "Very Unhealthy";
		case 6:
			return "Hazardous";
		default:
			return "Unknown";
	}
}

async function updateHistoricalData() {
	const historicalContainer = document.querySelector(".historical-container");
	historicalContainer.innerHTML = "";

	const today = new Date();

	for (let i = 1; i <= 7; i++) {
		const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
			.toISOString()
			.split("T")[0];
		try {
			const data = await fetchWeatherData("history", 1, date);
			const dayElement = document.createElement("div");
			dayElement.classList.add("historical-item");
			dayElement.innerHTML = `
                <h3>${new Date(date).toLocaleDateString("en-US", {
									weekday: "short",
								})}</h3>
                <img src="https:${
									data.forecast.forecastday[0].day.condition.icon
								}" alt="${data.forecast.forecastday[0].day.condition.text}">
                <p>${
									units === "metric"
										? data.forecast.forecastday[0].day.avgtemp_c
										: data.forecast.forecastday[0].day.avgtemp_f
								}${units === "metric" ? "°C" : "°F"}</p>
                <p>${data.forecast.forecastday[0].day.condition.text}</p>
            `;
			historicalContainer.appendChild(dayElement);
		} catch (error) {
			console.error("Error fetching historical data:", error);
		}
	}
}

function updateWeatherMap(lat, lon, location, wind, rain) {
	if (!window.weatherMap) {
		window.weatherMap = L.map("map").setView([lat, lon], 10);
		L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: "© OpenStreetMap contributors",
		}).addTo(window.weatherMap);
	} else {
		window.weatherMap.setView([lat, lon], 10);
	}

	if (window.weatherMarker) {
		window.weatherMap.removeLayer(window.weatherMarker);
	}

	window.weatherMarker = L.marker([lat, lon])
		.addTo(window.weatherMap)
		.bindPopup(
			`Location: ${location}<br>Wind Speed: ${wind} kph<br>Rain: ${rain} mm`
		)
		.openPopup();
}

function displayError(message) {
	const errorElement = document.createElement("div");
	errorElement.classList.add("error-message");
	errorElement.textContent = message;
	document.querySelector(".container").prepend(errorElement);
	setTimeout(() => errorElement.remove(), 5000);
}

document.addEventListener("DOMContentLoaded", () => {
	setTheme();
	getWeather();
});
