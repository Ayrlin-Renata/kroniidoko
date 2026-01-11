import { HolodexApiClient, Video } from 'holodex.js';

// Configuration & Obfuscation
const THEME_CACHE = {
    // Channel ID for Kronii
    CHANNEL_ID: "UCmbs8T6MWqUHP1tIQvSgKrg",
    // Encrypted API Key components
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
    // Reconstruct the obfuscated password
    const p1 = "x9#mK2$v";
    const p2 = "Lp@8&zQ1";
    const p3 = "!dY4nB5^";
    const p4 = "wJ7(rT0)";
    const seed = p1 + p2 + p3 + p4;
    return await loadTheme(seed);
}

// --- Client Management ---
let clientInstance: HolodexApiClient | null = null;

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
        // Only fallback if strictly necessary, but prefer the decrypted key
        key = import.meta.env.VITE_HOLODEX_API_KEY || "";
    }

    clientInstance = new HolodexApiClient({ apiKey: key });
    return clientInstance;
}

// --- Data Fetching ---

export async function getKrData() {
    const client = await getClient();

    const krlastvideo = await getPastStream(client);
    let krnextvideo;
    const live = await isLive(client);
    if (live) {
        krnextvideo = await getStream(client, "live");
    } else {
        krnextvideo = await getStream(client, "upcoming");
    }

    let krnext = !!krnextvideo;
    if (!krnext) {
        return {
            live: live,
            krlastdate: krlastvideo?.actualEnd || krlastvideo?.availableAt || new Date(),
            krnext: krnext,
            krnexttitle: "",
            krnextdate: new Date(),
            krnextid: ""
        } as any;
    }
    return {
        live: live,
        krlastdate: krlastvideo?.actualEnd || krlastvideo?.availableAt || new Date(),
        krnext: !!krnextvideo,
        krnexttitle: krnextvideo.title || "",
        krnextdate: krnextvideo.scheduledStart || krnextvideo.availableAt,
        krnextid: krnextvideo.videoId
    }
}

async function isLive(client: HolodexApiClient) {
    const video = await getStream(client, "live");
    return !!video;
}

async function getPastStream(client: HolodexApiClient) {
    const videos = await client.getVideos({
        channel_id: THEME_CACHE.CHANNEL_ID,
        include: ["live_info", "mentions"],
        limit: 1,
        type: "stream",
        status: "past",
    } as any);
    return videos[0];
}

async function getStream(client: HolodexApiClient, when: "live" | "upcoming") {
    const videos = await client.getLiveVideos({
        channel_id: THEME_CACHE.CHANNEL_ID,
        include: ["live_info", "mentions"],
        limit: 10,
        type: "stream",
        status: when,
    } as any);
    return videos[0];
}

export async function getForecastHistory(): Promise<Video[]> {
    const client = await getClient();
    const videos = await client.getVideos({
        channel_id: THEME_CACHE.CHANNEL_ID,
        type: "stream",
        status: ["live", "past"],
        limit: 50,
        order: 'desc'
    } as any);

    return videos;
}