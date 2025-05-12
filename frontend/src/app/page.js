"use client";
import { useState } from "react";
import axios from "axios";
import { create, all } from "mathjs";

const math = create(all);

export default function Home() {
  const [form, setForm] = useState({
    frequency: "",
    z_real: "",
    z_imag: "",
  });
  const [result, setResult] = useState(null);
  const [clickedPoint, setClickedPoint] = useState(null);
  const [gammaPath, setGammaPath] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.frequency || !form.z_real || !form.z_imag) {
      setResult({ error: "All fields are required" });
      return;
    }

    try {
      const res = await axios.post("http://127.0.0.1:8000/match", {
        frequency: parseFloat(form.frequency),
        z_real: parseFloat(form.z_real),
        z_imag: parseFloat(form.z_imag),
      });
      setResult(res.data);
      setGammaPath(res.data.gamma_path);
    } catch (err) {
      console.error(err);
      setResult({ error: "Something went wrong. Please check your input." });
    }
  };

  const handleChartClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const r = rect.width / 2;

    const re = (x - cx) / r;
    const im = -(y - cy) / r;

    if (Math.sqrt(re ** 2 + im ** 2) > 1) return;

    const gamma = math.complex(re, im);
    const z = math.multiply(50, math.divide(math.add(1, gamma), math.subtract(1, gamma)));

    setForm({
      ...form,
      z_real: z.re.toFixed(2),
      z_imag: z.im.toFixed(2),
    });

    setClickedPoint({
      left: `${(re + 1) * 50}%`,
      top: `${(1 - im) * 50}%`,
    });
  };

  const generatePathD = () => {
    if (!gammaPath || gammaPath.length === 0) return "";
    const cx = 200; // Center of the Smith chart (SVG coordinates)
    const cy = 200;
    const r = 200; // Radius of the Smith chart

    return gammaPath
      .map(([re, im], index) => {
        const x = cx + re * r;
        const y = cy - im * r;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const generateSmithChartGrid = () => {
    const cx = 200; // Center of the Smith chart (SVG coordinates)
    const cy = 200;
    const r = 200; // Radius of the Smith chart
    const gridLines = [];

    // Draw constant resistance circles
    const resistanceValues = [0.2, 0.5, 1, 2, 5];
    resistanceValues.forEach((rVal) => {
      const radius = (r / (1 + rVal)) * 2;
      const centerX = cx - radius / 2;
      gridLines.push(
        <circle
          key={`r-${rVal}`}
          cx={centerX}
          cy={cy}
          r={radius / 2}
          fill="none"
          stroke="gray"
          strokeWidth="0.5"
        />
      );
    });

    // Draw constant reactance arcs
    const reactanceValues = [0.2, 0.5, 1, 2, 5];
    reactanceValues.forEach((xVal) => {
      const radius = r / xVal;
      const startAngle = Math.atan(1 / xVal);
      const endAngle = Math.PI - startAngle;

      const startX = cx + r * Math.cos(startAngle);
      const startY = cy - r * Math.sin(startAngle);
      const endX = cx + r * Math.cos(endAngle);
      const endY = cy - r * Math.sin(endAngle);

      gridLines.push(
        <path
          key={`x-${xVal}`}
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
          fill="none"
          stroke="gray"
          strokeWidth="0.5"
        />
      );

      // Negative reactance arcs
      gridLines.push(
        <path
          key={`x--${xVal}`}
          d={`M ${startX} ${2 * cy - startY} A ${radius} ${radius} 0 0 0 ${endX} ${2 * cy - endY}`}
          fill="none"
          stroke="gray"
          strokeWidth="0.5"
        />
      );
    });

    return gridLines;
  };

  return (
    <main className="p-8 max-w-lg mx-auto bg-gradient-to-r from-blue-50 to-blue-100 shadow-xl rounded-lg">
      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-700">
        RF Matching Tool
      </h1>

      <div className="space-y-6">
        {["frequency", "z_real", "z_imag"].map((field, i) => (
          <div key={i}>
            <label className="block text-blue-900 font-semibold mb-2 capitalize">
              {field === "z_real" ? "Real(Z)" : field === "z_imag" ? "Imag(Z)" : "Frequency (GHz)"}
            </label>
            <input
              type="number"
              name={field}
              value={form[field]}
              onChange={handleChange}
              className="border border-blue-400 bg-white text-blue-900 px-4 py-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white font-bold px-4 py-2 rounded hover:bg-blue-700 transition duration-200 shadow-md"
        >
          Match
        </button>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-4">
          Smith Chart
        </h2>
        <div className="relative w-[400px] h-[400px] mx-auto">
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full border shadow-md rounded-full cursor-crosshair bg-white"
            onClick={handleChartClick}
          >
            {/* Add the static Smith chart background image */}
            <image
              href="/smith-chart.png" // Correct path to the image in the public folder
              x="0"
              y="0"
              width="400"
              height="400"
            />

            {/* Draw the Smith chart grid */}
            {generateSmithChartGrid()}

            {/* Draw the gamma path */}
            <path d={generatePathD()} stroke="red" fill="none" strokeWidth="2" />

            {/* Draw the outer circle */}
            <circle cx="200" cy="200" r="200" fill="none" stroke="black" strokeWidth="1" />
          </svg>
          {clickedPoint && (
            <div
              className="absolute w-3 h-3 bg-red-600 rounded-full pointer-events-none border border-white"
              style={{
                left: clickedPoint.left,
                top: clickedPoint.top,
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
        </div>
      </div>

      {result && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">Results</h2>
          <div className="space-y-4 text-blue-900 text-sm">
            <div>
              <p><strong>Match Type:</strong> {result.matching_type}</p>
              <p><strong>Gamma Path:</strong></p>
              <ul className="bg-gray-100 p-4 rounded font-mono space-y-1 max-h-60 overflow-y-auto">
                {result.gamma_path.map((g, i) => (
                  <li key={i}>
                    Step {i}: Γ = {g[0].toFixed(3)} + j{g[1].toFixed(3)}
                  </li>
                ))}
              </ul>
            </div>

            {result.components && (
              <div className="bg-gray-50 p-4 rounded border">
                <p className="font-semibold mb-2 text-blue-700">Matching Network:</p>
                <ul className="list-disc ml-4">
                  {Object.entries(result.components).map(([key, val]) => (
                    <li key={key}>
                      {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}: {val}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
