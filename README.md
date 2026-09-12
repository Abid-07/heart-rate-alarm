# Zepp OS Heart Rate Alarm

An active wake-up alarm application for Zepp OS smartwatches (Amazfit Bip 6 and compatible devices). 

Unlike traditional alarms that can be dismissed while half-asleep, this alarm uses continuous optical heart rate tracking and only disarms when you get up and elevate your heart rate by **+15 BPM** above your resting baseline.

---

## Key Features

- **20-Second Two-Phase Calibration:**
  - **0s – 10s (Sensor Warmup):** Discards initial PPG optical noise.
  - **10s – 20s (Stable Sampling):** Collects clean heart rate readings to calculate your true resting waking average.
  - **Silent Calibration:** Stays completely silent during calibration so your resting pulse isn't spiked by motor vibration.

- **Scientific Orthostatic Disarm Condition:**
  - Disarms only when live heart rate reaches **`Waking Baseline + 15 BPM`**.

- **Zero Overnight Battery Drain:**
  - Uses native Zepp OS system alarms (`@zos/alarm`). All active timers and sensor loops are stopped while waiting, allowing the watch to sleep with 0% battery drain until the alarm time arrives.

- **Live Pulse Feedback & Display Lock:**
  - Displays live BPM updates and pulse indicators.
  - Keeps the watch screen illuminated during active alarm mode (`@zos/display`).

---

## App Structure

```
├── app.json                       # App manifest and targets
├── app.js                         # Application lifecycle entry point
├── page/
│   └── index.js                   # Main UI, time selector, HR calibration & alarm engine
└── assets/
    └── 390x450-amazfit-bip-6/
        └── icon.png               # Target device app icon
```

---

## Build & Preview

```bash
# Install Zeus CLI globally if not installed
npm install -g @zeppos/zeus-cli

# Build package
zeus build

# Preview on Amazfit Bip 6
zeus preview --target "Amazfit Bip 6"
```