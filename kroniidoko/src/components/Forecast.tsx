import { Component } from "preact";
import * as ort from "onnxruntime-web";
import { getForecastHistory, getScheduledStreams } from "../utils";
import "./Forecast.css";

ort.env.wasm.wasmPaths = "./";

const MODEL_THRESHOLD = 0.5;
interface DayForecast {
    name: string;
    probs: number[];
    scheduledProbs: number[];
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
            status: "Initializing...",
            days: [],
            timezone: this.localTimezone
        };
    }

    async componentDidMount() {
        this.mounted = true;
        try {
            this.session = await ort.InferenceSession.create("model.onnx", {
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

        const lastStream = history[0];
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
                if (!vid.actualStart) continue; const start = new Date(vid.actualStart).getTime();
                if (start >= tTime && start < tTime + 3600000) {
                    return 1.0;
                }
            }
            return 0.0;
        };

        for (let i = 0; i < 200; i++) {
            const t = new Date(current.getTime() + i * 3600 * 1000);
            times.push(t);

            const hour = t.getUTCHours();
            const dow = t.getUTCDay();

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

        try {
            const tensor = new ort.Tensor('float32', Float32Array.from(inputs), [200, 9]);
            const feeds = { float_input: tensor };
            const results = await this.session.run(feeds);

            const outputKey = this.session.outputNames[1] || this.session.outputNames[0];
            const probs = results[outputKey].data as Float32Array;

            const streamProbs: number[] = [];
            for (let i = 0; i < 200; i++) {
                streamProbs.push(probs[i * 2 + 1]);
            }

            const scheduled = await getScheduledStreams();
            this.processForecast(times, streamProbs, scheduled);
            if (this.mounted) this.setState({ status: "Ready" });

        } catch (e) {
            console.error("Inference Error", e);
            if (this.mounted) this.setState({ status: "Prediction Error" });
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
                    highProbCount: 0
                };
            }
            const p = probs[i];

            if (daysMap[dayName].probs[hourInTz] !== undefined) {
                daysMap[dayName].probs[hourInTz] = p;
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
                daysMap[dayName].scheduledProbs[hourInTz] = schedProb;
            }

            if (p > daysMap[dayName].maxProb) daysMap[dayName].maxProb = p;
            if (schedProb > daysMap[dayName].maxProb) daysMap[dayName].maxProb = schedProb;
            if (p >= MODEL_THRESHOLD || schedProb >= MODEL_THRESHOLD) daysMap[dayName].highProbCount++;
        });

        const finalDays = uniqueDayNames.slice(0, 7).map(name => daysMap[name]);

        this.setState({ days: finalDays });
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
        const { days, timezone } = this.state;

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
                        const isToday = day.name === todayName;
                        return (
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
                        );
                    })}
                </div>
            </div>
        );
    }
}
