# NUST Maize Yield Web Portal Client (`/web`)

A modernized, responsive dark-mode dashboard portal gated by authorized credentials. 

---

## 1. Parameter Explanations

To ensure correct interpretation of predictions, the dashboard uses three key biophysical and statistical indicators:

### A. Quantile Yield Forecast Range (kg/ha)
This represents the probabilistic yield output of the hybrid model:
*   **Low (q10 - 10th percentile)**: The worst-case yield estimate under severe climate pressure. There is a 90% probability that final yields will exceed this bound.
*   **Median (q50 - 50th percentile)**: The most likely yield outcome, representing standard agricultural performance.
*   **High (q90 - 90th percentile)**: The best-case yield potential under optimal rainfall and soil conservation conditions. Only a 10% probability exists of exceeding this upper bound.

### B. Water Deficit Index
Calculated from precipitation deficits and crop evapotranspiration coefficients, this index measures the moisture stress level of the plant. A higher index indicates severe physiological water stress, which limits vegetative development.

### C. Heat Accumulation Stress
Represents the thermal crop stress calculated from ambient air and land surface temperatures relative to the maize baseline limit ($10^\circ\text{C}$). Values exceeding standard thresholds signify metabolic decay, causing reduced grain-filling.

---

## 2. System Architecture Guide

### Functional Components
*   **Credentials Authenticator**: Verifies inputs against the authorization database stored in the shared `localStorage` array. Hitting `Enter` in input boxes submits choices.
*   **Location Ward Selector**: Maps specific clay, sand, and soil attributes according to the selected Umzingwane Ward centroid.
*   **Cultivar ID Guard**: Validates crop variety inputs, allowing only calibrated crop codes (`SC301`, `SC436`, `SC529`, and `SC719`). Inputs outside this list trigger a warning modal.
*   **Forecasting Sliders**: Inputs to adjust Precipitation and Heat Stress values in real-time.
*   **HTML5 Canvas Renderers**: Draws the 3-column yield quantile bar charts and the circular biophysical stress gauges dynamically.
*   **HTML Report Downloader**: Compiles current parameters, yield envelopes, and agronomic advice into a styled, printable HTML report file.
*   **Logout Button**: Clears the active session and locks the screen under the login gate.

### Non-Functional Components
*   **Fluid Responsiveness**: Adapts dynamically across Desktop ($>1024\text{px}$), Tablet ($768\text{px}\text{--}1024\text{px}$), and Mobile ($<768\text{px}$) viewports.
*   **Offline Calculation Fallback**: Automatically computes predictions browser-side using local mathematical models if the central Flask API is offline.
*   **Zero-State Security**: Re-hides credentials fields upon logout.

---

## 3. Step-by-Step Vercel Hosting Guide

Vercel provides free, high-performance hosting for static web projects. Follow these steps to host this web platform:

### Method A: Deploying via Vercel Command Line Interface (CLI)

1.  **Install Node.js & Vercel CLI**:
    Make sure Node.js is installed, then open your terminal and run:
    ```bash
    npm install -g vercel
    ```
2.  **Navigate to the Web Folder**:
    ```bash
    cd deployment_channels/web
    ```
3.  **Trigger Deployment**:
    Run the deployment command:
    ```bash
    vercel
    ```
4.  **Configure Prompts**:
    The CLI will prompt you to set up your project:
    *   *Set up and deploy?* Type `y` and hit Enter.
    *   *Which scope?* Select your personal account.
    *   *Link to existing project?* Type `n` (to create a new project).
    *   *What’s your project name?* Type `nust-maize-yield-web`.
    *   *In which directory is your code located?* Press Enter (default `./`).
    *   *Want to modify settings?* Type `n` (Vercel automatically detects the static configuration).
5.  **Access Web URL**:
    Once complete, Vercel will output a live URL (e.g. `https://nust-maize-yield-web.vercel.app`).

### Method B: Deploying via Vercel Web Dashboard (Git Integration)

1.  Push the project code to a public or private repository on **GitHub**, **GitLab**, or **Bitbucket**.
2.  Sign in to [Vercel](https://vercel.com) using your Git account.
3.  On the Vercel Dashboard, click **Add New** -> **Project**.
4.  Import your repository from the listed Git accounts.
5.  In the project configuration:
    *   Set **Root Directory** to `deployment_channels/web`.
    *   Keep Build and Development settings as default.
6.  Click **Deploy**. Vercel will automatically build the site and deploy updates every time you push code to your repository.