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
} from "recharts";
import { FaSun, FaMoon } from "react-icons/fa";
import "./index.css";
function App() {
  const [driverId, setDriverId] = useState("");
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    fetch("/flagged_moments.csv")
      .then((response) => response.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            setData(results.data);
          },
        });
      });
  }, []);

  const handleDriverIdChange = (e) => {
    const id = e.target.value;
    setDriverId(id);

    if (id) {
      const filtered = data.filter((row) => row.driver_id === id);
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

  const COLORS = ["#3B82F6", "#22C55E", "#FACC15", "#EF4444"];

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
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
  <div className={`min-h-screen p-10 transition-colors duration-300 ${
    isDarkMode 
      ? "bg-linear-to-br from-gray-900 via-gray-800 to-black text-white" 
      : "bg-linear-to-br from-blue-50 via-indigo-50 to-purple-100 text-gray-900"
  }`}>

    {/* THEME TOGGLE BUTTON */}
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={toggleTheme}
        className={`p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isDarkMode 
            ? "bg-gray-800 text-yellow-400 hover:bg-gray-700 border border-gray-600" 
            : "bg-white text-gray-800 hover:bg-gray-50 border border-gray-200"
        }`}
      >
        {isDarkMode ? <FaSun size={20} /> : <FaMoon size={20} />}
      </button>
    </div>

    {/* TICKER */}
    <div className={`py-2 mb-6 rounded-lg overflow-hidden border transition-colors duration-300 ${
      isDarkMode 
        ? "bg-gray-800 text-gray-200 border-gray-700" 
        : "bg-indigo-600 text-white border-indigo-500"
    }`}>
      <div className="animate-marquee whitespace-nowrap font-semibold">
        🚗 Driver Safety Analytics Dashboard • Monitor Risk Patterns • Improve Driving Behaviour • Real-Time Safety Insights
      </div>
    </div>

    <div className="max-w-7xl mx-auto">

      {/* HEADER */}
      <h1 className="text-5xl font-extrabold text-center mb-12 bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Driver Pulse Dashboard
      </h1>

      {/* DRIVER INPUT */}
      <div className={`backdrop-blur-lg shadow-xl rounded-xl p-6 mb-10 border transition hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
        isDarkMode 
          ? "bg-gray-800/70 border-gray-700" 
          : "bg-white/70 border-gray-200"
      }`}>
        <label className={`block text-lg font-semibold mb-2 ${
          isDarkMode ? "text-gray-200" : "text-gray-700"
        }`}>
          Enter Driver ID
        </label>

        <input
          type="text"
          placeholder="Example: DRV111"
          value={driverId}
          onChange={handleDriverIdChange}
          className={`w-full p-3 border rounded-lg outline-none transition placeholder-gray-400 ${
            isDarkMode 
              ? "border-gray-600 bg-gray-700 text-white focus:ring-2 focus:ring-blue-400" 
              : "border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-400"
          }`}
        />
      </div>

      {filteredData.length > 0 ? (
        <>
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

            <div className={`shadow-lg rounded-xl p-6 border transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <h3 className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Total Flags</h3>
              <p className="text-3xl font-bold text-blue-400">{totalFlags}</p>
            </div>

            <div className={`shadow-lg rounded-xl p-6 border transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <h3 className={isDarkMode ? "text-gray-400" : "text-gray-500"}>High Severity</h3>
              <p className="text-3xl font-bold text-red-400">{highSeverity}</p>
            </div>

            <div className={`shadow-lg rounded-xl p-6 border transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <h3 className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Trips Flagged</h3>
              <p className="text-3xl font-bold text-green-400">
                {[...new Set(filteredData.map((d) => d.trip_id))].length}
              </p>
            </div>

          </div>

          {/* Driver Safety Insights */}

          <div className={`shadow-xl rounded-xl p-6 mb-10 border transition hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>

            <h2 className={`text-xl font-semibold mb-6 ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}>
              Driver Safety Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div>
                <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Risk Score</p>

                <p className="text-3xl font-bold text-blue-400 animate-pulse">
                  {riskScore} / 100
                </p>

                <div className={`mt-3 w-full rounded-full h-3 ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}>
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${riskScore}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Risk Level</p>
                <p
                  className={`text-2xl font-bold ${
                    riskLevel === "High"
                      ? "text-red-400"
                      : riskLevel === "Medium"
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {riskLevel}
                </p>
              </div>

              <div>
                <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Main Risk Factor</p>
                <p className={`text-lg font-semibold ${
                  isDarkMode ? "text-gray-200" : "text-gray-800"
                }`}>
                  {mainIssue}
                </p>
              </div>

            </div>

          </div>

          {/* TABLE */}
          <div className={`shadow-xl rounded-xl p-6 mb-12 border transition hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>
            <h2 className={`text-2xl font-semibold mb-6 ${
              isDarkMode ? "text-gray-200" : "text-gray-800"
            }`}>
              Flagged Moments
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">

                <thead>
                  <tr className={isDarkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"}>
                    <th className="p-3">Flag ID</th>
                    <th className="p-3">Trip ID</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Flag Type</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Explanation</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredData.map((row, index) => (
                    <tr
                      key={index}
                      className={`border-b transition ${
                        isDarkMode 
                          ? "border-gray-600 odd:bg-gray-800 hover:bg-gray-700" 
                          : "border-gray-200 odd:bg-gray-50 hover:bg-blue-50"
                      }`}
                    >
                      <td className={`p-3 ${isDarkMode ? "text-gray-300" : "text-gray-900"}`}>{row.flag_id}</td>
                      <td className={`p-3 ${isDarkMode ? "text-gray-300" : "text-gray-900"}`}>{row.trip_id}</td>
                      <td className={`p-3 ${isDarkMode ? "text-gray-300" : "text-gray-900"}`}>{row.timestamp}</td>
                      <td className={`p-3 ${isDarkMode ? "text-gray-300" : "text-gray-900"}`}>{row.flag_type}</td>

                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            row.severity === "high"
                              ? (isDarkMode ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800")
                              : row.severity === "medium"
                              ? (isDarkMode ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800")
                              : (isDarkMode ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800")
                          }`}
                        >
                          {row.severity}
                        </span>
                      </td>

                      <td className={`p-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{row.explanation}</td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

            <div className={`shadow-xl rounded-xl p-6 border transition hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <h2 className={`text-xl font-semibold mb-6 ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}>
                Severity Distribution
              </h2>

              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <defs>
                    <linearGradient id="darkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={severityData.length > 0 ? severityData : [{ name: "No Data", value: 1 }]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={severityData.length > 0}
                    dataKey="value"
                  >
                    {(severityData.length > 0 ? severityData : [{ name: "No Data", value: 1 }]).map((entry, index) => (
                      <Cell
                        key={index}
                        fill={severityData.length > 0 ? (isDarkMode ? `url(#darkGradient)` : COLORS[index % COLORS.length]) : "#CCCCCC"}
                      />
                    ))}
                  </Pie>

                  <Tooltip contentStyle={isDarkMode
                    ? { backgroundColor: '#374151', border: 'none', color: '#f9fafb' }
                    : { backgroundColor: '#ffffff', border: 'none', color: '#374151' }
                  } />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className={`shadow-xl rounded-xl p-6 border transition hover:shadow-2xl hover:border-blue-400 hover:shadow-blue-500/25 ${
              isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <h2 className={`text-xl font-semibold mb-6 ${
                isDarkMode ? "text-gray-200" : "text-gray-800"
              }`}>
                Flag Type Distribution
              </h2>

              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={flagTypeData.length > 0 ? flagTypeData : [{ type: "No Data", count: 0 }]}>
                  <defs>
                    <linearGradient id="barDarkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#4B5563" : "#E5E7EB"} />
                  <XAxis dataKey="type" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
                  <Tooltip cursor={false} contentStyle={isDarkMode
                    ? { backgroundColor: '#374151', border: 'none', color: '#f9fafb' }
                    : { backgroundColor: '#ffffff', border: 'none', color: '#374151' }
                  }/>
                  <Bar dataKey="count" fill={flagTypeData.length > 0 ? (isDarkMode ? "url(#barDarkGradient)" : "#3B82F6") : "#CCCCCC"} radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        </>
      ) : (
        driverId && (
          <div className={`p-6 rounded-xl shadow-lg text-center border transition hover:border-blue-400 hover:shadow-blue-500/25 ${
            isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>
            <p className={`text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              No flagged moments found for driver{" "}
              <span className="font-semibold text-blue-400">{driverId}</span>
            </p>
          </div>
        )
      )}
    </div>
  </div>
);
}

export default App;