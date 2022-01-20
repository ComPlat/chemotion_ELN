import React from 'react';
import Formula from './Formula';
import ClipboardCopyText from './ClipboardCopyText';

const SampleName = ({ sample }) => {
  const { contains_residues, polymer_type, molecule_formula, decoupled } = sample;
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
  let clipText = molecule_formula;
  if (contains_residues) {
    const polymerName = (decoupled && polymer_type === 'self_defined') ? '' : `${polymer_type.charAt(0).toUpperCase()}${polymer_type.slice(1)}`.replace('_', '-');
    clipText = (decoupled && polymer_type === 'self_defined') ? clipText : `${polymerName} - ${molecule_formula}`;
    return (
      <div>
        <p>
          {polymerName}&nbsp;
          <ClipboardCopyText text={sumFormulaCom} clipText={clipText} />
        </p>
        {moleculeName}
      </div>
    );
  }
  return (
    <div>
      <p><ClipboardCopyText text={sumFormulaCom} clipText={clipText} /></p>
      {moleculeName}
    </div>
  );
};

export default SampleName;