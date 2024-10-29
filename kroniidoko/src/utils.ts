import { HolodexApiClient, VideoStatus, VideoType } from 'holodex.js';

const client = new HolodexApiClient({
    apiKey: import.meta.env.VITE_HOLODEX_API_KEY
});

export async function getKrData() {
    //@ts-ignore
    const krnextvideo = await getStream(VideoStatus.Upcoming);
    console.log(krnextvideo)

    return {
        live: await isLive(),
        //@ts-ignore
        krlastdate: (await getStream(VideoStatus.Past)).availableAt,
        krnext: !!krnextvideo,
        krnexttitle: krnextvideo.title || "",
        krnextdate: krnextvideo.availableAt,
    }
}

async function isLive() {
    //@ts-ignore
    const videos = getStream(VideoStatus.Live)
    return !(!Array.isArray(videos) || !videos.length);
}

async function getStream(when: VideoStatus) {
    const videos = await client.getVideos({
        channel_id: import.meta.env.VITE_CHANNEL_ID,
        include: "live_info",
        limit: 1,
        //@ts-ignore
        type: VideoType.Stream,
        status: when,
    });
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