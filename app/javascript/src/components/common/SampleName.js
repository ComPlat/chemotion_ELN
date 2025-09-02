import React from 'react';
import PropTypes from 'prop-types';
import Formula from 'src/components/common/Formula';
import ClipboardCopyText from 'src/components/common/ClipboardCopyText';

/**
 * Formats stereo information into a readable string
 * @param {Object} stereo - Stereo information object
 * @returns {string} Formatted stereo string
 */
const getStereoInfo = (stereo) => {
  if (!stereo) return '';

  const stereoInfo = Object.entries(stereo)
    .filter(([_, val]) => val && val !== 'any')
    .map(([key, val]) => `${key}: ${val}`)
    .join(', ');

  return stereoInfo ? ` - ${stereoInfo}` : '';
};

/**
 * Formats the molecule name for display, ensuring it is not shown for decoupled or mixture samples
 * @param {boolean} decoupled - Whether the sample is decoupled
 * @param {Object} sample - Sample object
 * @returns {JSX.Element|null} JSX element for molecule name or null
 */
const getMoleculeName = (decoupled, sample) => {
  if (decoupled || sample.isMixture()) return null;

  return (
    <p style={{ wordBreak: 'break-all' }}>
      <ClipboardCopyText text={sample.showed_name} />
    </p>
  );
};

/**
 * Formats polymer name based on type and decoupled status
 * @param {string} polymerType - Type of polymer
 * @param {boolean} decoupled - Whether the polymer is decoupled
 * @returns {string} Formatted polymer name
 */
const getPolymerName = (polymerType, decoupled) => {
  if (decoupled && polymerType === 'self_defined') return '';

  return `${polymerType.charAt(0).toUpperCase()}${polymerType.slice(1)}`.replace('_', '-');
};

/**
 * Extracts and formats the titles of components for mixture samples
 * @param {Array} components - Array of component objects
 * @returns {string} Formatted components title
 */
const getComponentsTitle = (components) => components.map((comp) => comp.molecule?.iupac_name).join('/');

/**
 * Component to display sample name with formula and additional information
 */
function SampleName({ sample }) {
  const {
    contains_residues,
    polymer_type,
    molecule_formula,
    decoupled,
    stereo,
    components,
  } = sample;

  const moleculeName = getMoleculeName(decoupled, sample); // Handle molecule name display
  const stereoText = getStereoInfo(stereo); // Format stereo information
  const sumFormulaCom = <Formula formula={molecule_formula} customText={stereoText} />;

  // Default case for regular molecules
  let clipText = molecule_formula || '';

  // Handle polymer/residue case
  if (contains_residues) {
    const polymerName = getPolymerName(polymer_type, decoupled);
    clipText = (decoupled && polymer_type === 'self_defined')
      ? molecule_formula
      : `${polymerName} - ${molecule_formula}`;

    return (
      <div>
        <p className="mb-2">
          {polymerName}
          <ClipboardCopyText text={sumFormulaCom} clipText={clipText} />
        </p>
        {moleculeName}
      </div>
    );
  }

  // Handle mixture case
  if (sample.isMixture() && components) {
    const title = getComponentsTitle(components);

    return (
      <div>
        <p className="mb-2">
          Components:
          {title}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2">
        <ClipboardCopyText text={sumFormulaCom} clipText={clipText} />
      </p>
      {moleculeName}
    </div>
  );
}

SampleName.propTypes = {
  sample: PropTypes.shape({
    contains_residues: PropTypes.bool,
    polymer_type: PropTypes.string,
    molecule_formula: PropTypes.string,
    decoupled: PropTypes.bool,
    stereo: PropTypes.object,
    components: PropTypes.arrayOf(
      PropTypes.shape({
        molecule: PropTypes.shape({
          iupac_name: PropTypes.string,
        }),
      })
    ),
    isMixture: PropTypes.func.isRequired,
    showed_name: PropTypes.string,
  }).isRequired,
};

export default SampleName;
