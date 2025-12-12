import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, Button, Badge } from 'react-bootstrap';

/**
 * Technique filter toggles for Analysis Explorer
 * Allows filtering by NMR, IR, MS and NMR nucleus subtypes
 */
const TechniqueFilters = ({
  activeTechnique,
  activeNucleus,
  onTechniqueChange,
  onNucleusChange
}) => {
  const techniques = [
    { value: 'all', label: 'All', icon: 'fa-globe' },
    { value: 'NMR', label: 'NMR', icon: 'fa-magnet' },
    { value: 'IR', label: 'IR', icon: 'fa-signal' },
    { value: 'MS', label: 'MS', icon: 'fa-bolt' }
  ];

  const nuclei = [
    { value: '1H', label: '¹H' },
    { value: '13C', label: '¹³C' },
    /*   { value: '19F', label: '¹⁹F' },
      { value: '31P', label: '³¹P' },
      { value: '15N', label: '¹⁵N' },
      { value: '11B', label: '¹¹B' },
      { value: '29Si', label: '²⁹Si' },
      { value: '2H', label: '²H' } */
  ];

  const handleTechniqueClick = (technique) => {
    onTechniqueChange(technique);
  };

  const handleNucleusClick = (nucleus) => {
    if (activeNucleus === nucleus) {
      onNucleusChange(null); // Toggle off
    } else {
      onNucleusChange(nucleus);
    }
  };

  return (
    <div className="technique-filters mb-3">
      {/* Main technique filters */}
      <div className="d-flex align-items-center justify-content-center flex-wrap gap-3">
        <span className="text-dark fw-bold" style={{ fontSize: '1rem' }}>Technique:</span>
        <ButtonGroup>
          {techniques.map((tech) => (
            <Button
              key={tech.value}
              variant={activeTechnique === tech.value ? 'primary' : 'outline-dark'}
              onClick={() => handleTechniqueClick(tech.value)}
              className="d-flex align-items-center px-3 py-2"
              style={{ fontSize: '1rem', fontWeight: 500 }}
            >
              <i className={`fa ${tech.icon} me-2`} />
              {tech.label}
            </Button>
          ))}
        </ButtonGroup>

        {/* NMR nucleus sub-filters */}
        {activeTechnique === 'NMR' && (
          <div className="ms-3 d-flex align-items-center gap-2">
            <span className="text-dark fw-bold" style={{ fontSize: '1rem' }}>Nucleus:</span>
            {nuclei.map((nuc) => (
              <Badge
                key={nuc.value}
                bg={activeNucleus === nuc.value ? 'primary' : 'secondary'}
                className="px-2 py-1"
                style={{ cursor: 'pointer', fontSize: '1rem', fontWeight: 500 }}
                onClick={() => handleNucleusClick(nuc.value)}
              >
                {nuc.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

TechniqueFilters.propTypes = {
  activeTechnique: PropTypes.string.isRequired,
  activeNucleus: PropTypes.string,
  onTechniqueChange: PropTypes.func.isRequired,
  onNucleusChange: PropTypes.func.isRequired
};

TechniqueFilters.defaultProps = {
  activeNucleus: null
};

export default TechniqueFilters;
