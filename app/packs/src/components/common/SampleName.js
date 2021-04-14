import React from 'react';
import Formula from './Formula';
import ClipboardCopyText from './ClipboardCopyText';


const SampleName = ({ sample }) => {
  const { contains_residues, polymer_type, molecule_formula } = sample;
  const moleculeName = sample.showedName();

  let stereo = '';
  if (sample.stereo) {
    const stereoInfo = Object.keys(sample.stereo).reduce((acc, k) => {
      const val = sample.stereo[k];
      if (val === 'any' || !val) return acc;

      const linker = acc === '' ? '' : ', ';
      return `${acc}${linker}${k}: ${val}`;
    }, '');

    stereo = stereoInfo === '' ? '' : ` - ${stereoInfo}`;
  }

  const sumFormulaCom = <Formula formula={molecule_formula} customText={stereo} />;

  if (contains_residues) {
    const polymerName = `${polymer_type.charAt(0).toUpperCase()}${polymer_type.slice(1)}`.replace('_', '-');
    return (
      <div>
        <p>
          {polymerName}
          <ClipboardCopyText text={sumFormulaCom} clipText={`${polymerName} - ${molecule_formula}`} />
        </p>
        <p><ClipboardCopyText text={moleculeName} /></p>
      </div>
    );
  }

  return (
    <div>
      <p><ClipboardCopyText text={sumFormulaCom} clipText={molecule_formula} /></p>
      <p style={{ wordBreak: 'break-all' }}><ClipboardCopyText text={moleculeName} /></p>
    </div>
  );
};

export default SampleName;
