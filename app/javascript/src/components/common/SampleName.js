import React from 'react';
import PropTypes from 'prop-types';
import Formula from 'src/components/common/Formula';
import ClipboardCopyText from 'src/components/common/ClipboardCopyText';

const MWPrecision = 6;

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
    <p className="sample-name__molecule-name">
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
 * Builds a list of component titles with their IUPAC name and exact molecular weight
 * and shows the total mixture mass if available.
 *
 * @param {Object} sample - The parent sample containing components and sample_details.
 * @returns {JSX.Element} A JSX fragment containing total mass (if present) and component names/weights.
 */
const getComponentsTitle = (sample) => {
  const components = sample.components || [];

  return (
    <>
      {components.map((component) => {
        const name = component.iupacName;
        const mwText = component.molecularWeightText;
        return (
          <div key={component.molecule?.id || component.id || name}>
            {name}
            {mwText}
          </div>
        );
      })}
    </>
  );
};
/**
 * Component to display the sample name with formula and additional information
 */
function SampleName({ sample }) {
  /* eslint-disable camelcase */
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
        <p className="mb-2 fix-font-size">
          {polymerName}
          <ClipboardCopyText text={sumFormulaCom} clipText={clipText} />
        </p>
        {moleculeName}
      </div>
    );
  }

  // Handle mixture case
  if (sample.isMixture() && components) {
    const title = getComponentsTitle(sample);

    return (
      <div>
        <p className="mb-2 small">
          Components:
          {title}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 fix-font-size">
        <ClipboardCopyText text={sumFormulaCom} clipText={clipText} />
      </p>
      {moleculeName}
    </div>
  );
  /* eslint-enable camelcase */
}

SampleName.propTypes = {
  sample: PropTypes.shape({
    contains_residues: PropTypes.bool,
    polymer_type: PropTypes.string,
    molecule_formula: PropTypes.string,
    decoupled: PropTypes.bool,
    stereo: PropTypes.shape({}),
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
