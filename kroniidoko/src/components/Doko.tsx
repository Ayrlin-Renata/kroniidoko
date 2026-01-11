import { Component } from "preact";
import { getKrData } from "../utils";
import TimeSinceKronii from "./TimeSinceKronii";
import Forecast from "./Forecast";

type DParams = {
    next: Boolean;
    hideForecast?: Boolean;
}
type DState = {
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
export default class Doko extends Component<DParams, DState> {

    constructor() {
        super()
        this.state = {
            loading: true,
            data: {
                live: false,
                krlastdate: new Date(),
                krnext: false,
                krnexttitle: "",
                krnextdate: new Date(),
                krnextid: ""
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

    render(params: DParams) {
        const { loading, data } = this.state;
        const showForecast = !params.hideForecast;

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
                    {showForecast && <Forecast />}
                </>
            );
        }
        return (
            <>
                <div style={{ margin: "2rem 0" }}>
                    <h3 class="serif" style={{ marginBottom: "1rem" }}>THE WARDEN HAS BEEN AWAY FOR</h3>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <TimeSinceKronii krdate={data.krlastdate} transparent={!showForecast} />
                    </div>
                </div>

                <div style={{ margin: "2rem 0" }}>
                    <h3 class="serif" style={{ marginBottom: "1rem" }}>NO KRONIIUM SINCE</h3>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div class={`info-card-box ${!showForecast ? 'transparent' : ''}`}>
                            <h2 class="date-display">{krlastdatetimestr}</h2>
                        </div>
                    </div>
                </div>
                <br />
                {
                    (params.next) ?
                        (data.krnext) ?
                            (
                                <>
                                    <h3 class="serif">NEXT SCHEDULED STREAM</h3>
                                    <h3 class="serif"><a href={"https://youtube.com/watch?v=" + data.krnextid}>{data.krnexttitle}</a></h3>
                                    <h3>{"at " + krnextdatetimestr}</h3>
                                </>
                            ) : (
                                <>
                                    <h3 class="serif">NO NEXT STREAM CURRENTLY SCHEDULED</h3>
                                    <p class="lowtext">according to the holodex API...</p>
                                </>
                            )
                        : (<></>)
                }
                {showForecast && <Forecast />}
            </>
        );
    }

}