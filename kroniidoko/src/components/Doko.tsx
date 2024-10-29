import { Component } from "preact";
import { getKrData } from "../utils";
import TimeSinceKronii from "./TimeSinceKronii";


export default class Doko extends Component {

    constructor() {
        super()
        this.state = {
            loading: Boolean,
            data: {
                live: Boolean,
                krdate: Date
            }
        }
    }

    componentDidMount(): void {
        getKrData().then(res => this.setState({
            loading: false,
            data: {
                live: res.live,
                krdate: res.krdate
            }
        }));
    }

    render() {
        //@ts-ignore
        const { loading, data } = this.state;
        if(loading) {
            return (
                <>
                    <h3>loading...</h3>
                </>
            );
        } 
        const krdatetimestr = `${data.krdate.toLocaleDateString()} ${data.krdate.toLocaleTimeString()}`

        if (data.live) {
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
                <TimeSinceKronii krdate={data.krdate} />
                <h3>AGO</h3>
            </>
        );
    }

}