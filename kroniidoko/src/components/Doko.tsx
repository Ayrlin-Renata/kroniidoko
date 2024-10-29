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
                krlastdate: Date,
                krnext: Boolean,
                krnexttitle: String,
                krnextdate: Date,
                krnextid: String
            }
        }
    }

    componentDidMount(): void {
        getKrData().then(res => this.setState({
            loading: false,
            data: {
                live: res.live,
                krlastdate: res.krlastdate,
                krnext: res.krnext,
                krnexttitle: res.krnexttitle,
                krnextdate: res.krnextdate,
                krnextid: res.krnextid
            }
        }));
    }

    render() {
        //@ts-ignore
        const { loading, data } = this.state;
        if (loading) {
            return (
                <>
                    <h3>asking holodex nicely...</h3>
                </>
            );
        }
        const krlastdatetimestr = `${data.krlastdate.toLocaleDateString()} ${data.krlastdate.toLocaleTimeString()}`
        const krnextdatetimestr = `${data.krnextdate.toLocaleDateString()} ${data.krnextdate.toLocaleTimeString()}`

        if (data.live) {
            return (
                <>
                    <h2 class="serif">KRONII KOKO!!!</h2>
                    <h3 class="serif"><a href={"https://youtube.com/watch?v=" + data.krnextid}>{data.krnexttitle}</a></h3>
                </>
            );
        }
        return (
            <>
                <h3 class="serif">NO KRONIIUM SINCE</h3>
                <h2>{krlastdatetimestr}</h2>
                <br/>
                <h3 class="serif">THE WARDEN HAS BEEN AWAY FOR</h3>
                <TimeSinceKronii krdate={data.krlastdate} />
                <br/>
                {
                    (data.krnext) ?
                        (
                            <>
                                <h3 class="serif">NEXT SCHEDULED STREAM</h3>
                                <h3 class="serif"><a href={"https://youtube.com/watch?v=" + data.krnextid}>{data.krnexttitle}</a></h3>
                                <h3>{"at " + krnextdatetimestr}</h3>
                            </>
                        ) : (
                            <>
                                <br/>
                                <h3 class="serif">NO NEXT STREAM CURRENTLY SCHEDULED</h3>
                                <p class="lowtext">according to the holodex API...</p>
                            </>
                        )
                }
            </>
        );
    }

}