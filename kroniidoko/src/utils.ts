import { HolodexApiClient, VideoStatus, VideoType } from 'holodex.js';

const client = new HolodexApiClient({
    apiKey: import.meta.env.VITE_HOLODEX_API_KEY
});

export async function getKrData() {
    //@ts-ignore
    const krlastvideo = await getPastStream(VideoStatus);
    //@ts-ignore
    let krnextvideo;
    const live = await isLive();
    if(live) {
        //@ts-ignore
        krnextvideo = await getStream(VideoStatus.Live);
    } else {
        //@ts-ignore
        krnextvideo = await getStream(VideoStatus.Upcoming);
    }

    let krnext = !!krnextvideo; 
    if (!krnext) {
        return {
            live: live,
            krlastdate: krlastvideo.actualEnd || krlastvideo.availableAt,
            krnext: krnext,
            krnexttitle: "",
            krnextdate: new Date(),
            krnextid: ""
        }
    } 
    return {
        live: live,
        krlastdate: krlastvideo.actualEnd || krlastvideo.availableAt,
        krnext: !!krnextvideo,
        krnexttitle: krnextvideo.title || "",
        krnextdate: krnextvideo.scheduledStart || krnextvideo.availableAt,
        krnextid: krnextvideo.videoId
    }
}

async function isLive() {
    //@ts-ignore
    const video = await getStream(VideoStatus.Live)
    return !!video;
}

async function getPastStream() {
    const videos = await client.getVideos({
        channel_id: import.meta.env.VITE_CHANNEL_ID,
        include: "live_info",
        limit: 1,
        //@ts-ignore
        type: VideoType.Stream,
        //@ts-ignore
        status: VideoStatus.Past,
    });
    return videos[0];
}

async function getStream(when: VideoStatus) {
    const videos = await client.getLiveVideos({
        channel_id: import.meta.env.VITE_CHANNEL_ID,
        include: "live_info",
        limit: 10,
        //@ts-ignore
        type: VideoType.Stream,
        status: when,
    });
    //if(when == VideoStatus.Upcoming) { console.log(videos)}
    return videos[0];
}

export function timeSince(date: Date) {
    let outstr = "";
    let seconds: number = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;

    if (interval > 1) {
        outstr += Math.floor(interval) + " years, ";
        seconds -= Math.floor(interval) * 31536000;
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        outstr += Math.floor(interval) + " months, ";
        seconds -= Math.floor(interval) * 2592000;
    }
    interval = seconds / 86400;
    if (interval > 1) {
        outstr += Math.floor(interval) + " days, ";
        seconds -= Math.floor(interval) * 86400;
    }
    interval = seconds / 3600;
    if (interval > 1) {
        outstr += Math.floor(interval) + " hours, ";
        seconds -= Math.floor(interval) * 3600;
    }
    interval = seconds / 60;
    if (interval > 1) {
        outstr += Math.floor(interval) + " minutes, ";
        seconds -= Math.floor(interval) * 60;
    }
    const secs = Math.floor(seconds);
    return outstr + (outstr? "and " : "") + secs + ((secs == 0 || secs > 1)? " seconds" : " second");
}