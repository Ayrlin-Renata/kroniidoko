import { Component } from "preact";
import { getAllData } from "../utils";
import TimeSinceKronii from "./TimeSinceKronii";
import Forecast from "./Forecast";
import StreamCard from "./StreamCard";

type DParams = {
    next: Boolean;
    hideForecast?: Boolean;
    hideSince?: Boolean;
}
type DState = {
    loading: Boolean,
    data: {
        live: boolean,
        krlastdate: Date,
        krlasttitle: string,
        krlastid: string,
        krlasttype: string,
        krnext: boolean,
        krnexttitle: string,
        krnextdate: Date,
        krnextid: string,
        krnexttype: string
    },
    activeStream: any | null,
    tailX: number | null,
    history: any[] | null
}
export default class Doko extends Component<DParams, DState> {

    constructor() {
        super()
        this.state = {
            loading: true,
            data: {
                live: false,
                krlastdate: new Date(),
                krlasttitle: "",
                krlastid: "",
                krlasttype: "",
                krnext: false,
                krnexttitle: "",
                krnextdate: new Date(),
                krnextid: "",
                krnexttype: ""
            },
            activeStream: null,
            tailX: null,
            history: null
        }
    }

    componentDidMount(): void {
        getAllData().then(res => {
            if (this.mounted) {
                this.setState({
                    loading: false,
                    history: res.history,
                    data: {
                        live: res.live,
                        krlastdate: res.krlastdate,
                        krlasttitle: res.krlasttitle,
                        krlastid: res.krlastid,
                        krlasttype: res.krlasttype,
                        krnext: res.krnext,
                        krnexttitle: res.krnexttitle,
                        krnextdate: res.krnextdate,
                        krnextid: res.krnextid,
                        krnexttype: res.krnexttype
                    }
                }, () => {
                    if (this.state.data.krnext) {
                        const nextS = {
                            title: this.state.data.krnexttitle,
                            scheduledStart: this.state.data.krnextdate,
                            id: this.state.data.krnextid,
                            type: this.state.data.krnexttype
                        };
                        this.setState({ activeStream: nextS });
                    }
                });
            }
        });
    }

    mounted = true;
    componentWillUnmount() {
        this.mounted = false;
    }

    handleSelectStream = (stream: any, tailX: number) => {
        this.setState({ activeStream: stream, tailX });
    }

    render(params: DParams) {
        const { loading, data } = this.state;
        const showForecast = !params.hideForecast;
        const showSince = !params.hideSince;

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
                    <h3 class="serif">
                        {data.krnextid && data.krnextid !== 'undefined' && data.krnexttype !== 'placeholder' ? (
                            <a href={"https://youtube.com/watch?v=" + data.krnextid}>{data.krnexttitle}</a>
                        ) : (
                            <span class="disabled-link">{data.krnexttitle}</span>
                        )}
                    </h3>
                    {showForecast && <Forecast onSelectStream={this.handleSelectStream} initialHistory={this.state.history} />}
                </>
            );
        }
        return (
            <>
                <div class="doko-section">
                    <h3 class="serif section-header">THE WARDEN HAS BEEN AWAY FOR</h3>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <TimeSinceKronii krdate={data.krlastdate} transparent={!showForecast} />
                    </div>
                </div>

                {showSince && (
                    <div class="doko-section" id="laststream">
                        <h3 class="serif section-header">NO KRONIIUM SINCE</h3>
                        <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                            <div class={`info-card-box ${!showForecast ? 'transparent' : ''}`}>
                                <h2 class="date-display">{krlastdatetimestr}</h2>
                            </div>
                        </div>
                        {showForecast && data.krlasttitle && (
                            <h3 class="serif">
                                AT {data.krlastid && data.krlastid !== 'undefined' && data.krlasttype !== 'placeholder' ? (
                                    <a href={"https://youtube.com/watch?v=" + data.krlastid}>{data.krlasttitle}</a>
                                ) : (
                                    <span class="disabled-link">{data.krlasttitle}</span>
                                )}
                            </h3>
                        )}
                    </div>
                )}
                {
                    (params.next) ?
                        (this.state.activeStream || data.krnext) ?
                            (
                                <StreamCard
                                    title={this.state.activeStream ? this.state.activeStream.title : data.krnexttitle}
                                    id={this.state.activeStream ? (this.state.activeStream.videoId || this.state.activeStream.id) : data.krnextid}
                                    type={this.state.activeStream ? this.state.activeStream.type : data.krnexttype}
                                    dateStr={this.state.activeStream
                                        ? new Date(this.state.activeStream.scheduledStart || this.state.activeStream.availableAt).toLocaleString()
                                        : krnextdatetimestr}
                                    tailX={this.state.tailX || undefined}
                                />
                            ) : (
                                <div class="no-stream-msg">
                                    <h3 class="serif">NO NEXT STREAM CURRENTLY SCHEDULED</h3>
                                    <p class="lowtext">according to holodex...</p>
                                </div>
                            )
                        : (<></>)
                }
                {showForecast && <Forecast onSelectStream={this.handleSelectStream} initialHistory={this.state.history} />}
            </>
        );
    }
}
