import React from 'react';
import Formula from './Formula';

const sumFormula = sf => <Formula formula={sf} />;

const sampleNameWithResidues = (polymer_type, sumFormulaCom, moleculeName) => {
  const polymerName = (polymer_type.charAt(0).toUpperCase()
    + polymer_type.slice(1)).replace('_', '-') + ' - ';

  return (
    <div>
      <p>
        {polymerName}
        {sumFormulaCom}
      </p>
      <p>{moleculeName}</p>
    </div>
  );
};

const SampleName = ({ sample }) => {
  const { sum_formular, iupac_name } = sample._molecule;
  const { contains_residues, polymer_type } = sample;
  const mnl = sample.molecule_name_label;
  const moleculeName = mnl && mnl !== sum_formular ? mnl : iupac_name;
  const sumFormulaCom = sumFormula(sum_formular);

  if (contains_residues) {
    return sampleNameWithResidues(polymer_type, sumFormulaCom, moleculeName);
  }

  return (
    <div>
      <p>{sumFormulaCom}</p>
      <p>{moleculeName}</p>
    </div>
  );
};

export default SampleName;
