import { Component } from "preact";
import { lastStreamDate, isLive } from "../utils";
import TimeSinceKronii from "./TimeSinceKronii";

const live = await isLive();
const krdate: Date = await lastStreamDate();
const krdatetimestr = `${krdate.toLocaleDateString()} ${krdate.toLocaleTimeString()}`

export default class Doko extends Component {

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
                <TimeSinceKronii krdate={krdate}/>
                <h3>AGO</h3>
            </>
        );
    }

}