import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { decodeSpectrum } from './spectraDecoder';

const orderByInfo = (decoded, infos) => {
  const idxToOrder = new Map();
  infos.forEach((info, idx) => {
    if (info?.idx != null && !idxToOrder.has(info.idx)) {
      idxToOrder.set(info.idx, idx);
    }
  });
  const fallback = infos.length;
  return decoded.slice().sort((a, b) => {
    const ai = idxToOrder.has(a.idx) ? idxToOrder.get(a.idx) : fallback;
    const bi = idxToOrder.has(b.idx) ? idxToOrder.get(b.idx) : fallback;
    return ai - bi;
  });
};

export const loadCompareSpectra = async (infos, deps = {}) => {
  const fetchFiles = deps.fetchFiles || AttachmentFetcher.fetchFiles.bind(AttachmentFetcher);
  if (!Array.isArray(infos) || infos.length === 0) {
    return { spectra: [], failures: [] };
  }

  const ids = infos.map((info) => info.idx).filter((id) => id != null);
  if (ids.length === 0) return { spectra: [], failures: [] };

  let fetched;
  try {
    fetched = await fetchFiles(ids);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    error.compareLoad = true;
    throw error;
  }

  const files = Array.isArray(fetched?.files) ? fetched.files : [];
  if (files.length === 0) {
    return {
      spectra: [],
      failures: infos.map((info) => ({ info, reason: 'no-file' })),
    };
  }

  const fileById = new Map();
  files.forEach((file) => {
    if (file?.id != null) fileById.set(file.id, file);
  });

  const failures = [];
  const decoded = [];
  infos.forEach((info) => {
    const file = fileById.get(info.idx);
    if (!file) {
      failures.push({ info, reason: 'missing-file' });
      return;
    }
    const spc = decodeSpectrum(file);
    if (!spc) {
      failures.push({ info, reason: 'decode-failed' });
      return;
    }
    decoded.push(spc);
  });

  return {
    spectra: orderByInfo(decoded, infos),
    failures,
  };
};

export default loadCompareSpectra;
