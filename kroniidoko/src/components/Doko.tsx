import { Component } from "preact";
import { lastStreamDate, timeSince, isLive } from "../utils";

const live = await isLive();
const krdate: Date = await lastStreamDate();
const krdatetimestr = `${krdate.toLocaleDateString()} ${krdate.toLocaleTimeString()}`

export default class Doko extends Component {

    constructor() {
        super();
        this.state = { time: Date.now() };
    }

    // Called whenever our component is created
    componentDidMount() {
        // update time every second
        this.timer = setInterval(() => {
            this.setState({ time: Date.now() });
        }, 1000);
    }

    // Called just before our component will be destroyed
    componentWillUnmount() {
        // stop when not renderable
        clearInterval(this.timer);
    }

    render() {
        if (live) {
            return (
                <>
                    <h3>KRONII KOKO</h3>
                </>
            );
        }
        return (
            <>
                <h3>NO KRONIIUM SINCE</h3>
                <h2>{krdatetimestr}</h2>
                <h3>WHICH IS ABOUT</h3>
                <h2>{timeSince(krdate)}</h2>
                <h3>AGO</h3>
            </>
        );
    }

}