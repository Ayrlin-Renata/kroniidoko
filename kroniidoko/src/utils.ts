import { HolodexApiClient, Video } from 'holodex.js';

const THEME_CACHE = {
    CHANNEL_ID: "UCmbs8T6MWqUHP1tIQvSgKrg",
    _render_blob: "22bf77d829a1a8daf179a55c7f940aa9f84aea2c7f9f40bdcd2c57706bf6193459720e42117dc46052cf50b59c937b0d3efec01e",
    _style_ref: "4a9e6f6f65b402411f85d9d2a5f17cd0",
    _layout_token: "53a5a9d1c253091703aad26f",
};

function _hexToBuf(hex: string): Uint8Array {
    const match = hex.match(/.{1,2}/g);
    if (!match) return new Uint8Array();
    return new Uint8Array(match.map(byte => parseInt(byte, 16)));
}

async function _parseStyle(seed: string, ref: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const mat = await crypto.subtle.importKey(
        "raw", enc.encode(seed), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: _hexToBuf(ref) as any,
            iterations: 100000,
            hash: "SHA-256"
        },
        mat,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );
}

async function loadTheme(seed: string): Promise<string | null> {
    try {
        if (!THEME_CACHE._render_blob) return null;
        const styleKey = await _parseStyle(seed, THEME_CACHE._style_ref);
        const raw = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: _hexToBuf(THEME_CACHE._layout_token) as any },
            styleKey,
            _hexToBuf(THEME_CACHE._render_blob) as any
        );
        return new TextDecoder().decode(raw);
    } catch (e) {
        console.error("Theme load error:", e);
        return null;
    }
}

async function getDecryptedKey(): Promise<string | null> {
    const p1 = "x9#mK2$v";
    const p2 = "Lp@8&zQ1";
    const p3 = "!dY4nB5^";
    const p4 = "wJ7(rT0)";
    const seed = p1 + p2 + p3 + p4;
    return await loadTheme(seed);
}

let clientInstance: HolodexApiClient | null = null;

let schedulePromise: Promise<Video[]> | null = null;
let scheduleTimestamp = 0;

async function getClient(): Promise<HolodexApiClient> {
    if (clientInstance) return clientInstance;

    let key = "";
    try {
        const decrypted = await getDecryptedKey();
        if (decrypted) key = decrypted;
    } catch (e) {
        console.warn("Failed to decrypt key, checking fallbacks...");
    }

    if (!key) {
        key = import.meta.env.VITE_HOLODEX_API_KEY || "";
    }

    clientInstance = new HolodexApiClient({ apiKey: key });
    return clientInstance;
}

// /live w/ mentions
async function fetchLiveAndUpcoming_Legacy(): Promise<Video[]> {
    if (schedulePromise && (Date.now() - scheduleTimestamp < 60000)) {
        return schedulePromise;
    }

    scheduleTimestamp = Date.now();
    schedulePromise = (async () => {
        const client = await getClient();

        const params = {
            include: ["live_info"],
            limit: 50,
            type: ["stream", "placeholder"],
            status: ["upcoming", "live"],
            order: 'asc'
        } as any;

        try {
            const [direct, mentions] = await Promise.all([
                client.getLiveVideos({ ...params, channel_id: THEME_CACHE.CHANNEL_ID, includePlaceholder: true }),
                client.getLiveVideos({ ...params, mentioned_channel_id: THEME_CACHE.CHANNEL_ID })
            ]);

            const all = [...direct, ...mentions];
            const unique = Array.from(new Map(all.map(v => [v.videoId, v])).values());

            unique.sort((a, b) => {
                const dA = new Date(a.scheduledStart || a.availableAt || 0).getTime();
                const dB = new Date(b.scheduledStart || b.availableAt || 0).getTime();
                return dA - dB;
            });

            return unique;
        } catch (e) {
            console.error("Failed to fetch schedule", e);
            return [];
        }
    })();

    return schedulePromise;
}

// users/live
async function fetchLiveAndUpcoming(): Promise<Video[]> {
    if (schedulePromise && (Date.now() - scheduleTimestamp < 60000)) {
        return schedulePromise;
    }

    scheduleTimestamp = Date.now();
    schedulePromise = (async () => {
        const client = await getClient();
        try {
            // @ts-ignore - need to use includePlaceholder
            const { data } = await client.httpClient.get(`/users/live?channels=${THEME_CACHE.CHANNEL_ID}&includePlaceholder=true`);
            const videos = data.map((v: any) => new Video(v));

            // Ensure sorting just in case API doesnt
            videos.sort((a: Video, b: Video) => {
                const dA = new Date(a.scheduledStart || a.availableAt || 0).getTime();
                const dB = new Date(b.scheduledStart || b.availableAt || 0).getTime();
                return dA - dB;
            });

            return videos;
        } catch (e) {
            console.error("Failed to fetch schedule (optimized)", e);
            try {
                scheduleTimestamp = 0;
                return await fetchLiveAndUpcoming_Legacy();
            } catch (e2) {
                console.error("Legacy fallback also failed", e2);
            }
            return [];
        }
    })();
    return schedulePromise;
}

export async function getKrData() {
    const client = await getClient();
    const krlastvideo = await getPastStream(client);

    const relevantStreams = await fetchLiveAndUpcoming();

    const liveVideo = relevantStreams.find(v => v.status === 'live');
    const isLive = !!liveVideo;

    let krnextvideo = liveVideo;
    if (!krnextvideo) {
        krnextvideo = relevantStreams.find(v => v.status === 'upcoming');
    }

    let krnext = !!krnextvideo;
    if (!krnext) {
        return {
            live: isLive,
            krlastdate: krlastvideo?.actualEnd || krlastvideo?.availableAt || new Date(),
            krnext: false,
            krnexttitle: "",
            krnextdate: new Date(),
            krnextid: ""
        } as any;
    }
    return {
        live: isLive,
        krlastdate: krlastvideo?.actualEnd || krlastvideo?.availableAt || new Date(),
        krnext: true,
        krnexttitle: krnextvideo?.title || "",
        krnextdate: krnextvideo?.scheduledStart || krnextvideo?.availableAt,
        krnextid: krnextvideo?.videoId
    }
}

let pastPromise: Promise<Video> | null = null;
let pastTimestamp = 0;

async function getPastStream(client: HolodexApiClient) {
    if (pastPromise && (Date.now() - pastTimestamp < 60000)) {
        return pastPromise;
    }

    pastTimestamp = Date.now();
    pastPromise = (async () => {
        const videos = await client.getVideos({
            channel_id: THEME_CACHE.CHANNEL_ID,
            include: ["live_info"],
            limit: 1,
            type: "stream",
            status: "past",
        } as any);
        return videos[0];
    })();

    return pastPromise;
}

export async function getScheduledStreams() {
    const videos = await fetchLiveAndUpcoming();
    return videos;
}

export async function getForecastHistory(): Promise<Video[]> {
    const client = await getClient();
    const videos = await client.getVideos({
        channel_id: THEME_CACHE.CHANNEL_ID,
        type: "stream",
        status: ["live", "past"],
        include: [],  // prevent 'undefined'
        limit: 50,
        order: 'desc'
    } as any);

    return videos;
}