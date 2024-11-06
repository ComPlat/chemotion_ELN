import PropTypes from 'prop-types';

export const CellLinePropTypeTableEntry = PropTypes.shape({
    id: PropTypes.string.isRequired,
    cellLineName: PropTypes.string.isRequired,
    organism: PropTypes.string.isRequired,
    disease: PropTypes.string.isRequired,
    tissue:PropTypes.string.isRequired,
    mutation:PropTypes.string.isRequired,
    variant:PropTypes.string.isRequired,
    bioSafetyLevel:PropTypes.string.isRequired,
    cryopreservationMedium:PropTypes.string.isRequired,
    gender:PropTypes.string.isRequired,
})