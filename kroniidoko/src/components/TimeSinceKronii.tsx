import { Component } from "preact"
import { timeSince } from "../utils";

export default class TimeSinceKronii extends Component<{ krdate:Date }> {
    constructor() {
        super();
        this.state = { time: Date.now() };
    }

    componentDidMount() {
        //@ts-ignore
        this.timer = setInterval(() => {
            this.setState({ time: Date.now() });
        }, 1000);
    }

    componentWillUnmount() {
        //@ts-ignore   
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