import { Component } from "preact";
import * as ort from "onnxruntime-web";
import { getForecastHistory, getScheduledStreams } from "../utils";
import { MODEL_THRESHOLD, FORECAST_METRICS, DOW_PROBABILITY_SCALES, CALIBRATION } from "./ForecastConstants";
import "./Forecast.css";

// Use absolute path for WASM to ensureWorker resolution works
const wasmPath = (typeof window !== 'undefined') ? window.location.origin + '/' : '/';
ort.env.wasm.wasmPaths = wasmPath;
ort.env.wasm.proxy = true;
ort.env.wasm.numThreads = 1; // Basic threading, offload from main

const CHANNEL_ID = "UCmbs8T6MWqUHP1tIQvSgKrg";

interface DayForecast {
    name: string;
    probs: number[];
    scheduledProbs: number[];
    maxProb: number;
    highProbCount: number;
    dow: number;
}

interface ForecastState {
    status: string;
    days: DayForecast[];
    timezone: string;
    loading: boolean;
}

const TIMEZONES = (() => {
    const zones = [];
    for (let i = -12; i <= 14; i++) {
        const sign = i >= 0 ? '+' : '';
        const label = `UTC${sign}${i}`;
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
            status: "Forecasting...",
            days: [],
            timezone: this.localTimezone,
            loading: true
        };
    }

    async componentDidMount() {
        this.mounted = true;
        // Defer heavy initialization to allow initial UI paint
        setTimeout(async () => {
            if (!this.mounted) return;
            try {
                this.session = await ort.InferenceSession.create("/model_v3.onnx", {
                    executionProviders: ["wasm"],
                });
                await this.updateView();
            } catch (e) {
                console.error("Model Load Error:", e);
                if (this.mounted) this.setState({ status: "Error loading forecast.", loading: false });
            }
        }, 100);
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    applyCalibration(prob: number, calibMap: number[]) {
        if (!calibMap || calibMap.length === 0) return prob;
        const idx = Math.min(100, Math.max(0, Math.floor(prob * 100)));
        return calibMap[idx];
    }

    updateView = async () => {
        if (!this.session || !this.mounted) return;

        this.setState({ status: "Asking Holodex nicely...", loading: true });
        let history;
        try {
            history = await getForecastHistory();
        } catch (e) {
            console.error(e);
            if (this.mounted) this.setState({ status: "Sync Error.", loading: false });
            return;
        }

        if (!history || history.length === 0) {
            if (this.mounted) this.setState({ status: "No Data", loading: false });
            return;
        }

        this.setState({ status: "Scheduling..." });

        const scheduled = await getScheduledStreams();

        // 1. Preprocess history (match app.js baseHistory)
        const now = new Date();
        const nowMs = now.getTime();

        const baseHistory = history.map((v: any) => ({
            ...v,
            start_actual: new Date(v.actualStart || v.start_actual || v.availableAt || v.available_at),
            end_actual: new Date(v.actualEnd || v.end_actual || v.availableAt || v.available_at),
            cid: v.channelId || (v.channel ? v.channel.id : null)
        })).filter(v => v.start_actual.getTime() <= nowMs);

        // Grid Solo/Coll for frequencies
        const gridSolo = new Set(baseHistory.filter(v => v.cid === CHANNEL_ID).map(v => new Date(v.start_actual).setUTCMinutes(0, 0, 0)));

        const getRollingCount = (grid: Set<number>, t: Date, days: number) => {
            let count = 0;
            const window = days * 24 * 3600 * 1000;
            const nowTime = t.getTime();
            grid.forEach(h => {
                const diff = nowTime - h;
                if (diff > 0 && diff <= window) count++;
            });
            return count / days;
        };

        const inputs: number[][] = [];
        const times: Date[] = [];
        let currentHour = new Date(now);
        currentHour.setUTCMinutes(0, 0, 0);
        currentHour.setUTCHours(currentHour.getUTCHours() + 1);

        for (let i = 0; i < 168; i++) {
            if (i % 12 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            const t = new Date(currentHour.getTime() + i * 3600 * 1000);
            times.push(t);

            const hour = t.getUTCHours();
            const dow = (t.getUTCDay() + 6) % 7;
            const hour_sin = Math.sin(2 * Math.PI * hour / 24);
            const hour_cos = Math.cos(2 * Math.PI * hour / 24);

            const tTime = t.getTime();
            const lastAny = baseHistory.find(v => v.end_actual < t);
            const lastAnyStart = baseHistory.find(v => v.start_actual < t);
            const lastSolo = baseHistory.find(v => v.cid === CHANNEL_ID && v.end_actual < t);
            const lastSoloStart = baseHistory.find(v => v.cid === CHANNEL_ID && v.start_actual < t);
            const lastColl = baseHistory.find(v => v.cid !== CHANNEL_ID && v.end_actual < t);

            const hrs_since_last_stream = lastAny ? (tTime - lastAny.end_actual.getTime()) / 3600000 : 999;
            const hrs_since_last_start = lastAnyStart ? (tTime - lastAnyStart.start_actual.getTime()) / 3600000 : 999;
            const hrs_since_solo = lastSolo ? (tTime - lastSolo.end_actual.getTime()) / 3600000 : 999;
            const hrs_since_coll = lastColl ? (tTime - lastColl.end_actual.getTime()) / 3600000 : 999;

            const last_stream_duration = lastAny && lastAnyStart ? (lastAny.end_actual.getTime() - lastAny.start_actual.getTime()) / 3600000 : 0;
            const last_solo_duration = lastSolo && lastSoloStart ? (lastSolo.end_actual.getTime() - lastSolo.start_actual.getTime()) / 3600000 : 0;

            const s90 = getRollingCount(gridSolo, t, 90);
            const hourOfWeek = (t.getUTCDay() + 6) % 7 * 24 + t.getUTCHours();
            const heatmapPrior = 0.0;
            const dowIntensity = 0.0;

            const is_break = hrs_since_last_stream > 168 ? 1 : 0;

            inputs.push([
                heatmapPrior,               // 0: heatmap_prior
                hour_cos,                   // 1: hour_cos
                hour_sin,                   // 2: hour_sin
                s90,                        // 3: solo_90d_freq
                hrs_since_solo / 24.0,      // 4: days_since_last_solo 
                hrs_since_solo,             // 5: hours_since_last_solo
                hrs_since_last_start,       // 6: hours_since_last_start
                hrs_since_last_stream,      // 7: hours_since_last_stream
                last_stream_duration,       // 8: last_stream_duration
                last_solo_duration,         // 9: last_solo_duration
                hrs_since_coll,             // 10: hours_since_last_collab
                dowIntensity,               // 11: dow_intensity
                dow,                        // 12: day_of_week
                is_break,                   // 13: is_break
                hourOfWeek                  // 14: hour_of_week
            ]);
        }

        try {
            const flatData = Float32Array.from(inputs.flat());
            const tensor = new ort.Tensor('float32', flatData, [168, 15]);
            const results = await this.session.run({ float_input: tensor });

            const outputKey = this.session.outputNames[1] || this.session.outputNames[0];
            const probs_raw = results[outputKey].data as Float32Array;

            const streamProbs: number[] = [];
            const isGateFlattened = probs_raw.length === (168 * 2);

            for (let i = 0; i < 168; i++) {
                let pg = isGateFlattened ? probs_raw[i * 2 + 1] : probs_raw[i];
                const dow = (times[i].getUTCDay() + 6) % 7;
                pg = Math.min(1.0, pg * DOW_PROBABILITY_SCALES[dow]);
                streamProbs.push(this.applyCalibration(pg, CALIBRATION.gatekeeper || []));
            }

            this.processForecast(times, streamProbs, scheduled);
            if (this.mounted) this.setState({ status: "Kropium ready.", loading: false });

        } catch (e) {
            console.error("Inference Error:", e);
            if (this.mounted) this.setState({ status: "Prediction Error", loading: false });
        }
    };

    processForecast(times: Date[], probs: number[], scheduled: any[]) {
        const daysMap: Record<string, DayForecast> = {};
        const { timezone } = this.state;
        const uniqueDayNames: string[] = [];

        times.forEach((t, i) => {
            const dayName = t.toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                timeZone: timezone
            });

            const hourInTzStr = new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                hourCycle: 'h23',
                timeZone: timezone
            }).format(t);
            const hourInTz = parseInt(hourInTzStr);

            if (!daysMap[dayName]) {
                uniqueDayNames.push(dayName);
                daysMap[dayName] = {
                    name: dayName,
                    probs: new Array(24).fill(0),
                    scheduledProbs: new Array(24).fill(0),
                    maxProb: 0,
                    highProbCount: 0,
                    dow: t.getUTCDay()
                };
            }
            const p = probs[i];

            if (daysMap[dayName].probs[hourInTz] !== undefined) {
                daysMap[dayName].probs[hourInTz] = Math.max(daysMap[dayName].probs[hourInTz], p);
            }

            let schedProb = 0;
            if (scheduled && scheduled.length > 0) {
                for (let vid of scheduled) {
                    const startRaw = vid.scheduledStart || vid.availableAt;
                    if (!startRaw) continue;
                    const start = new Date(startRaw).getTime();
                    const now = t.getTime();

                    if (now >= start) {
                        const hoursSinceStart = (now - start) / (1000 * 3600);
                        if (hoursSinceStart < 1.0) {
                            schedProb = Math.max(schedProb, 0.995);
                        } else {
                            const decay = 0.995 / (1 + Math.exp(2 * (hoursSinceStart - 3.27)));
                            schedProb = Math.max(schedProb, decay);
                        }
                    }
                }
            }

            if (daysMap[dayName].scheduledProbs[hourInTz] !== undefined) {
                daysMap[dayName].scheduledProbs[hourInTz] = Math.max(daysMap[dayName].scheduledProbs[hourInTz], schedProb);
            }

            if (p > daysMap[dayName].maxProb) daysMap[dayName].maxProb = p;
            if (schedProb > daysMap[dayName].maxProb) daysMap[dayName].maxProb = schedProb;
            if (p >= MODEL_THRESHOLD || schedProb >= MODEL_THRESHOLD) daysMap[dayName].highProbCount++;
        });

        const finalDays = uniqueDayNames.slice(0, 7).map(name => daysMap[name]);
        if (this.mounted) this.setState({ days: finalDays });
    }

    renderSparkline(probs: number[], scheduledProbs: number[], nowX: number | null = null) {
        const getPoints = (data: number[]) => data.map((p, i) => {
            const x = (i / 23) * 100;
            const val = Math.max(0, Math.min(1, p));
            const y = 95 - (val * 90);
            return `${x},${y}`;
        });

        const mlPoints = getPoints(probs);
        const schedPoints = getPoints(scheduledProbs);

        const mlLine = `M ${mlPoints.join(' L ')}`;
        const mlFill = `M 0,100 L ${mlPoints.join(' L ')} L 100,100 Z`;

        const schedLine = `M ${schedPoints.join(' L ')}`;
        const schedFill = `M 0,100 L ${schedPoints.join(' L ')} L 100,100 Z`;

        const hasSched = scheduledProbs.some(p => p > 0.1);

        return (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%; height:100%; overflow: visible;">
                {hasSched && (
                    <>
                        <path d={schedFill} fill="rgba(33, 150, 243, 0.2)" stroke="none" />
                        <path
                            d={schedLine}
                            stroke="#2196f3"
                            stroke-width="2"
                            fill="none"
                            stroke-dasharray="4"
                            vectorEffect="non-scaling-stroke"
                            style={{ vectorEffect: 'non-scaling-stroke', opacity: 0.8 }}
                        />
                    </>
                )}

                <path d={mlFill} class="sparkline-fill" />
                <path
                    d={mlLine}
                    class="sparkline-path"
                    vectorEffect="non-scaling-stroke"
                    style={{ vectorEffect: 'non-scaling-stroke' }}
                />
                {nowX !== null && (
                    <line
                        x1={nowX} y1="0"
                        x2={nowX} y2="100"
                        stroke="#00bfff"
                        stroke-width="1.5"
                        vectorEffect="non-scaling-stroke"
                        style={{ vectorEffect: 'non-scaling-stroke', opacity: 0.8 }}
                    />
                )}
            </svg>
        );
    }

    handleTimezoneChange = (e: any) => {
        this.setState({ timezone: e.target.value }, () => {
            this.updateView();
        });
    }

    render() {
        const { days, timezone, status, loading } = this.state;

        const now = new Date();
        const todayName = now.toLocaleDateString('en-US', {
            weekday: 'short',
            day: 'numeric',
            timeZone: timezone
        });

        const parts = new Intl.DateTimeFormat('en-US', {
            hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone: timezone
        }).formatToParts(now);
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const currentX = ((h + m / 60) / 23) * 100;

        return (
            <div class="forecast-section">
                <div class="forecast-controls-bar">
                    <h3 class="forecast-header serif">7-DAY KRONIIUM FORECAST</h3>
                    <div class="status-indicator">
                        {loading && <div class="spinner-small"></div>}
                        <span class="status-text">{status}</span>
                    </div>
                    <div class="forecast-actions">
                        <select class="timezone-select" value={timezone} onChange={this.handleTimezoneChange}>
                            <option value={this.localTimezone}>Local ({this.localTimezone})</option>
                            {TIMEZONES.map(tz => <option value={tz.value}>{tz.label}</option>)}
                        </select>
                        <button class="icon-btn material-icons" onClick={this.updateView} title="Refresh" disabled={loading}>refresh</button>
                    </div>
                </div>

                <div class={`forecast-grid ${loading ? 'grid-loading' : ''}`}>
                    {days.map((day) => {
                        const isActive = day.maxProb >= MODEL_THRESHOLD;
                        const isToday = day.name === todayName;
                        const metrics = FORECAST_METRICS[day.dow] || { recall: 0, precision: 0, f1: 0 };

                        const getMetricClass = (val: number, threshold: number) => {
                            if (val === 0) return 'zero';
                            if (val >= threshold) return 'high';
                            return '';
                        };

                        return (
                            <div class="day-container">
                                <div class={`day-card ${isActive ? 'active' : ''}`}>
                                    <span class="day-header">{day.name}</span>
                                    <span class={`material-icons day-icon ${isActive ? 'active' : 'inactive'}`}>
                                        {isActive ? 'alarm_on' : 'alarm_off'}
                                    </span>
                                    <span class="day-prob">{(day.maxProb * 100).toFixed(0)}%</span>
                                    <div class="sparkline-container">
                                        {this.renderSparkline(day.probs, day.scheduledProbs, isToday ? currentX : null)}
                                    </div>
                                </div>
                                <div class="day-metrics" title={`Recall: ${(metrics.recall * 100).toFixed(0)}%, Precision: ${(metrics.precision * 100).toFixed(0)}%, F1: ${metrics.f1.toFixed(2)}`}>
                                    <span class={getMetricClass(metrics.recall, 0.5)}>R:{(metrics.recall * 100).toFixed(0)}</span>
                                    <span class={getMetricClass(metrics.precision, 0.5)}>P:{(metrics.precision * 100).toFixed(0)}</span>
                                    <span class={getMetricClass(metrics.f1, 0.5)}>F1:{metrics.f1.toFixed(2)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}
