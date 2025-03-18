import Sample from 'src/models/Sample';

const getDisplayedMoleculeGroup = (elements, moleculeSort) => {
  const moleculeList = elements.reduce((acc, sample) => {
    const key = Sample.getMoleculeId(sample);
    if (!acc[key]) {
      acc[key] = [sample];
    } else {
      acc[key].push(sample);
    }
    return acc;
  }, {});
  const displayedMoleculeGroup = Object.keys(moleculeList).map((molId) => {
    const m = moleculeList[molId];
    if (moleculeSort && m.length > 3) {
      m.numSamples = 3;
    } else {
      m.numSamples = m.length;
    }
    return m;
  });
  return displayedMoleculeGroup;
};

const getMoleculeGroupsShown = (displayedMoleculeGroup) => {
  const moleculeGroupsShown = displayedMoleculeGroup.map((moleculeGroup) => {
    const { molecule } = moleculeGroup[0];
    return molecule.iupac_name || molecule.inchistring;
  });
  return moleculeGroupsShown;
};

export {
  getDisplayedMoleculeGroup,
  getMoleculeGroupsShown
};
