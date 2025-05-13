from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math
import joblib
import os

model_path = os.path.join(os.path.dirname(__file__), "match_model.pkl")
match_model = joblib.load(model_path)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RFInput(BaseModel):
    frequency: float
    z_real: float
    z_imag: float

@app.post("/match")
def suggest_matching(input: RFInput):
    z0 = 50
    z = complex(input.z_real, input.z_imag)
    freq = input.frequency * 1e9  # GHz → Hz
    gamma = (z - z0) / (z + z0)

    # Dummy gamma_path (Z to Z0)
    path = []
    steps = 10
    for i in range(steps + 1):
        interp_z = z + (z0 - z) * i / steps
        g = (interp_z - z0) / (interp_z + z0)
        path.append([g.real, g.imag])

    # L-match calc
    R = input.z_real
    X = input.z_imag
    match_info = {}

    if R < z0:
        # Series inductor, shunt capacitor
        Q = math.sqrt((z0 / R) - 1)
        Xs = Q * z0
        Xp = R * Q

        L = Xs / (2 * math.pi * freq)
        C = 1 / (2 * math.pi * freq * Xp)

        match_info = {
            "type": "L-match (R < Z0)",
            "series_inductor_nH": round(L * 1e9, 2),
            "shunt_capacitor_pF": round(C * 1e12, 2),
        }

    elif R > z0:
        # Series capacitor, shunt inductor
        Q = math.sqrt((R / z0) - 1)
        Xs = z0 * Q
        Xp = R / Q

        C = 1 / (2 * math.pi * freq * Xs)
        L = Xp / (2 * math.pi * freq)

        match_info = {
            "type": "L-match (R > Z0)",
            "series_capacitor_pF": round(C * 1e12, 2),
            "shunt_inductor_nH": round(L * 1e9, 2),
        }

    else:
        match_info = {
            "type": "No match needed",
        }

    return {
        "matching_type": "l-match",
        "gamma_path": path,
        "components": match_info
    }

@app.post("/sweep")
def sweep_reflection(input: RFInput):
    z0 = 50
    z = complex(input.z_real, input.z_imag)
    f_start = input.frequency * 1e9 * 0.8
    f_stop = input.frequency * 1e9 * 1.2  # Fixed typo here
    points = 101

    sweep_data = []

    for i in range(points):
        f = f_start + (f_stop - f_start) * i / (points - 1)
        gamma = (z - z0) / (z + z0)
        mag = abs(gamma)
        sweep_data.append({
            "frequency": round(f / 1e9, 3),  # GHz
            "gamma_mag": round(mag, 4)
        })

    return {"sweep": sweep_data}

@app.post("/sparams")
def calculate_sparams(input: RFInput):
    z0 = 50
    z = complex(input.z_real, input.z_imag)

    # Assume simple series impedance load, 2-port model:
    # Example: S11 = Γ, S21 = 1 - |Γ|^2, S12 = S21, S22 = 0 (for now)
    gamma = (z - z0) / (z + z0)
    s11 = gamma
    s21 = math.sqrt(1 - abs(gamma)**2)  # Ideal passive case
    s12 = s21
    s22 = 0  # No output reflection for one-port network

    return {
        "S11": [round(s11.real, 4), round(s11.imag, 4)],
        "S21": round(s21, 4),
        "S12": round(s12, 4),
        "S22": [0.0, 0.0]
    }

@app.post("/predict")
def predict_match(input: RFInput):
    features = [[input.z_real, input.z_imag, input.frequency * 1e9]]
    prediction = match_model.predict(features)
    return {"recommended_match_type": prediction[0]}
