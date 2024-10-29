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
                krnexttitle: String,
                krnextdate: Date
            }
        }
    }

    componentDidMount(): void {
        getKrData().then(res => this.setState({
            loading: false,
            data: {
                live: res.live,
                krlastdate: res.krlastdate,
                krnexttitle: res.krnexttitle,
                krnextdate: res.krnextdate
            }
        }));
    }

    render() {
        //@ts-ignore
        const { loading, data } = this.state;
        if (loading) {
            return (
                <>
                    <h3>loading...</h3>
                </>
            );
        }
        const krdatetimestr = `${data.krlastdate.toLocaleDateString()} ${data.krlastdate.toLocaleTimeString()}`

        if (data.live) {
            return (
                <>
                    <h2 class="serif">KRONII KOKO!!!</h2>
                </>
            );
        }
        return (
            <>
                <h3 class="serif">NO KRONIIUM SINCE</h3>
                <h2>{krdatetimestr}</h2>
                <h3 class="serif">WHICH IS ABOUT</h3>
                <TimeSinceKronii krdate={data.krlastdate} />
                <h3 class="serif">AGO</h3>
                {
                    (data.krnext) ?
                        (
                            <>
                                <h3 class="serif">NEXT STREAM:</h3>
                                <h2>{data.krnexttitle}</h2>
                                <h2>{data.krnextdate}</h2>
                            </>
                        ) : (
                            <>
                                <br/>
                                <h3 class="serif">NO NEXT STREAM CURRENTLY SCHEDULED</h3>
                            </>
                        )
                }
            </>
        );
    }

}