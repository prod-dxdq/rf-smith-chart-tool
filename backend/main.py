from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import math

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
