import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import DetailActions from 'src/stores/alt/actions/DetailActions';

function PubchemLabels({ element }) {
  const cid = element.pubchem_tag && element.pubchem_tag.pubchem_cid;
  const canRefresh = element.can_update;
  const handleOnClick = (e) => {
    if (cid) {
      window.open(`https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`, '_blank');
    } else if (canRefresh) {
      DetailActions.refreshMoleculeData(element);
    }
    e.stopPropagation();
  };
  const title = () => {
    if (cid) { return `PubChem CID: ${cid}`; }
    if (canRefresh) { return 'No PubChem CID assigned — click to check PubChem again'; }
    return 'No PubChem CID assigned';
  };
  // Only the refresh path needs a molecule id. Opening the PubChem page needs just the cid,
  // which SampleEntity still exposes at detail level 0 — where `molecule` is a two-key hash
  // with no id, so requiring one here would take the link away from shared-collection viewers.
  return (
    <Button
      disabled={cid ? false : !(canRefresh && element.molecule?.id)}
      variant="neat"
      size="md"
      onClick={handleOnClick}
      title={title()}
    >
      <i className="icon-pubchem" />
    </Button>
  );
}

PubchemLabels.propTypes = {
  element: PropTypes.object,
}

export default PubchemLabels;
