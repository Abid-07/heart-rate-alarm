# Heart Rate Alarm

An active wake-up alarm for Zepp OS smartwatches (Amazfit Bip 6). Disarms only when your heart rate rises **+15 BPM** above your waking baseline.

- **Smart Baseline:** 20s two-phase noise-filtered PPG calibration.
- **Zero Overnight Drain:** Native `@zos/alarm` hardware scheduling.

## Quick Start

```bash
# Install Zeus CLI
npm install -g @zeppos/zeus-cli

# Build package
zeus build

# Preview / Install on watch
zeus preview
```
