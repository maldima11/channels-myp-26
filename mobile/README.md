# NUST Maize Yield Mobile View Component (`/mobile`)

A cross-platform React Native screen component designed to run on both iOS and Android.

---

## 1. Parameter Explanations

### A. Quantile Yield Forecast Range (kg/ha)
Represents the bounds of forecast output:
*   **Low (q10)**: 10th percentile worst-case boundary. 90% probability that yields will be higher.
*   **Median (q50)**: 50th percentile most-likely crop outcome.
*   **High (q90)**: 90th percentile best-case potential yield.

### B. Water Deficit Index
Percentage indicator representing moisture stress. High values mean severe drought damage.

### C. Heat Accumulation Stress
Thermal decay index recording GDD heat damage above baseline.

---

## 2. Multi-Platform Support (iOS & Android)

The codebase utilizes standard cross-platform React Native components with no platform-specific dependencies, ensuring compatibility with both **iOS Simulators** and **Android Emulators**:

*   **Dynamic API Routing**: 
    The app automatically handles localhost mapping differences depending on the platform using the React Native `Platform` utility:
    *   **Android Emulator**: Routes API requests to `http://10.0.2.2:5000/api/predict` (which maps to the host's localhost loopback).
    *   **iOS Simulator**: Routes API requests to `http://localhost:5000/api/predict`.
*   **Touch Optimizations**: Form inputs utilize standard native selectors and custom increment buttons for easy touch interactions on touchscreens.

---

## 3. Running & Testing
1. Navigate to the mobile directory:
   ```bash
   cd deployment_channels/mobile
   ```
2. Launch the app:
   * **iOS Simulator**: `npm run ios`
   * **Android Emulator**: `npm run android`
   * **Xcode Project**: Open `ios/NustYieldMobile.xcworkspace` in Xcode and hit the Play button.