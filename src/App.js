import React, { useState, useEffect } from "react";

const categories = {
  Weather: ["Sunny", "Low Sun", "Cloudy", "Rain", "Fog", "Snow"],
  "Road Type": ["City", "Country", "Highway", "Construction Site", "Tunnel"],
  Lighting: ["Day", "Dawn", "Lit Night", "Dark Night"],
  Traffic: ["Flow", "Jam"],
  Speed: ["5–30 km/h", "30–60 km/h", "60–90 km/h", "90–130 km/h", "130–250 km/h"]
};

// Convert milliseconds to mm:ss format
const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function App() {
  const [timers, setTimers] = useState({});
  const [logs, setLogs] = useState({});
  const [recentStopped, setRecentStopped] = useState("");
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleConditionClick = (category, condition) => {
    const key = `${category}-${condition}`;
    setTimers(prev => {
      const updatedTimers = { ...prev };
      let stoppedKey = "";

      // Stop any other running condition in the same category
      categories[category].forEach(cond => {
        const condKey = `${category}-${cond}`;
        if (condKey !== key && updatedTimers[condKey]) {
          const duration = Date.now() - updatedTimers[condKey];
          setLogs(l => ({ ...l, [condKey]: (l[condKey] || 0) + duration }));
          delete updatedTimers[condKey];
          stoppedKey = condKey;
        }
      });

      // Toggle clicked condition
      if (updatedTimers[key]) {
        const duration = Date.now() - updatedTimers[key];
        setLogs(l => ({ ...l, [key]: (l[key] || 0) + duration }));
        delete updatedTimers[key];
        stoppedKey = key;
      } else {
        updatedTimers[key] = Date.now();
      }

      if (stoppedKey) {
        setRecentStopped(stoppedKey);
        setTimeout(() => setRecentStopped(""), 2000);
      }

      return updatedTimers;
    });
  };

  const resetCategory = (category) => {
    const updatedLogs = { ...logs };
    const updatedTimers = { ...timers };
    categories[category].forEach(condition => {
      const key = `${category}-${condition}`;
      delete updatedTimers[key];
      delete updatedLogs[key];
    });
    setTimers(updatedTimers);
    setLogs(updatedLogs);
  };

  // ✅ NEW: Stop all running conditions
  const stopAll = () => {
    const updatedLogs = { ...logs };
    const updatedTimers = { ...timers };

    Object.keys(updatedTimers).forEach(key => {
      const duration = Date.now() - updatedTimers[key];
      updatedLogs[key] = (updatedLogs[key] || 0) + duration;
      delete updatedTimers[key];
    });

    setLogs(updatedLogs);
    setTimers({});
    setRecentStopped("all");
    setTimeout(() => setRecentStopped(""), 2000);
  };

  // CSV Export Function (fixed for Render)
  const exportCSV = () => {
    let csv = "Category,Condition,Minutes\n";

    for (let key in logs) {
      const [category, condition] = key.split("-");
      const totalMs = logs[key];
      const totalMinutes = (totalMs / 60000).toFixed(2); // convert ms to minutes
      csv += `${category},${condition},${totalMinutes}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ride_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTotalMs = (key) => {
    const base = logs[key] || 0;
    const running = timers[key] ? Date.now() - timers[key] : 0;
    return base + running;
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Ride Data Logger</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ backgroundColor: "#3498db", color: "white" }}>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Category</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Condition</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Time</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(categories).map(category =>
            categories[category].map((condition, index) => {
              const key = `${category}-${condition}`;
              const active = timers[key];
              const totalMs = getTotalMs(key);
              const isRecent = recentStopped === key;

              return (
                <tr key={key} style={{ backgroundColor: isRecent ? "#f39c12" : "white" }}>
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                    {index === 0 ? category : ""}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                    <button
                      onClick={() => handleConditionClick(category, condition)}
                      style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        backgroundColor: active ? "#e74c3c" : "#2ecc71",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer"
                      }}
                    >
                      {condition} {active ? "(Running)" : ""}
                    </button>
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                    {formatTime(totalMs)}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                    {active ? "Running" : isRecent ? "Just Stopped" : ""}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div style={{
        marginTop: "20px",
        display: "flex",
        justifyContent: "space-between",
        flexWrap: "wrap"
      }}>
        {Object.keys(categories).map(category => (
          <button
            key={category}
            onClick={() => resetCategory(category)}
            style={{
              padding: "10px 15px",
              fontSize: "14px",
              backgroundColor: "#f39c12",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              marginTop: "10px"
            }}
          >
            Reset {category}
          </button>
        ))}

        {/* 🆕 Stop All Button */}
        <button
          onClick={stopAll}
          style={{
            padding: "15px 25px",
            fontSize: "18px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          Stop All
        </button>

        <button
          onClick={exportCSV}
          style={{
            padding: "15px 25px",
            fontSize: "18px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}

export default App;
