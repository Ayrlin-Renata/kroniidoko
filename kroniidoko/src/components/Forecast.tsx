import { Component } from "preact";
import * as ort from "onnxruntime-web";
import { getForecastHistory } from "../utils";
import "./Forecast.css";

// Configure WASM paths
ort.env.wasm.wasmPaths = "/";

const MODEL_THRESHOLD = 0.5; // From original forecast config.js

interface DayForecast {
    name: string;
    probs: number[];
    maxProb: number;
    highProbCount: number;
}

interface ForecastState {
    status: string;
    days: DayForecast[];
    timezone: string;
}

const TIMEZONES = (() => {
    const zones = [];
    // Include user local timezone logic in render, giving full range here
    for (let i = -12; i <= 14; i++) {
        const sign = i >= 0 ? '+' : '';
        const label = `UTC${sign}${i}`;
        // Etc/GMT signs are inverted: UTC+5 is Etc/GMT-5
        const value = `Etc/GMT${i > 0 ? '-' : '+'}${Math.abs(i)}`;
        zones.push({ label, value });
    }
    return zones;
})();

export default class Forecast extends Component<{}, ForecastState> {
    session: ort.InferenceSession | null = null;
    mounted = false;
    localTimezone: string;

    constructor() {
        super();
        this.localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        this.state = {
            status: "Initializing...",
            days: [],
            timezone: this.localTimezone
        };
    }

    async componentDidMount() {
        this.mounted = true;
        try {
            // Load from public folder
            this.session = await ort.InferenceSession.create("/model.onnx", {
                executionProviders: ["wasm"],
            });
            this.updateView();
        } catch (e) {
            console.error(e);
            if (this.mounted) this.setState({ status: "Error loading model." });
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    updateView = async () => {
        if (!this.session || !this.mounted) return;

        this.setState({ status: "Syncing..." });
        let history;
        try {
            history = await getForecastHistory();
        } catch (e) {
            console.error(e);
            this.setState({ status: "Sync Error." });
            return;
        }

        if (!history || history.length === 0) {
            this.setState({ status: "No Data" });
            return;
        }

        this.setState({ status: "Processing..." });

        // --- Feature Engineering (Ported from Forecast app.js) ---
        const lastStream = history[0];
        // Note: Holodex.js returns camelCase
        const isLive = lastStream.status === "live";
        const lastStartStr = lastStream.actualStart || lastStream.availableAt;
        const lastStart = new Date(lastStartStr);

        let lastEnd: Date;
        if (isLive) {
            lastEnd = new Date();
        } else {
            const lastEndStr = lastStream.actualEnd || lastStartStr;
            lastEnd = new Date(lastEndStr);
        }

        let durationHours = (lastEnd.getTime() - lastStart.getTime()) / (1000 * 3600);
        if (durationHours < 0) durationHours = 0;

        const now = new Date();
        let current = new Date(now);
        current.setMinutes(0, 0, 0);
        current.setHours(current.getHours() + 1);

        const inputs: number[] = [];
        const times: Date[] = [];

        const wasStreamingAt = (timestamp: Date) => {
            const tTime = timestamp.getTime();
            for (let vid of history) {
                if (!vid.actualStart) continue; // Skip if no start info
                const start = new Date(vid.actualStart).getTime();
                if (start >= tTime && start < tTime + 3600000) {
                    return 1.0;
                }
            }
            return 0.0;
        };

        // Generate enough hours to cover partial starts and full 7 days (+ extra)
        // 8 full days = 192 hours. Lets go 200 safer.
        for (let i = 0; i < 200; i++) {
            const t = new Date(current.getTime() + i * 3600 * 1000);
            times.push(t);

            const hour = t.getHours();
            const dow = t.getDay();

            const hour_sin = Math.sin(2 * Math.PI * hour / 24);
            const hour_cos = Math.cos(2 * Math.PI * hour / 24);
            const day_sin = Math.sin(2 * Math.PI * dow / 7);
            const day_cos = Math.cos(2 * Math.PI * dow / 7);

            const hours_since_stream = (t.getTime() - lastEnd.getTime()) / (1000 * 3600);
            const hours_since_start = (t.getTime() - lastStart.getTime()) / (1000 * 3600);

            const time24 = new Date(t.getTime() - 24 * 3600 * 1000);
            const time168 = new Date(t.getTime() - 168 * 3600 * 1000);

            const stream_24 = wasStreamingAt(time24);
            const stream_168 = wasStreamingAt(time168);

            inputs.push(
                hour_sin, hour_cos, day_sin, day_cos,
                hours_since_stream, hours_since_start, durationHours,
                stream_24, stream_168
            );
        }

        // Inference
        try {
            const tensor = new ort.Tensor('float32', Float32Array.from(inputs), [200, 9]);
            const feeds = { float_input: tensor };
            // @ts-ignore - OutputNames might vary, simplified for now
            const results = await this.session.run(feeds);

            // Dynamic output name handling
            const outputKey = this.session.outputNames[1] || this.session.outputNames[0];
            const probs = results[outputKey].data as Float32Array;

            const streamProbs: number[] = [];
            for (let i = 0; i < 200; i++) {
                streamProbs.push(probs[i * 2 + 1]);
            }

            this.processForecast(times, streamProbs);
            if (this.mounted) this.setState({ status: "Ready" });

        } catch (e) {
            console.error("Inference Error", e);
            if (this.mounted) this.setState({ status: "Prediction Error" });
        }
    };

    processForecast(times: Date[], probs: number[]) {
        const daysMap: Record<string, DayForecast> = {};
        const { timezone } = this.state;

        // Track unique days specifically to maintain order
        const uniqueDayNames: string[] = [];

        times.forEach((t, i) => {
            // Use selected timezone
            const dayName = t.toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                timeZone: timezone
            });

            if (!daysMap[dayName]) {
                uniqueDayNames.push(dayName);
                daysMap[dayName] = {
                    name: dayName,
                    probs: [],
                    maxProb: 0,
                    highProbCount: 0
                };
            }
            const p = probs[i];
            daysMap[dayName].probs.push(p);
            if (p > daysMap[dayName].maxProb) daysMap[dayName].maxProb = p;
            if (p >= MODEL_THRESHOLD) daysMap[dayName].highProbCount++;
        });

        // Slice to first 7 days found
        const finalDays = uniqueDayNames.slice(0, 7).map(name => daysMap[name]);

        this.setState({ days: finalDays });
    }

    // Helper for sparkline
    renderSparkline(probs: number[]) {
        // Pad Y to avoid clipping at 0 and 100%
        // Map 0..1 to 95..5 (SVG coordinates, 0 is top)
        const points = probs.map((p, i) => {
            const div = probs.length > 1 ? (probs.length - 1) : 1;
            const x = (i / div) * 100;

            // Constrain p to 0-1 for safety
            const val = Math.max(0, Math.min(1, p));
            // Top (100%) -> y=5, Bottom (0%) -> y=95
            const y = 95 - (val * 90);

            return `${x},${y}`;
        });

        // Fill goes to bottom (100)
        const pathData = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;
        const lineData = `M ${points.join(' L ')}`;

        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%; height:100%; overflow: visible;">
                <path d={pathData} class="sparkline-fill" />
                <path
                    d={lineData}
                    class="sparkline-path"
                    vectorEffect="non-scaling-stroke"
                    style={{ vectorEffect: 'non-scaling-stroke' }}
                />
            </svg>
        );
    }

    handleTimezoneChange = (e: any) => {
        this.setState({ timezone: e.target.value }, () => {
            // Re-process current data if we had stored it, but simplistic way is just re-fetch/re-calc
            // Since we don't store raw history in state, let's just trigger updateView
            // Or better, just re-run updateView which isn't too expensive
            this.updateView();
        });
    }

    render() {
        const { days, timezone } = this.state;

        // Check if current timezone is one of our generated UTC zones
        // const isStandard = TIMEZONES.some(tz => tz.value === timezone);

        return (
            <div class="forecast-section">
                <div class="forecast-controls-bar">
                    <h3 class="forecast-header serif">7-DAY KRONIIUM FORECAST</h3>
                    <div class="forecast-actions">
                        <select class="timezone-select" value={timezone} onChange={this.handleTimezoneChange}>
                            <option value={this.localTimezone}>Local ({this.localTimezone})</option>
                            {TIMEZONES.map(tz => <option value={tz.value}>{tz.label}</option>)}
                        </select>
                        <button class="icon-btn material-icons" onClick={this.updateView} title="Refresh">refresh</button>
                    </div>
                </div>

                <div class="forecast-grid">
                    {days.map(day => {
                        const isActive = day.maxProb >= MODEL_THRESHOLD;
                        return (
                            <div class={`day-card ${isActive ? 'active' : ''}`}>
                                <span class="day-header">{day.name}</span>
                                <span class={`material-icons day-icon ${isActive ? 'active' : 'inactive'}`}>
                                    {isActive ? 'alarm_on' : 'alarm_off'}
                                </span>
                                <span class="day-prob">{(day.maxProb * 100).toFixed(0)}%</span>
                                <div class="sparkline-container">
                                    {this.renderSparkline(day.probs)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}
