/**
 * Groups elements by their molecule ID and limits the number of samples per group if sorting is applied.
 *
 * @param {Array} elements - List of sample elements.
 * @param {boolean} moleculeSort - Flag to determine if sorting and limiting should be applied.
 * @returns {Array} - Array of grouped molecule samples.
 */
const getDisplayedMoleculeGroup = (elements, moleculeSort) => {
  const moleculeList = elements.reduce((acc, sample) => {
    const key = sample.getMoleculeId(sample);
    if (!acc[key]) {
      acc[key] = [sample];
    } else {
      acc[key].push(sample);
    }
    return acc;
  }, {});

  const displayedMoleculeGroup = Object.keys(moleculeList).map((molId) => {
    const m = moleculeList[molId];
    m.numSamples = moleculeSort && m.length > 3 ? 3 : m.length;
    return m;
  });

  return displayedMoleculeGroup;
};

/**
 * Extracts the IUPAC name or InChI string of the first molecule in each group.
 *
 * @param {Array} displayedMoleculeGroup - List of grouped molecules.
 * @returns {Array} - Array of IUPAC names or InChI strings.
 */
const getMoleculeGroupsShown = (displayedMoleculeGroup) => displayedMoleculeGroup.map(
  (moleculeGroup) => {
    const { molecule } = moleculeGroup[0];
    return molecule.iupac_name || molecule.inchistring;
  }
);

export {
  getDisplayedMoleculeGroup,
  getMoleculeGroupsShown
};
