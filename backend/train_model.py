# backend/train_model.py
import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier # type: ignore

# Generate training data
X = []
y = []
z0 = 50

frequencies = [1e9, 2.4e9, 5e9, 10e9]
for freq in frequencies:
    for R in np.linspace(5, 100, 20):
        for Xval in np.linspace(-50, 50, 20):
            Z = complex(R, Xval)
            # Rule-based label
            if R < z0:
                label = "L-match"
            elif R > z0 and abs(Xval) < 20:
                label = "stub"
            elif abs(Xval) > 30:
                label = "pi"
            else:
                label = "direct"
            X.append([R, Xval, freq])
            y.append(label)

# Train model
model = RandomForestClassifier()
model.fit(X, y)

# Save it
joblib.dump(model, "match_model.pkl")
print("✅ Model trained and saved as match_model.pkl")
