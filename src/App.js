import React, { useState, useEffect } from "react";
import * as faceapi from "face-api.js";

// Replace this with your deployed backend URL
const BACKEND_URL = "https://ride-logger-backend-2.onrender.com/";

const categories = {
  Weather: ["Sunny", "Low Sun", "Cloudy", "Rain", "Fog", "Snow"],
  "Road Type": ["City", "Country", "Highway", "Construction Site", "Tunnel"],
  Lighting: ["Day", "Dawn", "Lit Night", "Dark Night"],
  Traffic: ["Flow", "Jam"],
  Speed: [
    "0-2 mph",
    "3-18 mph",
    "19-37 mph",
    "38-55 mph",
    "56-80 mph",
    "81-155 mph"
  ]
};

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const FaceLockLogger = () => {
  // 🔒 Face lock states
  const [locked, setLocked] = useState(true);
  const [videoRef, setVideoRef] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // 🏁 Ride Logger states
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

  const [notified30, setNotified30] = useState(false);
  const [notified40, setNotified40] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerColor, setBannerColor] = useState("");

  // 🔹 Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  // 🔹 Force re-render every second for timers
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Alerts logic
  const sessionMinutes = sessionStart ? Math.floor((Date.now() - sessionStart) / 60000) : 0;
  useEffect(() => {
    if (!sessionStart) return;
    if (sessionMinutes === 30 && !notified30) {
      setBannerMessage("⏰ 30 minutes reached!");
      setBannerColor("yellow");
      setNotified30(true);
    }
    if (sessionMinutes === 40 && !notified40) {
      setBannerMessage("⏰ 40 minutes reached!");
      setBannerColor("red");
      setNotified40(true);
      setTimeout(() => { setBannerMessage(""); setBannerColor(""); }, 5000);
    }
  }, [sessionMinutes, sessionStart, notified30, notified40]);

  // 🔹 Camera
  const startCamera = async (video) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  // 🔹 Face functions
  const registerFace = async () => {
    if (!videoRef) return;
    const detection = await faceapi
      .detectSingleFace(videoRef, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return alert("No face detected");

    await fetch(`${BACKEND_URL}/register-face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor: Array.from(detection.descriptor) }),
    });

    alert("✅ Face registered!");
  };

  const verifyFace = async () => {
    if (!videoRef) return;
    const detection = await faceapi
      .detectSingleFace(videoRef, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return alert("No face detected");

    const res = await fetch(`${BACKEND_URL}/verify-face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor: Array.from(detection.descriptor) }),
    });

    const data = await res.json();
    if (data.error) return alert(data.error);

    const savedDescriptor = new Float32Array(data.storedDescriptor);
    const distance = faceapi.euclideanDistance(detection.descriptor, savedDescriptor);
    if (distance < 0.6) setLocked(false);
    else alert("Face not recognized");
  };

  // 🔹 Ride Logger functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleConditionClick = (category, condition) => {
    if (!sessionStart) setSessionStart(new Date());
    const key = `${category}-${condition}`;
    setTimers(prev => {
      const updated = { ...prev };
      let stoppedKey = "";

      categories[category].forEach(cond => {
        const k = `${category}-${cond}`;
        if (k !== key && updated[k]) {
          const duration = Date.now() - updated[k];
          setLogs(l => ({ ...l, [k]: (l[k] || 0) + duration }));
          delete updated[k];
          stoppedKey = k;
        }
      });

      if (updated[key]) {
        const duration = Date.now() - updated[key];
        setLogs(l => ({ ...l, [key]: (l[key] || 0) + duration }));
        delete updated[key];
        stoppedKey = key;
      } else updated[key] = Date.now();

      if (stoppedKey) {
        setRecentStopped(stoppedKey);
        setTimeout(() => setRecentStopped(""), 2000);
      }

      return updated;
    });
  };

  const resetCategory = (category) => {
    const updatedLogs = { ...logs };
    const updatedTimers = { ...timers };
    categories[category].forEach(cond => {
      const key = `${category}-${cond}`;
      delete updatedLogs[key];
      delete updatedTimers[key];
    });
    setLogs(updatedLogs);
    setTimers(updatedTimers);
  };

  const stopAll = () => {
    const updatedLogs = { ...logs };
    Object.keys(timers).forEach(key => {
      const duration = Date.now() - timers[key];
      updatedLogs[key] = (updatedLogs[key] || 0) + duration;
    });
    setLogs(updatedLogs);
    setTimers({});
  };

  const exportCSV = () => {
    if (!sessionStart) return alert("Start session first");
    stopAll();
    const sessionEnd = new Date();
    const sessionDurationMs = sessionEnd - sessionStart;

    const now = new Date();
    const pad = n => n.toString().padStart(2, "0");
    const fileName = `RideData_${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.csv`;

    let csv = "Ride Data Logger Report\n\n";
    Object.keys(formData).forEach(f => csv += `${f},${formData[f]}\n`);
    csv += `Session Start,${sessionStart.toLocaleString()}\n`;
    csv += `Session End,${sessionEnd.toLocaleString()}\n`;
    csv += `Session Duration,${formatTime(sessionDurationMs)}\n\n`;
    csv += "Category,Condition,Minutes\n";

    for (let key in logs) {
      const split = key.indexOf("-");
      const cat = key.slice(0, split);
      const cond = key.slice(split+1);
      csv += `${cat},${cond},${formatTime(logs[key])}\n`;
    }

    if (comment.trim()) csv += `\nComment,${comment.replace(/,/g," ")}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const getTotalMs = key => {
    const base = logs[key] || 0;
    const running = timers[key] ? Date.now() - timers[key] : 0;
    return base + running;
  };

  // 🔒 LOCK SCREEN UI
  if (locked) {
    return (
      <div style={{ textAlign: "center", padding: "30px" }}>
        <h2>🔒 Face Authentication Required</h2>
        {!modelsLoaded && <p>Loading face models...</p>}

        <video
          autoPlay
          muted
          ref={(ref) => {
            if (ref && !videoRef) {
              setVideoRef(ref);
              startCamera(ref);
            }
          }}
          width="300"
          style={{ borderRadius: "10px", marginBottom: "10px" }}
        />

        <div>
          <button onClick={registerFace}>Register Face</button>
          <button onClick={verifyFace} style={{ marginLeft: "10px" }}>
            Unlock
          </button>
        </div>
      </div>
    );
  }

  // ✅ UNLOCKED → Ride Logger UI
  return (
    <div style={{ padding: "25px", fontFamily: "Segoe UI, sans-serif", backgroundColor: "#0d0d0d", color: "#f5f5f5", minHeight: "100vh" }}>
      {/* ALERT BANNER */}
      {bannerMessage && (
        <div style={{
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
        }}>
          {bannerMessage}
        </div>
      )}

      <h1 style={{ textAlign: "center", color: "#ff3333", textShadow: "0 0 10px #ff0000" }}>
        🚗 Ride Data Logger
      </h1>

      {/* Info Form */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", backgroundColor: "#1a1a1a", padding: "15px", borderRadius: "10px", marginBottom: "20px", boxShadow: "0 0 10px #111" }}>
        {Object.keys(formData).map(key => (
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

      {/* Table of categories/conditions */}
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
          {Object.keys(categories).map(category =>
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
                  <td style={{ textAlign: "center", padding: "8px", color: active ? "#00ff99" : isRecent ? "#aaa" : "" }}>
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
        {Object.keys(categories).map(category => (
          <button key={category} onClick={() => resetCategory(category)} style={{ padding: "10px 15px", backgroundColor: "#ff9900", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>
            Reset {category}
          </button>
        ))}

        <button onClick={stopAll} style={{ padding: "15px 25px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}>
          ⏹ Stop All
        </button>

        <button onClick={exportCSV} style={{ padding: "15px 25px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: "10px", cursor: "pointer" }}>
          📁 Export CSV
        </button>
      </div>
    </div>
  );
};

export default FaceLockLogger;
