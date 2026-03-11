import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
// f:/Fun/Dev/kroniidoko/forecast/web/model_constants_v3.js
// f:/Fun/Dev/kroniidoko/kroniidoko/kroniidoko/script/sync_forecast_constants.js
const referencePath = path.resolve(__dirname, '../../../forecast/web/model_constants_v3.js');
const targetPath = path.resolve(__dirname, '../src/components/ForecastConstants.ts');

if (!fs.existsSync(referencePath)) {
    console.error(`Error: Reference file not found at ${referencePath}`);
    process.exit(1);
}

const content = fs.readFileSync(referencePath, 'utf8');
const match = content.match(/const MODEL_V3 = (\{[\s\S]*?\});/);
if (!match) {
    console.error("Error: Could not parse MODEL_V3 from reference file.");
    process.exit(1);
}

const MODEL_V3 = JSON.parse(match[1]);

const generateTS = (model) => {
    // Helper to format dictionaries
    const formatDict = (dict) => {
        return '{\n' + Object.entries(dict).map(([k, v]) => `  "${k}": ${v}`).join(',\n') + '\n}';
    };

    const heatmap = model.PRIORS.heatmap;
    const heatmapArray = [];
    for (let i = 0; i < 168; i++) {
        heatmapArray.push(heatmap[i.toFixed(1)] || 0.0);
    }

    const dowPriors = [];
    for (let i = 0; i < 7; i++) {
        dowPriors.push(model.PRIORS.dow[i.toFixed(1)] || 0.0);
    }

    return `export const MODEL_THRESHOLD = ${model.INFERENCE_THRESHOLD || 0.54};

export const SHARPNESS = ${model.SHARPNESS};

export const HEATMAP_PRIOR_DICT: Record<string, number> = ${formatDict(model.PRIORS.heatmap)};

export const DOW_PRIORS_DICT: Record<string, number> = ${formatDict(model.PRIORS.dow)};

export const FORECAST_METRICS = ${JSON.stringify(Object.values(model.METRICS_PER_DAY.days), null, 2)};

export const DOW_PROBABILITY_SCALES = ${JSON.stringify(model.DOW_PROBABILITY_SCALES)};

export const DOW_PRIORS = ${JSON.stringify(dowPriors)};

export const HORIZON_METRICS: Record<string, { f1: number, precision: number, recall: number }> = ${JSON.stringify(model.METRICS_PER_DAY.horizons, null, 2)};

export const CALIBRATION = ${JSON.stringify(model.CALIBRATION, null, 2)};
`;
};

const tsContent = generateTS(MODEL_V3);
fs.writeFileSync(targetPath, tsContent);
console.log(`Successfully synced ${targetPath} with ${referencePath}`);
