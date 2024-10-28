import { HolodexApiClient, VideoStatus, VideoType } from 'holodex.js';

const client = new HolodexApiClient({
    apiKey: import.meta.env.VITE_HOLODEX_API_KEY
});

export async function isLive() {
    const videos = await client.getVideos({
        channel_id: import.meta.env.VITE_CHANNEL_ID,
        include: "live_info",
        limit: 1,
        type: VideoType.Stream,
        status: VideoStatus.Live,
    });

    return !(!Array.isArray(videos) || !videos.length);
}

export async function lastStreamDate() {
    
    const videos = await client.getVideos({
        channel_id: import.meta.env.VITE_CHANNEL_ID,
        include: "live_info",
        limit: 1,
        type: VideoType.Stream,
        status: VideoStatus.Past,
    });
    return videos[0].availableAt;
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
    return outstr + (outstr? "and " : "") + secs + (secs > 1? " seconds" : " second");
}