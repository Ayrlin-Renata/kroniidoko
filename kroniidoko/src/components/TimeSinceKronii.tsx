import { Component } from "preact"
import { timeSince } from "../utils";

export default class TimeSinceKronii extends Component<{ krdate:Date }> {
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

        return (
            <>
                <h2>{timeSince(this.props.krdate)}</h2>
            </>
        )
    }
}