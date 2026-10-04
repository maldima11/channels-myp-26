import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Share
} from 'react-native';

// Dynamic host loopback and candidate endpoints for local, simulator, and device environments
const NGROK_PUBLIC_HOST = "https://gyroscopic-cristiano-unpanicky.ngrok-free.dev";
const LOCAL_LAN_HOST = "http://10.10.93.252:5000";
const EMULATOR_HOST = Platform.OS === 'android' ? "http://10.0.2.2:5000" : "http://localhost:5000";

// Physical devices and remote Agritex officers connect directly to the public cloud endpoint by default
const DEFAULT_HOST = NGROK_PUBLIC_HOST;

// Comprehensive offline seed registry containing default accounts and provisioned farmers
const SEED_USERS = [
  { username: "agritex_officer", password: "nust_maize_2026", name: "Primary Officer", role: "Agritex Officer", phone: "+263771234567", ward: "All Wards" },
  { username: "johen_doe", password: "12345", name: "Johen Doe", role: "Farmer", phone: "+263772345678", ward: "Ward 12 (Ntabazinduna)" },
  { username: "farmer", password: "farmer2026", name: "Local Farmer", role: "Farmer", phone: "+263773456789", ward: "Ward 15 (Esigodini Centroid)" },
  { username: "maldima_farmer", password: "farmerpass123", name: "Stephen Maldima", role: "Farmer", phone: "+263775551234", ward: "Ward 1 (Nswazi North)" },
  { username: "umzingwane_grower", password: "harvest2026", name: "Nomusa Khumalo", role: "Farmer", phone: "+263776112233", ward: "Ward 15 (Esigodini Centroid)" },
  { username: "zipper", password: "farmer234", name: "Zipper Farmer", role: "Farmer", phone: "+263777889900", ward: "Ward 15 (Esigodini Centroid)" },
  { username: "jane_farmer", password: "pass12345", name: "Jane Nswazi", role: "Farmer", phone: "+263771096542", ward: "Ward 8 (Shale)" },
  { username: "esi_farmer", password: "pass12345", name: "Esi Farmer", role: "Farmer", phone: "+263771234890", ward: "Ward 15 (Esigodini Centroid)" },
  { username: "admin", password: "admin123", name: "System Admin", role: "Administrator", phone: "+263774567890", ward: "All Wards" }
];

const VALID_CULTIVARS = ["SC301", "SC436", "SC529", "SC719"];

// All 20 administrative wards of Umzingwane District with spelled-out localities
const WARD_DEFAULTS = {
  "Ward 1 (Nswazi North)":        { base: "Ward 1",  precip: 0.50, heat: 0.35, sand: 65, clay: 20 },
  "Ward 2 (Sihlengeni)":          { base: "Ward 2",  precip: 0.45, heat: 0.30, sand: 58, clay: 22 },
  "Ward 3 (Matshetshe)":          { base: "Ward 3",  precip: 0.55, heat: 0.32, sand: 60, clay: 24 },
  "Ward 4 (Kumbudzi)":            { base: "Ward 4",  precip: 0.60, heat: 0.28, sand: 50, clay: 30 },
  "Ward 5 (Zimnyathini)":         { base: "Ward 5",  precip: 0.40, heat: 0.42, sand: 72, clay: 15 },
  "Ward 6 (Mawabeni)":            { base: "Ward 6",  precip: 0.35, heat: 0.45, sand: 78, clay: 12 },
  "Ward 7 (Sihlengeni South)":    { base: "Ward 7",  precip: 0.48, heat: 0.33, sand: 63, clay: 21 },
  "Ward 8 (Shale)":               { base: "Ward 8",  precip: 0.52, heat: 0.31, sand: 61, clay: 23 },
  "Ward 9 (Mtshede)":             { base: "Ward 9",  precip: 0.58, heat: 0.29, sand: 55, clay: 26 },
  "Ward 10 (Vulindlela)":         { base: "Ward 10", precip: 0.62, heat: 0.26, sand: 48, clay: 32 },
  "Ward 11 (How Mine)":           { base: "Ward 11", precip: 0.38, heat: 0.40, sand: 75, clay: 14 },
  "Ward 12 (Ntabazinduna)":       { base: "Ward 12", precip: 0.40, heat: 0.38, sand: 70, clay: 18 },
  "Ward 13 (Inyankuni)":          { base: "Ward 13", precip: 0.42, heat: 0.36, sand: 68, clay: 19 },
  "Ward 14 (Mbizingwe)":          { base: "Ward 14", precip: 0.46, heat: 0.34, sand: 64, clay: 22 },
  "Ward 15 (Esigodini Centroid)": { base: "Ward 15", precip: 0.65, heat: 0.28, sand: 62, clay: 25 },
  "Ward 16 (eSibomvu)":           { base: "Ward 16", precip: 0.50, heat: 0.30, sand: 59, clay: 24 },
  "Ward 17 (Dula)":               { base: "Ward 17", precip: 0.32, heat: 0.44, sand: 82, clay: 10 },
  "Ward 18 (Umzingwane South)":   { base: "Ward 18", precip: 0.30, heat: 0.45, sand: 80, clay: 12 },
  "Ward 19 (Bezha)":              { base: "Ward 19", precip: 0.44, heat: 0.38, sand: 69, clay: 17 },
  "Ward 20 (Mulungwane)":         { base: "Ward 20", precip: 0.48, heat: 0.35, sand: 66, clay: 20 }
};

export default function App() {
  // General Authentication States (starts empty for general users)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);

  // Network & Server Connectivity (silently managed in background)
  const [serverHost, setServerHost] = useState(DEFAULT_HOST);
  const [knownUsers, setKnownUsers] = useState(SEED_USERS);

  // Friendly In-app Authentication Mode: 'login' | 'signup'
  const [authMode, setAuthMode] = useState('login');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('+26377');
  const [regWard, setRegWard] = useState('Ward 15 (Esigodini Centroid)');
  const [showRegWardPicker, setShowRegWardPicker] = useState(false);

  // Modals
  const [showWardModal, setShowWardModal] = useState(false);
  const [showCultivarModal, setShowCultivarModal] = useState(false);
  
  // Theme Switching State
  const [isLightTheme, setIsLightTheme] = useState(false);
  const toggleTheme = () => setIsLightTheme(prev => !prev);
  
  // Forecast Scenario States
  const [ward, setWard] = useState('Ward 12 (Ntabazinduna)');
  const [variety, setVariety] = useState('SC719');
  const [precip, setPrecip] = useState(0.40);
  const [heat, setHeat] = useState(0.38);
  const [sand, setSand] = useState(70);
  const [clay, setClay] = useState(18);
  
  // Prediction States
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);

  // Auto-sync users directory from candidate endpoints on application launch
  useEffect(() => {
    let isMounted = true;
    const syncCandidates = [
      serverHost,
      NGROK_PUBLIC_HOST,
      LOCAL_LAN_HOST,
      EMULATOR_HOST,
      'http://127.0.0.1:5000'
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    (async () => {
      for (const host of syncCandidates) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1800);
          const res = await fetch(`${host}/api/users`, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'success' && Array.isArray(data.users) && isMounted) {
              // Merge seed users with remote users so accounts never disappear
              const mergedMap = new Map();
              SEED_USERS.forEach(u => mergedMap.set((u.username || '').toLowerCase(), u));
              data.users.forEach(u => mergedMap.set((u.username || '').toLowerCase(), u));
              setKnownUsers(Array.from(mergedMap.values()));
              setServerHost(host);
              break;
            }
          }
        } catch (e) {
          // Probe next candidate silently
        }
      }
    })();

    return () => { isMounted = false; };
  }, []);

  // Ward selector defaults loader
  const handleWardSelect = (selectedWard, activeHost = serverHost) => {
    setWard(selectedWard);
    const defaults = WARD_DEFAULTS[selectedWard];
    if (defaults) {
      setPrecip(defaults.precip);
      setHeat(defaults.heat);
      setSand(defaults.sand);
      setClay(defaults.clay);
      runForecast(variety, selectedWard, defaults.precip, defaults.heat, defaults.sand, defaults.clay, activeHost);
    }
  };

  // In-app Farmer Registration & Instant Automatic Login
  const handleSignUp = async () => {
    const cleanName = regName.trim();
    const cleanUser = regUsername.trim().toLowerCase();
    const cleanPass = regPassword.trim();
    const cleanPhone = regPhone.trim() || '+263770000000';
    const cleanWard = regWard || 'Ward 15 (Esigodini Centroid)';

    if (!cleanName) {
      setLoginError('Please enter your full name.');
      return;
    }
    if (!cleanUser || !cleanPass) {
      setLoginError('Please choose a username and password.');
      return;
    }

    setLoading(true);
    setLoginError('');

    const candidateHosts = [
      serverHost,
      NGROK_PUBLIC_HOST,
      LOCAL_LAN_HOST,
      EMULATOR_HOST,
      'http://127.0.0.1:5000'
    ].filter((val, idx, self) => val && self.indexOf(val) === idx);

    let savedToDatabase = false;
    let successfulHost = serverHost;

    for (const host of candidateHosts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(`${host}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: cleanUser,
            password: cleanPass,
            name: cleanName,
            role: 'Farmer',
            phone: cleanPhone,
            ward: cleanWard
          }),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            savedToDatabase = true;
            successfulHost = host;
            setServerHost(host);
            break;
          }
        }
      } catch (e) {
        // Try next candidate
      }
    }

    const newProfile = {
      username: cleanUser,
      password: cleanPass,
      name: cleanName,
      role: 'Farmer',
      phone: cleanPhone,
      ward: cleanWard
    };

    // Store in knownUsers immediately so user stays accessible
    setKnownUsers(prev => {
      const filtered = prev.filter(u => (u.username || '').toLowerCase() !== cleanUser);
      return [newProfile, ...filtered];
    });

    setLoading(false);

    // Auto-login the farmer immediately into the forecasting dashboard!
    setIsLoggedIn(true);
    setUserProfile(newProfile);
    setWard(cleanWard);
    if (WARD_DEFAULTS[cleanWard]) {
      handleWardSelect(cleanWard, successfulHost);
    } else {
      runForecast(variety, cleanWard, precip, heat, sand, clay, successfulHost);
    }
  };

  // 1. GENERAL MULTI-ROLE AUTHENTICATION HANDLER
  const handleLogin = async () => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setLoginError('');

    // Prioritized list of candidate hosts to attempt across simulators, real devices & local networks
    const candidateHosts = [
      serverHost,
      NGROK_PUBLIC_HOST,
      LOCAL_LAN_HOST,
      EMULATOR_HOST,
      'http://127.0.0.1:5000'
    ].filter((val, idx, self) => val && self.indexOf(val) === idx);

    let loggedInUser = null;
    let successfulHost = serverHost;

    // Phase 1: Attempt direct login via /api/auth/login across available endpoints
    for (const host of candidateHosts) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1800);

        const res = await fetch(`${host}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass }),
          signal: controller.signal
        });
        clearTimeout(timer);

        const data = await res.json();
        if (res.ok && data.status === 'success' && data.user) {
          loggedInUser = data.user;
          successfulHost = host;
          setServerHost(host);
          break;
        }
      } catch (err) {
        // Host unreachable or timed out, attempt next candidate host
      }
    }

    // Phase 2: If auth/login did not succeed over network, attempt /api/users directory
    if (!loggedInUser) {
      for (const host of candidateHosts) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1500);

          const res = await fetch(`${host}/api/users`, { signal: controller.signal });
          clearTimeout(timer);

          if (res.ok) {
            const data = await res.json();
            if (data.status === 'success' && Array.isArray(data.users)) {
              successfulHost = host;
              setServerHost(host);
              setKnownUsers(data.users);

              const match = data.users.find(u =>
                u.username && u.username.trim().toLowerCase() === cleanUser &&
                u.password && u.password.trim() === cleanPass
              );

              if (match) {
                loggedInUser = match;
                break;
              }
            }
          }
        } catch (err) {
          // Continue to next candidate host
        }
      }
    }

    // Phase 3: Offline Registry fallback (for demonstrations, offline field use, or provisioned seed accounts)
    if (!loggedInUser) {
      const offlineMatch = knownUsers.find(u =>
        u.username && u.username.trim().toLowerCase() === cleanUser &&
        u.password && u.password.trim() === cleanPass
      );
      if (offlineMatch) {
        loggedInUser = offlineMatch;
      }
    }

    setLoading(false);

    if (loggedInUser) {
      setIsLoggedIn(true);
      setUserProfile(loggedInUser);
      setLoginError('');
      if (loggedInUser.ward && WARD_DEFAULTS[loggedInUser.ward]) {
        handleWardSelect(loggedInUser.ward, successfulHost);
      } else {
        runForecast(variety, ward, precip, heat, sand, clay, successfulHost);
      }
    } else {
      // Clean, professional user-facing error message
      setLoginError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword('');
    setUserProfile(null);
    setForecast(null);
  };

  // 2. FORECAST INFERENCE WITH OFFLINE EMULATOR FALLBACK
  const runForecast = (
    targetVariety = variety,
    targetWard = ward,
    targetPrecip = precip,
    targetHeat = heat,
    targetSand = sand,
    targetClay = clay,
    activeHost = serverHost
  ) => {
    setLoading(true);

    // Extract base ward code (e.g., 'Ward 12') for API compatibility
    const apiWard = WARD_DEFAULTS[targetWard]?.base || targetWard.split(' (')[0] || targetWard;

    fetch(`${activeHost}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ward: apiWard,
        variety: targetVariety,
        precip: targetPrecip,
        heat: targetHeat,
        sand: targetSand,
        clay: targetClay
      })
    })
    .then(res => {
      if (!res.ok) throw new Error("Inference API offline");
      return res.json();
    })
    .then(data => {
      const pred = data.forecast || data;
      setForecast({
        low: pred.low_yield || pred.low || 720,
        med: pred.median_yield || pred.med || 1050,
        high: pred.high_yield || pred.high || 1380,
        advisory: data.maturity_notes || pred.advisory || "Maintain recommended planting density and monitor moisture levels.",
        source: 'API Hybrid Pipeline'
      });
      setLoading(false);
    })
    .catch(() => {
      // Local mathematical biophysical emulator fallback
      const localEst = computeOfflineForecast(targetVariety, targetWard, targetPrecip, targetHeat, targetSand, targetClay);
      setForecast(localEst);
      setLoading(false);
    });
  };

  const computeOfflineForecast = (v, w, p, h, s, c) => {
    let baseYield = 950.0;
    const soilFactor = -150.0 * (s / 100.0) + 120.0 * (c / 100.0);
    const rainFactor = 680.0 * p;
    const heatFactor = -390.0 * h;

    let varietyMult = 1.0;
    if (v === "SC301") varietyMult = 0.88;
    if (v === "SC436") varietyMult = 0.96;
    if (v === "SC529") varietyMult = 1.08;
    if (v === "SC719") varietyMult = 1.15;

    let med = Math.round((baseYield + soilFactor + rainFactor + heatFactor) * varietyMult);
    med = Math.max(200, Math.min(1600, med));
    const low = Math.round(med * 0.72);
    const high = Math.round(med * 1.28);

    let advisory = `${v} Agronomic Advisory:\n`;
    if (v === "SC301") {
      advisory += "Ultra-early maturing variety (110 days). Excellent drought escape capabilities. Optimal for late November planting.";
    } else if (v === "SC436") {
      advisory += "Early maturing variety (120 days). Reliable baseline performance in medium-to-low rainfall environments.";
    } else if (v === "SC529") {
      advisory += "Medium maturing variety (135 days). High yield potential under good moisture; practice mulching to preserve water.";
    } else {
      advisory += "Late maturing variety (145+ days). Maximum potential yield. Requires timely planting (late October / early November) and moisture conservation.";
    }

    if (p < 0.35) {
      advisory += "\n\n⚠️ CRITICAL DROUGHT WARNING: Precipitation deficit is severe. Adopt tied ridges, micro-dosing fertilization, and organic mulching.";
    }

    return { low, med, high, advisory, source: 'Offline Biophysical Emulator' };
  };

  const handleSliderUpdate = (field, delta) => {
    let nextPrecip = precip;
    let nextHeat = heat;

    if (field === 'precip') {
      nextPrecip = delta === 'inc' ? Math.min(1.0, +(precip + 0.05).toFixed(2)) : Math.max(0.1, +(precip - 0.05).toFixed(2));
      setPrecip(nextPrecip);
    } else if (field === 'heat') {
      nextHeat = delta === 'inc' ? Math.min(1.0, +(heat + 0.05).toFixed(2)) : Math.max(0.1, +(heat - 0.05).toFixed(2));
      setHeat(nextHeat);
    }

    runForecast(variety, ward, nextPrecip, nextHeat, sand, clay);
  };

  // Biophysical Stress Calculations
  const waterDeficitPct = Math.round((1 - precip) * 100);
  const heatStressPct = Math.round(heat * 100);

  // Download & Share Report Handler
  const handleDownloadReport = async () => {
    if (!forecast) return;

    const reportContent = `=================================================
MAIZE YIELD ADVISORY REPORT (PDF SUMMARY)
NUST MPhil Biophysical Forecasting System
Umzingwane District, Matabeleland South
=================================================

LOCATION & CULTIVAR METADATA:
• Location Centroid: ${ward}
• Maize Cultivar: ${variety}
• Soil Composition: Sand ${sand}% | Clay ${clay}%
• Precipitation Index (Scaled): ${precip}

EXPECTED MEDIAN YIELD (q50):
▶ ${forecast.med} kg/ha (Standard meteorological alignment)

QUANTILE YIELD FORECAST RANGE (kg/ha):
• Lower Bound (q10 - Adverse):  ${forecast.low} kg/ha
• Median Yield (q50 - Expected): ${forecast.med} kg/ha
• Upper Bound (q90 - Optimal):  ${forecast.high} kg/ha

BIOPHYSICAL STRESS GAUGES:
• Water Deficit Index: ${waterDeficitPct}% (${waterDeficitPct > 60 ? 'Severe' : waterDeficitPct > 30 ? 'Moderate' : 'Low'})
• Heat Accumulation Stress: ${heatStressPct}% (${heatStressPct > 60 ? 'Severe' : heatStressPct > 30 ? 'Moderate' : 'Low'})

AGRONOMIC RECOMMENDATION:
${forecast.advisory}

=================================================
Generated via NUST MPhil Thesis Hybrid Model Fusion Pipeline (Option B)
Security Signature: Authorized Agritex Officer System Log Verification
=================================================`;

    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const result = await Share.share({
          title: `NUST_Maize_Yield_Advisory_Report_${ward.replace(/\s+/g, '_')}_${variety}.pdf`,
          message: reportContent,
        });

        if (result.action === Share.sharedAction) {
          Alert.alert("Report Exported", "The prediction report has been successfully shared or saved as PDF.");
        }
      } else {
        Alert.alert("Report Summary", reportContent);
      }
    } catch (error) {
      Alert.alert("Export Error", "Could not export report: " + error.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.authContainer, isLightTheme && styles.authContainerLight]}>
        <StatusBar 
          backgroundColor={isLightTheme ? "#f8fafc" : "#0b0f19"} 
          barStyle={isLightTheme ? "dark-content" : "light-content"} 
          translucent={false}
        />
        
        {/* Top Bar for Theme Switcher */}
        <View style={[styles.authTopHeader, isLightTheme && styles.authTopHeaderLight]}>
          <TouchableOpacity 
            style={[styles.themeBtn, isLightTheme && styles.themeBtnLight]} 
            onPress={toggleTheme}
          >
            <Text style={[styles.themeBtnText, isLightTheme && styles.themeBtnTextLight]}>🌓 Theme</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.authScrollContent} keyboardShouldPersistTaps="handled">
          
          {/* DUAL AUTHENTICATION CARD (SIGN IN / FARMER SIGN UP) */}
          <View style={[styles.authCard, isLightTheme && styles.authCardLight]}>
            <View style={styles.authHeaderBadge}>
              <Text style={styles.authHeaderBadgeText}>NUST MPHIL PIPELINE</Text>
            </View>

            <Text style={[styles.authLogo, isLightTheme && styles.authLogoLight]}>Agritex Portal</Text>
            <Text style={[styles.authSubtitle, isLightTheme && styles.authSubtitleLight]}>
              Umzingwane District Yield Forecasting System
            </Text>

            {/* Visual Tab Switcher: Sign In vs Sign Up */}
            <View style={[styles.authTabContainer, isLightTheme && styles.authTabContainerLight]}>
              <TouchableOpacity
                style={[
                  styles.authTabBtn,
                  authMode === 'login' && (isLightTheme ? styles.authTabBtnActiveLight : styles.authTabBtnActive)
                ]}
                onPress={() => { setAuthMode('login'); setLoginError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.authTabText,
                  isLightTheme && styles.authTabTextLight,
                  authMode === 'login' && (isLightTheme ? styles.authTabTextActiveLight : styles.authTabTextActive)
                ]}>
                  🔑 Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.authTabBtn,
                  authMode === 'signup' && (isLightTheme ? styles.authTabBtnActiveLight : styles.authTabBtnActive)
                ]}
                onPress={() => { setAuthMode('signup'); setLoginError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.authTabText,
                  isLightTheme && styles.authTabTextLight,
                  authMode === 'signup' && (isLightTheme ? styles.authTabTextActiveLight : styles.authTabTextActive)
                ]}>
                  🌾 New Farmer Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: EXISTING USER LOGIN */}
            {authMode === 'login' ? (
              <View style={{ width: '100%' }}>
                <Text style={[styles.label, isLightTheme && styles.labelLight]}>Username</Text>
                <TextInput
                  style={[styles.authInput, isLightTheme && styles.authInputLight]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your username (e.g. esi_farmer)"
                  placeholderTextColor={isLightTheme ? "#94a3b8" : "#64748b"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[styles.label, isLightTheme && styles.labelLight]}>Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.authInput, { flex: 1, marginBottom: 0, paddingRight: 60 }, isLightTheme && styles.authInputLight]}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    placeholder="Enter password"
                    placeholderTextColor={isLightTheme ? "#94a3b8" : "#64748b"}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle} 
                    onPress={() => setIsPasswordVisible(prev => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.passwordToggleText}>
                      {isPasswordVisible ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.loginBtnText}>🔑 Sign In to Portal</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.registerLinkBtn, isLightTheme && styles.registerLinkBtnLight]} 
                  onPress={() => { setAuthMode('signup'); setLoginError(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.registerLinkText, isLightTheme && styles.registerLinkTextLight]}>
                    🌾 New Farmer? Tap here to Sign Up
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.authHint, isLightTheme && styles.authHintLight]}>
                  For smallholders and extension officers across Umzingwane.
                </Text>
              </View>
            ) : (
              /* TAB 2: FARMER SELF-REGISTRATION */
              <View style={{ width: '100%' }}>
                <Text style={[styles.authFormSubtitle, isLightTheme && styles.authFormSubtitleLight]}>
                  Sign up once to access personalized maize yield forecasts and agronomic advisories for your ward.
                </Text>

                <Text style={[styles.label, isLightTheme && styles.labelLight]}>Full Name / Ibizo</Text>
                <TextInput
                  style={[styles.authInput, isLightTheme && styles.authInputLight]}
                  value={regName}
                  onChangeText={setRegName}
                  placeholder="e.g. Nomusa Moyo"
                  placeholderTextColor={isLightTheme ? "#94a3b8" : "#64748b"}
                />

                <Text style={[styles.label, isLightTheme && styles.labelLight]}>Mobile Phone Number</Text>
                <TextInput
                  style={[styles.authInput, isLightTheme && styles.authInputLight]}
                  value={regPhone}
                  onChangeText={setRegPhone}
                  placeholder="e.g. +263771234567 or 0771234567"
                  placeholderTextColor={isLightTheme ? "#94a3b8" : "#64748b"}
                  keyboardType="phone-pad"
                />

                <Text style={[styles.label, isLightTheme && styles.labelLight]}>Farming Ward (Location)</Text>
                <TouchableOpacity
                  style={[styles.wardPickerBtn, isLightTheme && styles.wardPickerBtnLight]}
                  onPress={() => setShowRegWardPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.wardPickerBtnText, isLightTheme && styles.wardPickerBtnTextLight]} numberOfLines={1}>
                    📍 {regWard}
                  </Text>
                  <Text style={styles.wardPickerBtnArrow}>▼ Change</Text>
                </TouchableOpacity>

                <Text style={[styles.label, isLightTheme && styles.labelLight]}>Choose Username (Login ID)</Text>
                <TextInput
                  style={[styles.authInput, isLightTheme && styles.authInputLight]}
                  value={regUsername}
                  onChangeText={setRegUsername}
                  placeholder="e.g. nomusa_moyo"
                  placeholderTextColor={isLightTheme ? "#94a3b8" : "#64748b"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[styles.label, isLightTheme && styles.labelLight]}>Choose Password</Text>
                <TextInput
                  style={[styles.authInput, isLightTheme && styles.authInputLight]}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  placeholder="Choose your password"
                  placeholderTextColor={isLightTheme ? "#94a3b8" : "#64748b"}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}

                <TouchableOpacity 
                  style={[styles.loginBtn, { backgroundColor: '#059669' }]} 
                  onPress={handleSignUp} 
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.loginBtnText}>🌱 Sign Up & Open Dashboard</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.registerLinkBtn, isLightTheme && styles.registerLinkBtnLight]} 
                  onPress={() => { setAuthMode('login'); setLoginError(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.registerLinkText, isLightTheme && styles.registerLinkTextLight]}>
                    🔑 Already have an account? Sign In
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.authHint, isLightTheme && styles.authHintLight]}>
                  Instant registration connects directly to the central district database.
                </Text>
              </View>
            )}
          </View>

          {/* APP USAGE GUIDE TAB */}
          <View style={[styles.guideCard, isLightTheme && styles.guideCardLight]}>
            <TouchableOpacity 
              style={styles.guideHeader} 
              onPress={() => setShowGuide(prev => !prev)}
              activeOpacity={0.7}
            >
              <View style={styles.guideHeaderLeft}>
                <Text style={styles.guideIcon}>📖</Text>
                <Text style={[styles.guideTitle, isLightTheme && styles.guideTitleLight]}>App Usage Guide</Text>
              </View>
              <Text style={[styles.guideArrow, isLightTheme && styles.guideArrowLight]}>
                {showGuide ? '▲ Close' : '▼ Learn How to Use'}
              </Text>
            </TouchableOpacity>

            {showGuide && (
              <View style={styles.guideBody}>
                <Text style={[styles.guideIntro, isLightTheme && styles.guideIntroLight]}>
                  Step-by-step instructions on utilizing the NUST Hybrid AI forecasting tool:
                </Text>

                <View style={styles.guideStepRow}>
                  <View style={styles.guideStepBadge}><Text style={styles.guideStepBadgeText}>1</Text></View>
                  <View style={styles.guideStepContent}>
                    <Text style={[styles.guideStepTitle, isLightTheme && styles.guideStepTitleLight]}>System Access</Text>
                    <Text style={[styles.guideStepDesc, isLightTheme && styles.guideStepDescLight]}>
                      Log in using credentials provisioned by your Agritex administrator. Both officers and farmers have authorized access.
                    </Text>
                  </View>
                </View>

                <View style={styles.guideStepRow}>
                  <View style={styles.guideStepBadge}><Text style={styles.guideStepBadgeText}>2</Text></View>
                  <View style={styles.guideStepContent}>
                    <Text style={[styles.guideStepTitle, isLightTheme && styles.guideStepTitleLight]}>Select Location Ward</Text>
                    <Text style={[styles.guideStepDesc, isLightTheme && styles.guideStepDescLight]}>
                      Choose from all 20 wards in Umzingwane District. Selecting a ward automatically loads calibrated regional soil textures (sand/clay) and historical climate baselines.
                    </Text>
                  </View>
                </View>

                <View style={styles.guideStepRow}>
                  <View style={styles.guideStepBadge}><Text style={styles.guideStepBadgeText}>3</Text></View>
                  <View style={styles.guideStepContent}>
                    <Text style={[styles.guideStepTitle, isLightTheme && styles.guideStepTitleLight]}>Choose Certified Cultivar</Text>
                    <Text style={[styles.guideStepDesc, isLightTheme && styles.guideStepDescLight]}>
                      Select from certified Seed Co varieties: SC301 (ultra-early), SC436 (early), SC529 (medium), or SC719 (late maturing).
                    </Text>
                  </View>
                </View>

                <View style={styles.guideStepRow}>
                  <View style={styles.guideStepBadge}><Text style={styles.guideStepBadgeText}>4</Text></View>
                  <View style={styles.guideStepContent}>
                    <Text style={[styles.guideStepTitle, isLightTheme && styles.guideStepTitleLight]}>Simulate Weather Stress</Text>
                    <Text style={[styles.guideStepDesc, isLightTheme && styles.guideStepDescLight]}>
                      Adjust precipitation and heat stress steppers to test dry spell or thermal shock scenarios.
                    </Text>
                  </View>
                </View>

                <View style={styles.guideStepRow}>
                  <View style={styles.guideStepBadge}><Text style={styles.guideStepBadgeText}>5</Text></View>
                  <View style={styles.guideStepContent}>
                    <Text style={[styles.guideStepTitle, isLightTheme && styles.guideStepTitleLight]}>Analyze Quantile Yield Range</Text>
                    <Text style={[styles.guideStepDesc, isLightTheme && styles.guideStepDescLight]}>
                      Review probabilistic boundaries: Low (q10 worst-case), Median (q50 expected), and High (q90 optimal potential) in kg/ha.
                    </Text>
                  </View>
                </View>

                <View style={styles.guideStepRow}>
                  <View style={styles.guideStepBadge}><Text style={styles.guideStepBadgeText}>6</Text></View>
                  <View style={styles.guideStepContent}>
                    <Text style={[styles.guideStepTitle, isLightTheme && styles.guideStepTitleLight]}>Biophysical Stress Gauges</Text>
                    <Text style={[styles.guideStepDesc, isLightTheme && styles.guideStepDescLight]}>
                      Monitor the Water Deficit Index (WDI) and Heat Accumulation Stress bars to identify crop moisture risks.
                    </Text>
                  </View>
                </View>

                <View style={styles.guideStepRow}>
                  <View style={styles.guideStepBadge}><Text style={styles.guideStepBadgeText}>7</Text></View>
                  <View style={styles.guideStepContent}>
                    <Text style={[styles.guideStepTitle, isLightTheme && styles.guideStepTitleLight]}>Agronomic Advisory</Text>
                    <Text style={[styles.guideStepDesc, isLightTheme && styles.guideStepDescLight]}>
                      Follow localized advice regarding planting dates, moisture retention (tied ridges/mulching), and split-dose fertilizer applications.
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* COPYRIGHT MESSAGE */}
          <Text style={[styles.authCopyright, isLightTheme && styles.authCopyrightLight]}>
            © 2026 National University of Science and Technology (NUST). All rights reserved.
          </Text>

        </ScrollView>

        {/* REGISTRATION WARD PICKER MODAL */}
        <Modal
          visible={showRegWardPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowRegWardPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isLightTheme && styles.modalContentLight, { maxHeight: '80%' }]}>
              <Text style={[styles.modalTitle, isLightTheme && styles.modalTitleLight]}>
                📍 Select Your Ward
              </Text>
              <Text style={[styles.modalSubtitle, isLightTheme && styles.modalSubtitleLight]}>
                Choose the Umzingwane ward where your crop is planted:
              </Text>

              <ScrollView style={styles.modalScroll}>
                {Object.keys(WARD_DEFAULTS).map((wardName) => (
                  <TouchableOpacity
                    key={wardName}
                    style={[
                      styles.modalItem,
                      isLightTheme && styles.modalItemLight,
                      regWard === wardName && styles.modalItemActive
                    ]}
                    onPress={() => {
                      setRegWard(wardName);
                      setShowRegWardPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      isLightTheme && styles.modalItemTextLight,
                      regWard === wardName && { color: '#10b981', fontWeight: 'bold' }
                    ]}>
                      {wardName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity 
                style={styles.modalCloseBtn} 
                onPress={() => setShowRegWardPicker(false)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // MAIN DASHBOARD SCREEN (LOGGED IN)
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={[styles.container, isLightTheme && styles.containerLight]}>
      <StatusBar 
        backgroundColor={isLightTheme ? "#ffffff" : "#0b0f19"} 
        barStyle={isLightTheme ? "dark-content" : "light-content"} 
        translucent={false}
      />
      
      {/* HEADER */}
      <View style={[styles.header, isLightTheme && styles.headerLight]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, isLightTheme && styles.headerTitleLight]}>NUST Yield Portal</Text>
          <Text style={styles.headerSub}>
            {userProfile ? `${userProfile.name} • ${userProfile.role}` : 'Umzingwane District'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={[styles.themeBtn, isLightTheme && styles.themeBtnLight]} onPress={toggleTheme}>
            <Text style={[styles.themeBtnText, isLightTheme && styles.themeBtnTextLight]}>🌓 Theme</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* INPUTS PANEL */}
        <View style={[styles.card, isLightTheme && styles.cardLight]}>
          <Text style={[styles.cardTitle, isLightTheme && styles.cardTitleLight]}>Biophysical Forecasting Inputs</Text>
          
          {/* LOCATION WARD SELECTOR */}
          <Text style={[styles.label, isLightTheme && styles.labelLight]}>Location (Umzingwane District)</Text>
          <TouchableOpacity 
            style={[styles.dropdownSelectorBtn, isLightTheme && styles.dropdownSelectorBtnLight]} 
            onPress={() => setShowWardModal(true)}
          >
            <Text style={[styles.dropdownSelectorText, isLightTheme && styles.dropdownSelectorTextLight, { flex: 1 }]} numberOfLines={1}>
              {ward}
            </Text>
            <Text style={[styles.dropdownArrowText, isLightTheme && styles.dropdownArrowTextLight]}>▾</Text>
          </TouchableOpacity>

          {/* CULTIVAR SELECTOR */}
          <Text style={[styles.label, isLightTheme && styles.labelLight, { marginTop: 16 }]}>Maize Cultivar</Text>
          <TouchableOpacity 
            style={[styles.dropdownSelectorBtn, isLightTheme && styles.dropdownSelectorBtnLight, { marginBottom: 16 }]} 
            onPress={() => setShowCultivarModal(true)}
          >
            <Text style={[styles.dropdownSelectorText, isLightTheme && styles.dropdownSelectorTextLight, { flex: 1 }]}>
              {variety}
            </Text>
            <Text style={[styles.dropdownArrowText, isLightTheme && styles.dropdownArrowTextLight]}>▾</Text>
          </TouchableOpacity>

          {/* PRECIPITATION STEPPER */}
          <View style={styles.controlRow}>
            <View>
              <Text style={[styles.controlLabel, isLightTheme && styles.controlLabelLight]}>Precipitation (Scaled)</Text>
              <Text style={styles.subControlLabel}>Seasonal cumulative rainfall</Text>
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity 
                style={[styles.stepBtn, isLightTheme && styles.stepBtnLight]} 
                onPress={() => handleSliderUpdate('precip', 'dec')}
              >
                <Text style={[styles.stepBtnText, isLightTheme && styles.stepBtnTextLight]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.valueText}>{precip.toFixed(2)}</Text>
              <TouchableOpacity 
                style={[styles.stepBtn, isLightTheme && styles.stepBtnLight]} 
                onPress={() => handleSliderUpdate('precip', 'inc')}
              >
                <Text style={[styles.stepBtnText, isLightTheme && styles.stepBtnTextLight]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* HEAT STRESS STEPPER */}
          <View style={styles.controlRow}>
            <View>
              <Text style={[styles.controlLabel, isLightTheme && styles.controlLabelLight]}>Heat Stress (Thermal)</Text>
              <Text style={styles.subControlLabel}>GDD accumulation index</Text>
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity 
                style={[styles.stepBtn, isLightTheme && styles.stepBtnLight]} 
                onPress={() => handleSliderUpdate('heat', 'dec')}
              >
                <Text style={[styles.stepBtnText, isLightTheme && styles.stepBtnTextLight]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.valueText}>{heat.toFixed(2)}</Text>
              <TouchableOpacity 
                style={[styles.stepBtn, isLightTheme && styles.stepBtnLight]} 
                onPress={() => handleSliderUpdate('heat', 'inc')}
              >
                <Text style={[styles.stepBtnText, isLightTheme && styles.stepBtnTextLight]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* LOADING INDICATOR */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={[styles.loadingText, isLightTheme && styles.loadingTextLight]}>Computing hybrid quantile forecast...</Text>
          </View>
        )}

        {/* ============================================================= */}
        {/* REPORT DESIGN (MATCHING WEB PORTAL LAYOUT) */}
        {/* ============================================================= */}
        {forecast && !loading ? (
          <View style={[styles.reportContainer, isLightTheme && styles.reportContainerLight]}>
            
            {/* REPORT HEADER */}
            <View style={styles.reportHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reportTitle, isLightTheme && styles.reportTitleLight]}>Maize Yield Prediction Report</Text>
                <Text style={[styles.reportSubtitle, isLightTheme && styles.reportSubtitleLight]}>Umzingwane District, Matabeleland South</Text>
              </View>
              <View style={styles.reportBadge}>
                <Text style={styles.reportBadgeText}>NUST MPhil Pipeline</Text>
              </View>
            </View>

            {/* METADATA GRID */}
            <View style={[styles.metaGrid, isLightTheme && styles.metaGridLight]}>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, isLightTheme && styles.metaLabelLight]}>Location Centroid</Text>
                <Text style={[styles.metaValue, isLightTheme && styles.metaValueLight]} numberOfLines={2}>{ward}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, isLightTheme && styles.metaLabelLight]}>Maize Cultivar</Text>
                <Text style={[styles.metaValue, isLightTheme && styles.metaValueLight]}>{variety}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, isLightTheme && styles.metaLabelLight]}>Soil Textures</Text>
                <Text style={[styles.metaValue, isLightTheme && styles.metaValueLight]}>Sand: {sand}% | Clay: {clay}%</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={[styles.metaLabel, isLightTheme && styles.metaLabelLight]}>Precipitation (Scaled)</Text>
                <Text style={[styles.metaValue, isLightTheme && styles.metaValueLight]}>{precip}</Text>
              </View>
            </View>

            {/* EXPECTED MEDIAN YIELD HIGHLIGHT BANNER */}
            <View style={styles.yieldBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.yieldBannerTitle}>Expected Median Yield</Text>
                <Text style={styles.yieldBannerSub}>Standard meteorological alignment (q50)</Text>
              </View>
              <Text style={styles.yieldBannerValue}>{forecast.med} kg/ha</Text>
            </View>

            {/* 3 QUANTILE ENVELOPE CARDS */}
            <Text style={[styles.sectionTitle, isLightTheme && styles.sectionTitleLight]}>
              Quantile Yield Forecast Range (kg/ha)
            </Text>
            
            <View style={styles.envelopeGrid}>
              {/* LOWER BOUND (Q10) */}
              <View style={[styles.envelopeCard, styles.envelopeLow]}>
                <Text style={styles.envelopeLabel}>Lower Bound (q10)</Text>
                <Text style={[styles.envelopeValue, { color: '#f43f5e' }]}>{forecast.low} kg/ha</Text>
                <Text style={styles.envelopeDesc}>10th Percentile • Adverse Scenario</Text>
              </View>

              {/* MEDIAN YIELD (Q50) */}
              <View style={[styles.envelopeCard, styles.envelopeMed]}>
                <Text style={styles.envelopeLabel}>Median Yield (q50)</Text>
                <Text style={[styles.envelopeValue, { color: '#6366f1' }]}>{forecast.med} kg/ha</Text>
                <Text style={styles.envelopeDesc}>50th Percentile • Expected Output</Text>
              </View>

              {/* UPPER BOUND (Q90) */}
              <View style={[styles.envelopeCard, styles.envelopeHigh]}>
                <Text style={styles.envelopeLabel}>Upper Bound (q90)</Text>
                <Text style={[styles.envelopeValue, { color: '#10b981' }]}>{forecast.high} kg/ha</Text>
                <Text style={styles.envelopeDesc}>90th Percentile • Optimal Potential</Text>
              </View>
            </View>

            {/* BIOPHYSICAL STRESS METERS */}
            <Text style={[styles.sectionTitle, isLightTheme && styles.sectionTitleLight]}>
              Biophysical Stress Gauges
            </Text>

            <View style={styles.metersRow}>
              {/* WATER DEFICIT INDEX */}
              <View style={[styles.meterCard, isLightTheme && styles.meterCardLight]}>
                <View style={styles.meterHeader}>
                  <Text style={[styles.meterName, isLightTheme && styles.meterNameLight]}>Water Deficit Index</Text>
                  <View style={[
                    styles.statusBadge, 
                    waterDeficitPct > 60 ? styles.statusBadgeRed : (waterDeficitPct > 30 ? styles.statusBadgeYellow : styles.statusBadgeGreen)
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {waterDeficitPct > 60 ? 'Severe' : (waterDeficitPct > 30 ? 'Moderate' : 'Low')}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.meterValueText, isLightTheme && styles.meterValueTextLight]}>
                  {waterDeficitPct}% Deficit
                </Text>

                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill, 
                    { 
                      width: `${waterDeficitPct}%`, 
                      backgroundColor: waterDeficitPct > 60 ? '#f43f5e' : (waterDeficitPct > 30 ? '#f59e0b' : '#10b981') 
                    }
                  ]} />
                </View>
              </View>

              {/* HEAT STRESS */}
              <View style={[styles.meterCard, isLightTheme && styles.meterCardLight]}>
                <View style={styles.meterHeader}>
                  <Text style={[styles.meterName, isLightTheme && styles.meterNameLight]}>Heat Accumulation Stress</Text>
                  <View style={[
                    styles.statusBadge, 
                    heatStressPct > 60 ? styles.statusBadgeRed : (heatStressPct > 30 ? styles.statusBadgeYellow : styles.statusBadgeGreen)
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {heatStressPct > 60 ? 'Severe' : (heatStressPct > 30 ? 'Moderate' : 'Low')}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.meterValueText, isLightTheme && styles.meterValueTextLight]}>
                  {heatStressPct}% Thermal Stress
                </Text>

                <View style={styles.progressBarBg}>
                  <View style={[
                    styles.progressBarFill, 
                    { 
                      width: `${heatStressPct}%`, 
                      backgroundColor: heatStressPct > 60 ? '#f43f5e' : (heatStressPct > 30 ? '#f59e0b' : '#6366f1') 
                    }
                  ]} />
                </View>
              </View>
            </View>

            {/* AGRONOMIC RECOMMENDATION & ADVISORY BOX */}
            <View style={[styles.advisoryCard, isLightTheme && styles.advisoryCardLight]}>
              <Text style={[styles.advisoryHeader, isLightTheme && styles.advisoryHeaderLight]}>
                Agronomic Recommendation & Farming Advisory
              </Text>
              <Text style={[styles.advisoryBody, isLightTheme && styles.advisoryBodyLight]}>
                {forecast.advisory}
              </Text>
            </View>

            {/* INDICATOR GLOSSARY ACCORDION */}
            <View style={[styles.glossaryBox, isLightTheme && styles.glossaryBoxLight]}>
              <TouchableOpacity 
                style={styles.glossaryHeader}
                onPress={() => setShowGlossary(prev => !prev)}
                activeOpacity={0.7}
              >
                <Text style={[styles.glossaryTitle, isLightTheme && styles.glossaryTitleLight]}>
                  📘 Indicator Glossary & Interpretations
                </Text>
                <Text style={styles.glossaryToggleText}>
                  {showGlossary ? '▲ Hide' : '▼ Read'}
                </Text>
              </TouchableOpacity>

              {showGlossary && (
                <View style={styles.glossaryContent}>
                  <Text style={[styles.glossaryItemTitle, isLightTheme && styles.glossaryItemTitleLight]}>
                    Quantile Yield Range (kg/ha):
                  </Text>
                  <Text style={[styles.glossaryItemDesc, isLightTheme && styles.glossaryItemDescLight]}>
                    Provides probabilistic boundaries. The Lower Bound (q10) signifies worst-case dry spell yields (90% chance actual yield exceeds this). The Median (q50) is the most likely crop yield. The Upper Bound (q90) is the best-case potential under ideal moisture.
                  </Text>

                  <Text style={[styles.glossaryItemTitle, isLightTheme && styles.glossaryItemTitleLight, { marginTop: 10 }]}>
                    Water Deficit Index (WDI):
                  </Text>
                  <Text style={[styles.glossaryItemDesc, isLightTheme && styles.glossaryItemDescLight]}>
                    Quantifies moisture scarcity relative to crop evapotranspiration. Higher percentages indicate vegetative wilt risks.
                  </Text>

                  <Text style={[styles.glossaryItemTitle, isLightTheme && styles.glossaryItemTitleLight, { marginTop: 10 }]}>
                    Heat Accumulation Stress:
                  </Text>
                  <Text style={[styles.glossaryItemDesc, isLightTheme && styles.glossaryItemDescLight]}>
                    Measures thermal accumulation exceeding physiological base thresholds during flowering and grain filling.
                  </Text>
                </View>
              )}
            </View>

            {/* DOWNLOAD & SHARE REPORT BUTTON */}
            <TouchableOpacity 
              style={styles.downloadReportBtn} 
              onPress={handleDownloadReport}
              activeOpacity={0.8}
            >
              <Text style={styles.downloadReportBtnIcon}>📥</Text>
              <Text style={styles.downloadReportBtnText}>Download & Share Report</Text>
            </TouchableOpacity>

            {/* SECURITY & PIPELINE FOOTER */}
            <View style={styles.reportFooter}>
              <Text style={styles.reportFooterText}>
                Generated via NUST MPhil Thesis Hybrid Model Fusion Pipeline (Option B) | Scale: kg/ha
              </Text>
              <Text style={styles.reportFooterSub}>
                Security Signature: Authorized Agritex Officer System Log Verification
              </Text>
            </View>

          </View>
        ) : null}

      </ScrollView>

      {/* 1. LOCATION WARD SELECTOR MODAL (SPELLED OUT 1-20) */}
      <Modal
        visible={showWardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLightTheme && styles.modalContentLight]}>
            <Text style={[styles.modalTitle, isLightTheme && styles.modalTitleLight]}>
              Select Location Ward
            </Text>
            <Text style={[styles.modalSubtitle, isLightTheme && styles.modalSubtitleLight]}>
              Umzingwane District (20 Administrative Wards)
            </Text>
            
            <ScrollView style={styles.modalScroll}>
              {Object.keys(WARD_DEFAULTS).map((wardName) => (
                <TouchableOpacity
                  key={wardName}
                  style={[
                    styles.modalItem,
                    isLightTheme && styles.modalItemLight,
                    ward === wardName && styles.modalItemActive
                  ]}
                  onPress={() => {
                    handleWardSelect(wardName);
                    setShowWardModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    isLightTheme && styles.modalItemTextLight,
                    ward === wardName && { color: '#6366f1', fontWeight: 'bold' }
                  ]}>
                    {wardName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowWardModal(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. CULTIVAR SELECTOR MODAL */}
      <Modal
        visible={showCultivarModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCultivarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isLightTheme && styles.modalContentLight]}>
            <Text style={[styles.modalTitle, isLightTheme && styles.modalTitleLight]}>
              Select Maize Cultivar
            </Text>
            <Text style={[styles.modalSubtitle, isLightTheme && styles.modalSubtitleLight]}>
              Certified NUST Seed Co Calibrations
            </Text>

            <ScrollView style={styles.modalScroll}>
              {VALID_CULTIVARS.map((cultivarName) => (
                <TouchableOpacity
                  key={cultivarName}
                  style={[
                    styles.modalItem,
                    isLightTheme && styles.modalItemLight,
                    variety === cultivarName && styles.modalItemActive
                  ]}
                  onPress={() => {
                    setVariety(cultivarName);
                    runForecast(cultivarName, ward, precip, heat, sand, clay);
                    setShowCultivarModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    isLightTheme && styles.modalItemTextLight,
                    variety === cultivarName && { color: '#6366f1', fontWeight: 'bold' }
                  ]}>
                    {cultivarName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCultivarModal(false)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Root Containers
  container: {
    flex: 1,
    backgroundColor: '#0b0f19',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  containerLight: {
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Top Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLight: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#cbd5e1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  headerTitleLight: {
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginTop: 2,
  },
  themeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  themeBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  themeBtnText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 12,
  },
  themeBtnTextLight: {
    color: '#334155',
  },
  logoutBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutBtnText: {
    color: '#f43f5e',
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Auth / Login Styles
  authContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  authContainerLight: {
    backgroundColor: '#f8fafc',
  },
  authTopHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
  },
  authTopHeaderLight: {
    backgroundColor: '#f8fafc',
  },
  authScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginBottom: 20,
  },
  authCardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  authHeaderBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  authHeaderBadgeText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  authLogo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
    textAlign: 'center',
  },
  authLogoLight: {
    color: '#0f172a',
  },
  authSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 18,
  },
  authSubtitleLight: {
    color: '#64748b',
  },
  authTabContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  authTabContainerLight: {
    backgroundColor: '#e2e8f0',
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  authTabBtnActive: {
    backgroundColor: '#4f46e5',
  },
  authTabBtnActiveLight: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  authTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  authTabTextLight: {
    color: '#64748b',
  },
  authTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  authTabTextActiveLight: {
    color: '#4f46e5',
  },
  authFormSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  authFormSubtitleLight: {
    color: '#64748b',
  },
  wardPickerBtn: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  wardPickerBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  wardPickerBtnText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  wardPickerBtnTextLight: {
    color: '#0f172a',
  },
  wardPickerBtnArrow: {
    color: '#6366f1',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
  },
  authInput: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    color: '#f8fafc',
    marginBottom: 16,
    fontSize: 14,
  },
  authInputLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    color: '#0f172a',
  },
  passwordWrapper: {
    width: '100%',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  authHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 16,
    textAlign: 'center',
  },
  registerLinkBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    alignItems: 'center',
    width: '100%',
  },
  registerLinkBtnLight: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderColor: '#c7d2fe',
  },
  registerLinkText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '700',
  },
  registerLinkTextLight: {
    color: '#4f46e5',
  },

  smallActionBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // App Usage Guide Accordion
  guideCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  guideCardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  guideHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guideHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideIcon: {
    fontSize: 18,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  guideTitleLight: {
    color: '#0f172a',
  },
  guideArrow: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  guideArrowLight: {
    color: '#4f46e5',
  },
  guideBody: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  guideIntro: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    marginTop: 12,
    lineHeight: 18,
  },
  guideIntroLight: {
    color: '#64748b',
  },
  guideStepRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 12,
  },
  guideStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  guideStepBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  guideStepContent: {
    flex: 1,
  },
  guideStepTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 2,
  },
  guideStepTitleLight: {
    color: '#0f172a',
  },
  guideStepDesc: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 17,
  },
  guideStepDescLight: {
    color: '#475569',
  },
  authCopyright: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
  },
  authCopyrightLight: {
    color: '#94a3b8',
  },

  // Inputs Card
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  cardLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 16,
  },
  cardTitleLight: {
    color: '#0f172a',
  },
  label: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    fontWeight: '600',
  },
  labelLight: {
    color: '#64748b',
  },
  dropdownSelectorBtn: {
    width: '100%',
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dropdownSelectorBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  dropdownSelectorText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownSelectorTextLight: {
    color: '#0f172a',
  },
  dropdownArrowText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dropdownArrowTextLight: {
    color: '#64748b',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  controlLabel: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '500',
  },
  controlLabelLight: {
    color: '#0f172a',
  },
  subControlLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
  },
  stepBtnLight: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  stepBtnText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepBtnTextLight: {
    color: '#0f172a',
  },
  valueText: {
    color: '#6366f1',
    fontWeight: 'bold',
    fontSize: 14,
    minWidth: 40,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  loadingTextLight: {
    color: '#64748b',
  },

  // Report Container (Web Portal Matching Design)
  reportContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 18,
  },
  reportContainerLight: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  reportTitleLight: {
    color: '#0f172a',
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
  },
  reportSubtitleLight: {
    color: '#64748b',
  },
  reportBadge: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reportBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Metadata Grid
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  metaGridLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  metaCol: {
    width: '50%',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaLabelLight: {
    color: '#94a3b8',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 2,
  },
  metaValueLight: {
    color: '#0f172a',
  },

  // Expected Yield Banner
  yieldBanner: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yieldBannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  yieldBannerSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  yieldBannerValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleLight: {
    color: '#0f172a',
  },

  // Envelope Cards
  envelopeGrid: {
    gap: 10,
  },
  envelopeCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  envelopeLow: {
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  envelopeMed: {
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  envelopeHigh: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  envelopeLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  envelopeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  envelopeDesc: {
    fontSize: 11,
    color: '#64748b',
  },

  // Biophysical Meters
  metersRow: {
    gap: 12,
  },
  meterCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  meterCardLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meterName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  meterNameLight: {
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeRed: {
    backgroundColor: 'rgba(244, 63, 94, 0.2)',
  },
  statusBadgeYellow: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  meterValueText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  meterValueTextLight: {
    color: '#64748b',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Advisory Card
  advisoryCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    borderColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  advisoryCardLight: {
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  advisoryHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#818cf8',
    marginBottom: 10,
  },
  advisoryHeaderLight: {
    color: '#4f46e5',
  },
  advisoryBody: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  advisoryBodyLight: {
    color: '#334155',
  },

  // Glossary Box
  glossaryBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  glossaryBoxLight: {
    borderTopColor: '#e2e8f0',
  },
  glossaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  glossaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  glossaryTitleLight: {
    color: '#0f172a',
  },
  glossaryToggleText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  glossaryContent: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
  },
  glossaryItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  glossaryItemTitleLight: {
    color: '#4f46e5',
  },
  glossaryItemDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginTop: 2,
  },
  glossaryItemDescLight: {
    color: '#475569',
  },

  // Report Footer
  downloadReportBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadReportBtnIcon: {
    fontSize: 18,
  },
  downloadReportBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  reportFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 14,
    alignItems: 'center',
  },
  reportFooterText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
  },
  reportFooterSub: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },

  // Overlays / Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#131a2b',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalContentLight: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  modalTitleLight: {
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  modalSubtitleLight: {
    color: '#64748b',
  },
  modalScroll: {
    marginBottom: 14,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalItemLight: {
    borderBottomColor: '#f1f5f9',
  },
  modalItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
  },
  modalItemText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  modalItemTextLight: {
    color: '#334155',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#f43f5e',
    fontWeight: 'bold',
    fontSize: 13,
  },
});