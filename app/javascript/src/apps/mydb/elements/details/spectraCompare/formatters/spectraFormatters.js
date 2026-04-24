import { FN } from '@complat/react-spectra-editor';
import { SpectraOps } from 'src/utilities/quillToolbarSymbol';

const NMR_LAYOUTS = ['1H', '13C', '15N', '19F', '29Si', '31P'];

const firstFeature = (entity) => {
  const features = entity?.features;
  if (Array.isArray(features)) return features[0] || {};
  return (features?.editPeak || features?.autoPeak || features) || {};
};

const observeFreqStr = (feature) => {
  let freq = Array.isArray(feature?.observeFrequency)
    ? feature.observeFrequency[0]
    : feature?.observeFrequency;
  if (Array.isArray(freq)) freq = freq[0];
  return freq ? `${parseInt(freq, 10)} MHz, ` : '';
};

const solventStr = (selectedShift, decimal) => {
  const ref = selectedShift?.ref;
  if (!ref?.label || !ref?.name) return '';
  const cleanedName = ref.name.split('(')[0].trim();
  return `${cleanedName} [${ref.value.toFixed(decimal)} ppm], `;
};

export const formatPks = ({
  entity,
  peaks,
  shift,
  layout,
  isAscend,
  decimal,
  body,
  isIntensity,
  integration,
  curveSt,
  waveLength,
}) => {
  const layoutOpsObj = SpectraOps[layout];
  if (!layoutOpsObj || !entity) return [];

  const curveIdx = curveSt?.curveIdx ?? 0;
  const selectedShift = shift?.shifts?.[curveIdx] ?? shift;
  const selectedIntegration = integration?.integrations?.[curveIdx] ?? integration;
  if (!selectedShift || !selectedIntegration) return [];

  const f0 = firstFeature(entity);
  const temperature = entity?.temperature;
  const freqStr = observeFreqStr(f0);
  const boundary = (typeof f0?.maxY !== 'undefined' && typeof f0?.minY !== 'undefined')
    ? { maxY: f0.maxY, minY: f0.minY }
    : undefined;

  const mBody = body || FN.peaksBody({
    peaks,
    layout,
    decimal,
    shift,
    isAscend,
    isIntensity,
    boundary,
    integration: selectedIntegration,
    waveLength,
    temperature,
  });

  const solventDecimal = (typeof FN.is13CLayout === 'function' && FN.is13CLayout(layout))
    ? 2
    : decimal;

  return [
    ...layoutOpsObj.head(freqStr, solventStr(selectedShift, solventDecimal)),
    { insert: mBody },
    ...layoutOpsObj.tail(),
  ];
};

export const formatMpy = ({
  entity,
  shift,
  isAscend,
  decimal,
  integration,
  multiplicity,
  layout,
  curveSt,
}) => {
  if (!entity) return [];
  const curveIdx = curveSt?.curveIdx ?? 0;
  const selectedShift = shift?.shifts?.[curveIdx] ?? shift;
  const selectedIntegration = integration?.integrations?.[curveIdx] ?? integration;
  const selectedMultiplicity = multiplicity?.multiplicities?.[curveIdx] ?? multiplicity;
  if (!selectedShift || !selectedIntegration || !selectedMultiplicity) return [];

  const f0 = firstFeature(entity);
  const freqStr = observeFreqStr(f0);

  const { refArea, refFactor, stack: isStack } = selectedIntegration;
  const shiftVal = selectedMultiplicity.shift;
  const ms = selectedMultiplicity.stack || [];
  const is = isStack || [];

  const macs = ms.map((m) => {
    const { peaks: mPeaks, mpyType, xExtent } = m;
    const { xL, xU } = xExtent || {};
    const it = is.find((i) => i.xL === xL && i.xU === xU) || { area: 0 };
    const area = refArea ? (it.area * refFactor) / refArea : 0;
    const center = FN.calcMpyCenter(mPeaks, shiftVal, mpyType);
    const xs = (mPeaks || []).map((p) => p.x).sort((a, b) => a - b);
    const [aIdx, bIdx] = isAscend ? [0, xs.length - 1] : [xs.length - 1, 0];
    const mxA = mpyType === 'm' && xs.length ? (xs[aIdx] - shiftVal).toFixed(decimal) : 0;
    const mxB = mpyType === 'm' && xs.length ? (xs[bIdx] - shiftVal).toFixed(decimal) : 0;
    return {
      ...m, area, center, mxA, mxB,
    };
  }).sort((a, b) => (isAscend ? a.center - b.center : b.center - a.center));

  let couplings = [].concat(...macs.map((m) => {
    const jsSorted = (m.js || []).slice().sort((a, b) => (isAscend ? a - b : b - a));
    const c = m.center;
    const type = m.mpyType || 'm';
    const it = Math.round(m.area || 0);
    const js = [].concat(...jsSorted.map((j) => ([
      { insert: 'J', attributes: { italic: true } },
      { insert: ` = ${j.toFixed(1)} Hz` },
      { insert: ', ' },
    ])));
    const atomCount = layout === '1H' ? `, ${it}H` : '';
    const location = type === 'm'
      ? `${m.mxA}\u2013${m.mxB}`
      : `${(c ?? 0).toFixed(decimal)}`;

    return jsSorted.length === 0
      ? [{ insert: `${location} (${type}${atomCount})` }, { insert: ', ' }]
      : [
        { insert: `${location} (${type}, ` },
        ...js.slice(0, js.length - 1),
        { insert: `${atomCount})` },
        { insert: ', ' },
      ];
  }));
  couplings = couplings.slice(0, couplings.length - 1);

  return [
    { attributes: { script: 'super' }, insert: layout.slice(0, -1) },
    { insert: `${layout.slice(-1)} NMR (${freqStr}${solventStr(selectedShift, decimal)}ppm) \u03b4 = ` },
    ...couplings,
    { insert: '.' },
  ];
};

export const isNmrLayout = (layout) => NMR_LAYOUTS.includes(layout);
