import React from 'react';
import Formula from './Formula';
import ClipboardCopyText from './ClipboardCopyText';


const SampleName = ({ sample }) => {
  const { contains_residues, polymer_type, molecule_formula } = sample;
  const moleculeName = sample.decoupled ? null :
    (<p style={{ wordBreak: 'break-all' }}><ClipboardCopyText text={sample.showedName()} /></p>);
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
          {polymerName}&nbsp;
          <ClipboardCopyText text={sumFormulaCom} clipText={`${polymerName} - ${molecule_formula}`} />
        </p>
        {moleculeName}
      </div>
    );
  }
  return (
    <div>
      <p><ClipboardCopyText text={sumFormulaCom} clipText={molecule_formula} /></p>
      {moleculeName}
    </div>
  );
};

export default SampleName;
