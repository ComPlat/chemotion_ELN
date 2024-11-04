import React from 'react';
import Formula from 'src/components/common/Formula';
import ClipboardCopyText from 'src/components/common/ClipboardCopyText';

const SampleName = ({ sample }) => {
  const { contains_residues, polymer_type, molecule_formula, decoupled } = sample;
  const moleculeName = sample.decoupled ? null :
    (<p style={{ wordBreak: 'break-all' }}><ClipboardCopyText text={sample.showed_name} /></p>);
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
        <p className='mb-2'>
          {polymerName}
          <ClipboardCopyText text={sumFormulaCom} clipText={clipText} />
        </p>
        {moleculeName}
      </div>
    );
  }

  if (sample.sample_type == 'Mixture' && sample.components) {
    const title = sample.components.map(comp => comp.molecule.iupac_name).join(', ');
    return (
      <div>
        <p>{sample.name}</p>
        {title}
      </div>
    );
  }

  return (
    <div>
      <p className='mb-2'><ClipboardCopyText text={sumFormulaCom} clipText={clipText} /></p>
      {moleculeName}
    </div>
  );
};

export default SampleName;
