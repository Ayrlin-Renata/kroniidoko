import { Component } from "preact";
import "./TimeSinceKronii.css";

export default class TimeSinceKronii extends Component<{ krdate: Date, transparent?: boolean }> {
    timer: any;

    constructor() {
        super();
        this.state = { time: Date.now() };
    }

    componentDidMount() {
        this.timer = setInterval(() => {
            this.setState({ time: Date.now() });
        }, 1000);
    }

    componentWillUnmount() {
        clearInterval(this.timer);
    }

    render() {
        const { krdate, transparent } = this.props;
        const now = new Date();
        const diff = Math.max(0, Math.floor((now.getTime() - krdate.getTime()) / 1000));

        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');

        return (
            <div class={`info-card-box ${transparent ? 'transparent' : ''}`}>
                <div class="time-unit">
                    <span class="time-val tabular">{days}</span>
                    <span class="time-label">days</span>
                </div>
                <div class="time-unit">
                    <span class="time-val tabular">{pad(hours)}</span>
                    <span class="time-label">hours</span>
                </div>
                <div class="time-unit">
                    <span class="time-val tabular">{pad(minutes)}</span>
                    <span class="time-label">minutes</span>
                </div>
                <div class="time-unit">
                    <span class="time-val tabular">{pad(seconds)}</span>
                    <span class="time-label">seconds</span>
                </div>
            </div>
        );
    }
}