import base64 from 'base-64';
import { FN } from '@complat/react-spectra-editor';

const DEFAULT_PRED = Object.freeze({
  outline: {},
  output: { result: [] },
});

export const decodeSpectrum = (target) => {
  if (!target) return null;
  const { file, predictions, id } = target;
  if (!file) return null;

  let spectrum = { predictions: DEFAULT_PRED, idx: id };
  if (predictions?.outline?.code) {
    spectrum = { ...spectrum, predictions };
  }

  let raw;
  try {
    raw = new TextDecoder('utf-8').decode(
      new Uint8Array([...base64.decode(file)].map((ch) => ch.charCodeAt(0))),
    );
  } catch (err) {
    return null;
  }

  let jcamp;
  try {
    jcamp = FN.ExtractJcamp(raw);
  } catch (err) {
    return null;
  }

  const lcmsMzPageMatch = raw.match(/^##\$CSLCMSMZPAGE\s*=\s*"?([0-9.+\-Ee]+)"?/mi);
  const lcmsMzPage = lcmsMzPageMatch ? Number(lcmsMzPageMatch[1]) : null;
  if (Number.isFinite(lcmsMzPage) && !Number.isFinite(jcamp?.lcms_mz_page)) {
    jcamp.lcms_mz_page = lcmsMzPage;
    jcamp.lcmsMzPage = lcmsMzPage;
  }

  if (!jcamp || !jcamp.spectra) return null;
  return { ...spectrum, jcamp };
};

export const decodeSpectra = (fetchedFiles = {}) => {
  const files = fetchedFiles?.files;
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => decodeSpectrum(file))
    .filter((spec) => spec != null);
};

export const DEFAULT_PREDICTIONS = DEFAULT_PRED;
