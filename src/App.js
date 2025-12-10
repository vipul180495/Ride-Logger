8import React, { useState, useEffect } from "react";

if (process.env.REACT_APP_CRASH_APP === "true") {
  throw new Error("error triggered from Render!");
}
const categories = {
  Weather: ["Sunny", "Low Sun", "Cloudy", "Rain", "Fog", "Snow"],
  "Road Type": ["City", "Country", "Highway", "Construction Site", "Tunnel"],
  Lighting: ["Day", "Dawn", "Lit Night", "Dark Night"],
  Traffic: ["Flow", "Jam"],
  Speed: ["0-2 mph", "3-18 mph", "19-37 mph", "38-55 mph", "56-80 mph", "81-155 mph"]
};

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function App() {
// 🔥 Intentional crash for testing
  throw new Error("Intentional error: error crash on load!");
  const [timers, setTimers] = useState({});
  const [logs, setLogs] = useState({});
  const [recentStopped, setRecentStopped] = useState("");
  const [, forceUpdate] = useState(0);
  const [comment, setComment] = useState("");
  const [sessionStart, setSessionStart] = useState(null);

  const [formData, setFormData] = useState({
    Driver: "",
    Annotator: "",
    Date: "",
    Vehicle: "",
    RSUNo: "",
    RSUStartDate: "",
    DriveId: ""
  });

  // ⭐ ALERT STATES ⭐
  const [notified30, setNotified30] = useState(false);
  const [notified40, setNotified40] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerColor, setBannerColor] = useState("");

  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute total session minutes
  const sessionMinutes = sessionStart ? Math.floor((Date.now() - sessionStart) / 60000) : 0;

  // ⭐ FIXED ALERT LOGIC (no eslint warnings) ⭐
  useEffect(() => {
    if (!sessionStart) return;

    // 30 min
    if (sessionMinutes === 30 && !notified30) {
      setBannerMessage("⏰ 30 minutes reached!");
      setBannerColor("yellow");
      setNotified30(true);
    }

    // 40 min
    if (sessionMinutes === 40 && !notified40) {
      setBannerMessage("⏰ 40 minutes reached!");
      setBannerColor("red");
      setNotified40(true);

      setTimeout(() => {
        setBannerMessage("");
        setBannerColor("");
      }, 5000);
    }

  }, [sessionMinutes, sessionStart, notified30, notified40]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConditionClick = (category, condition) => {
    if (!sessionStart) setSessionStart(new Date());

    const key = `${category}-${condition}`;
    setTimers((prev) => {
      const updatedTimers = { ...prev };
      let stoppedKey = "";

      categories[category].forEach((cond) => {
        const condKey = `${category}-${cond}`;
        if (condKey !== key && updatedTimers[condKey]) {
          const duration = Date.now() - updatedTimers[condKey];
          setLogs((l) => ({ ...l, [condKey]: (l[condKey] || 0) + duration }));
          delete updatedTimers[condKey];
          stoppedKey = condKey;
        }
      });

      if (updatedTimers[key]) {
        const duration = Date.now() - updatedTimers[key];
        setLogs((l) => ({ ...l, [key]: (l[key] || 0) + duration }));
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
    categories[category].forEach((condition) => {
      const key = `${category}-${condition}`;
      delete updatedTimers[key];
      delete updatedLogs[key];
    });

    setTimers(updatedTimers);
    setLogs(updatedLogs);
  };

  const stopAll = () => {
    const updatedLogs = { ...logs };
    const updatedTimers = { ...timers };

    Object.keys(updatedTimers).forEach((key) => {
      const duration = Date.now() - updatedTimers[key];
      updatedLogs[key] = (updatedLogs[key] || 0) + duration;
      delete updatedTimers[key];
    });

    setLogs(updatedLogs);
    setTimers({});
  };

  // Export CSV locally
  const exportCSV = () => {
    if (!sessionStart) {
      alert("Please start a session first!");
      return;
    }

    stopAll();

    const sessionEnd = new Date();
    const sessionDurationMs = sessionEnd - sessionStart;

    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const fileName = `RideData_${date}_${time}.csv`;

    let csv = "Ride Data Logger Report\n\n";
    Object.keys(formData).forEach((f) => (csv += `${f},${formData[f]}\n`));
    csv += `Session Start,${sessionStart.toLocaleString()}\n`;
    csv += `Session End,${sessionEnd.toLocaleString()}\n`;
    csv += `Session Duration,${formatTime(sessionDurationMs)}\n\n`;
    csv += "Category,Condition,Minutes\n";

    for (let key in logs) {
      const split = key.indexOf("-");
      const category = key.slice(0, split);
      const condition = key.slice(split + 1);
      csv += `${category},${condition},${formatTime(logs[key])}\n`;
    }

    if (comment.trim() !== "") csv += `\nComment,${comment.replace(/,/g, " ")}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const getTotalMs = (key) => {
    const base = logs[key] || 0;
    const running = timers[key] ? Date.now() - timers[key] : 0;
    return base + running;
  };

  return (
    <div style={{ padding: "25px", fontFamily: "Segoe UI, sans-serif", backgroundColor: "#0d0d0d", color: "#f5f5f5", minHeight: "100vh" }}>

      {/* ALERT BANNER */}
      {bannerMessage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            padding: "12px",
            backgroundColor: bannerColor === "yellow" ? "#ffcc00" : "#ff4444",
            color: "black",
            textAlign: "center",
            fontSize: "18px",
            fontWeight: "bold",
            zIndex: 9999
          }}
        >
          {bannerMessage}
        </div>
      )}

      <h1 style={{ textAlign: "center", color: "#ff3333", textShadow: "0 0 10px #ff0000" }}>
        🚗 Ride Data Logger
      </h1>

      {/* Info Form */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "10px", marginBottom: "20px", boxShadow: "0 0 10px #111" }}>
        {Object.keys(formData).map((key) => (
          <input
            key={key}
            name={key}
            placeholder={key.replace(/([A-Z])/g, " $1")}
            value={formData[key]}
            onChange={handleInputChange}
            style={{ padding: "10px", fontSize: "14px", border: "1px solid #333", borderRadius: "8px", background: "#222", color: "#f5f5f5" }}
          />
        ))}
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#1a1a1a", borderRadius: "10px", overflow: "hidden" }}>
        <thead>
          <tr style={{ backgroundColor: "#333", color: "#fff" }}>
            <th style={{ padding: "10px" }}>Category</th>
            <th style={{ padding: "10px" }}>Condition</th>
            <th style={{ padding: "10px" }}>Time</th>
            <th style={{ padding: "10px" }}>Status</th>
          </tr>
        </thead>

        <tbody>
          {Object.keys(categories).map((category) =>
            categories[category].map((condition, index) => {
              const key = `${category}-${condition}`;
              const active = timers[key];
              const totalMs = getTotalMs(key);
              const isRecent = recentStopped === key;


              return (
                <tr key={key} style={{ backgroundColor: isRecent ? "#664400" : active ? "#332222" : "#111", borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "8px", color: "#ff6666" }}>{index === 0 ? category : ""}</td>

                  <td style={{ padding: "8px" }}>
                    <button
                      onClick={() => handleConditionClick(category, condition)}
                      style={{
                        padding: "8px 12px",
                        fontSize: "14px",
                        backgroundColor: active ? "#e74c3c" : "#27ae60",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        boxShadow: active ? "0 0 10px #ff3333" : "0 0 6px #00ff99"
                      }}
                    >
                      {condition} {active ? "⏱" : ""}
                    </button>
                  </td>

                  <td style={{ textAlign: "center", padding: "8px", color: "#f5f5f5" }}>{formatTime(totalMs)}</td>

                  <td style={{ textAlign: "center", padding: "8px", color: active ? "#00ff99" : "#aaa" }}>
                    {active ? "Running" : isRecent ? "Stopped" : ""}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Comments */}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <textarea
          placeholder="📝 Enter comments here..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows="3"
          style={{ width: "90%", padding: "10px", fontSize: "14px", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: "8px", resize: "none" }}
        />
      </div>

      {/* Buttons */}
      <div style={{ marginTop: "25px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
        {Object.keys(categories).map((category) => (
          <button
            key={category}
            onClick={() => resetCategory(category)}
            style={{ padding: "10px 15px", backgroundColor: "#ff9900", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >
            Reset {category}
          </button>
        ))}

        <button
          onClick={stopAll}
          style={{ padding: "15px 25px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}
        >
          ⏹ Stop All
        </button>

        <button
          onClick={exportCSV}
          style={{ padding: "15px 25px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}
        >
          📁 Export CSV
        </button>
      </div>
    </div>
  );


export default App;
