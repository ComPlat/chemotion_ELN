// Returns { abs: 'rac' } when the KET JSON contains user-set AND/OR stereogroups,
// null otherwise. Never reads 'abs' labels — those are Indigo auto-generated.
const extractStereoFromKet = (ketJson) => {
  if (!ketJson || typeof ketJson !== 'object') return null;
  for (const key of Object.keys(ketJson)) {
    if (key === 'root') continue;
    const mol = ketJson[key];
    if (!mol?.atoms) continue;
    for (const atom of mol.atoms) {
      if (typeof atom.stereoLabel === 'string') {
        if (/^and\d+/i.test(atom.stereoLabel) || /^or\d+/i.test(atom.stereoLabel)) {
          return { abs: 'rac' };
        }
      }
    }
  }
  return null;
};

export { extractStereoFromKet };
