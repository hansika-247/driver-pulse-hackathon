import TripOverview from "./Pages/TripOverview";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
} from "recharts";
import { FaSun, FaMoon, FaMapMarkerAlt, FaExclamationTriangle, FaRoute, FaInfoCircle, FaShieldAlt } from "react-icons/fa";
import "./index.css";

// Find the nearest accelerometer GPS for a flagged moment.
// Strategy: match by trip_id + exact timestamp first, then fallback to closest elapsed_seconds.
// Uses sensor_id ordering to prefer primary readings when ties occur.
function findNearestGPS(accelData, tripId, elapsedSec, timestamp) {
  const tripReadings = accelData.filter((r) => r.trip_id === tripId);
  if (tripReadings.length === 0) return null;

  // 1) Exact timestamp match (most reliable)
  const exactMatch = tripReadings.find((r) => r.timestamp === timestamp);
  if (exactMatch) return { lat: exactMatch.gps_lat, lon: exactMatch.gps_lon };

  // 2) Closest elapsed_seconds, preferring lower sensor_id on ties (primary sensor)
  const elapsed = parseFloat(elapsedSec);
  let closest = tripReadings[0];
  let minDiff = Math.abs(parseFloat(closest.elapsed_seconds) - elapsed);
  for (const r of tripReadings) {
    const diff = Math.abs(parseFloat(r.elapsed_seconds) - elapsed);
    if (diff < minDiff || (diff === minDiff && r.sensor_id < closest.sensor_id)) {
      minDiff = diff;
      closest = r;
    }
  }
  return { lat: closest.gps_lat, lon: closest.gps_lon };
}

function App() {
  const [driverId, setDriverId] = useState("");
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [accelData, setAccelData] = useState([]);
  const [tripsData, setTripsData] = useState([]);
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "table"

  const API_BASE = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    // Load all three datasets from API in parallel
    Promise.all([
      fetch(${API_BASE}/api/flagged-moments).then((r) => r.json()),
      fetch(${API_BASE}/api/accelerometer).then((r) => r.json()),
      fetch(${API_BASE}/api/trips).then((r) => r.json()),
    ]).then(([flagsJson, accelJson, tripsJson]) => {
      setData(flagsJson.filter((r) => r.flag_id));
      setAccelData(accelJson.filter((r) => r.sensor_id));
      setTripsData(tripsJson.filter((r) => r.trip_id));
    });
  }, []);

  // Build a lookup: trip_id -> { pickup_location, dropoff_location }
  const tripLocationMap = {};
  tripsData.forEach((t) => {
    tripLocationMap[t.trip_id] = {
      pickup: t.pickup_location,
      dropoff: t.dropoff_location,
    };
  });

  const handleDriverIdChange = (e) => {
    const id = e.target.value;
    setDriverId(id);

    if (id) {
      const filtered = data
        .filter((row) => row.driver_id === id)
        .map((row) => {
          const gps = findNearestGPS(accelData, row.trip_id, row.elapsed_seconds, row.timestamp);
          const tripLoc = tripLocationMap[row.trip_id];
          return {
            ...row,
            gps_lat: gps?.lat || null,
            gps_lon: gps?.lon || null,
            pickup_location: tripLoc?.pickup || "—",
            dropoff_location: tripLoc?.dropoff || "—",
          };
        });
      setFilteredData(filtered);
    } else {
      setFilteredData([]);
    }
  };

  const severityCounts = filteredData.reduce((acc, row) => {
    if (row && row.severity) {
      acc[row.severity] = (acc[row.severity] || 0) + 1;
    }
    return acc;
  }, {});

  const severityData = Object.entries(severityCounts).map(
    ([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
    })
  );

  const flagTypeCounts = filteredData.reduce((acc, row) => {
    if (row && row.flag_type) {
      acc[row.flag_type] = (acc[row.flag_type] || 0) + 1;
    }
    return acc;
  }, {});

  const flagTypeData = Object.entries(flagTypeCounts).map(([type, count]) => ({
    type: type ? type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown",
    count,
  }));

  // Calculate stats
  const totalFlags = filteredData.length;
  const highSeverity = severityCounts.high || 0;
  const uniqueTrips = new Set(filteredData.map(row => row.trip_id).filter(Boolean)).size;

  const COLORS = ["#3B82F6", "#22C55E", "#FACC15", "#EF4444", "#A855F7"];
  const SEVERITY_COLORS = { High: "#EF4444", Medium: "#F59E0B", Low: "#22C55E" };
  const FLAG_TYPE_COLORS = {
    "Conflict Moment": "#EF4444",
    "Harsh Braking": "#F97316",
    "Audio Spike": "#A855F7",
    "Sustained Stress": "#3B82F6",
    "Moderate Brake": "#22C55E",
  };

  // -------- Driver Risk Score Logic --------

  const severityWeights = {
    low: 1,
    medium: 3,
    high: 5,
  };

  let totalPoints = 0;
  let riskScore = 0;
  let riskLevel = "Low";
  let mainIssue = "None";

  if (filteredData.length > 0) {
    filteredData.forEach(row => {
      if (row && row.severity) {
        totalPoints += severityWeights[row.severity] || 0;
      }
    });

    const maxPossiblePoints = filteredData.length * 5;
    riskScore = maxPossiblePoints ? Math.round((totalPoints / maxPossiblePoints) * 100) : 0;

    if (riskScore > 70) riskLevel = "High";
    else if (riskScore > 40) riskLevel = "Medium";

    // -------- Most Common Issue --------
    if (flagTypeData.length > 0) {
      mainIssue = flagTypeData.reduce((prev, curr) =>
        prev.count > curr.count ? prev : curr
      ).type;
    }
  }
  // Score radar data
  const avgMotion = filteredData.length ? (filteredData.reduce((s, r) => s + parseFloat(r.motion_score || 0), 0) / filteredData.length * 100).toFixed(0) : 0;
  const avgAudio = filteredData.length ? (filteredData.reduce((s, r) => s + parseFloat(r.audio_score || 0), 0) / filteredData.length * 100).toFixed(0) : 0;
  const avgCombined = filteredData.length ? (filteredData.reduce((s, r) => s + parseFloat(r.combined_score || 0), 0) / filteredData.length * 100).toFixed(0) : 0;
  const radarData = [
    { metric: "Motion", value: Number(avgMotion), fullMark: 100 },
    { metric: "Audio", value: Number(avgAudio), fullMark: 100 },
    { metric: "Combined", value: Number(avgCombined), fullMark: 100 },
    { metric: "Risk", value: riskScore, fullMark: 100 },
    { metric: "High %", value: totalFlags ? Math.round((highSeverity / totalFlags) * 100) : 0, fullMark: 100 },
  ];

  // Timeline data (flags sorted by elapsed_seconds)
  const timelineData = [...filteredData]
    .sort((a, b) => parseInt(a.elapsed_seconds) - parseInt(b.elapsed_seconds))
    .map((r, i) => ({
      index: i + 1,
      time: ${Math.floor(parseInt(r.elapsed_seconds) / 60)}m,
      motion: parseFloat(r.motion_score || 0),
      audio: parseFloat(r.audio_score || 0),
      combined: parseFloat(r.combined_score || 0),
      flag_type: r.flag_type,
    }));

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return <TripOverview />;
}

export default App;
