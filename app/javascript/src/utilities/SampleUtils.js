const getMolId = (sample) => {
    if (sample.decoupled && sample.molfile) {
        return `M${sample.id}`;
    } else if (sample.stereo == null) {
        return `M${sample.molecule.id}_any_any`;
    } else {
        return `M${sample.molecule.id}_${sample.stereo.abs || 'any'}_${sample.stereo.rel || 'any'}`;
    }
};

const getDisplayedMoleculeGroup = (elements, moleculeSort) => {
    const moleculeList = elements.reduce((acc, sample) => {
        const key = getMolId(sample);
        if (!acc[key]) {
            acc[key] = [sample];
        } else {
            acc[key].push(sample);
        }
        return acc;
    }, {});
    const displayedMoleculeGroup =  Object.keys(moleculeList).map((molId) => {
        const m = moleculeList[molId];
        if (moleculeSort && m.length > 3) {
          m.numSamples = 3;
        } else {
          m.numSamples = m.length;
        }
        return m;
      });
    return displayedMoleculeGroup;
}

const getMoleculeGroupsShown = (displayedMoleculeGroup) => {
    const moleculeGroupsShown = displayedMoleculeGroup.map((moleculeGroup) => {
        const { molecule } = moleculeGroup[0];
        return molecule.iupac_name || molecule.inchistring;
    });
    return moleculeGroupsShown;
}
export {
    getDisplayedMoleculeGroup,
    getMoleculeGroupsShown
  };