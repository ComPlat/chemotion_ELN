import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import Aviator from 'aviator';
import UIStore from 'src/stores/alt/stores/UIStore';

function VesselItemHeader({ groupItems }) {
  const { currentCollection } = UIStore.getState();
  const vessel = groupItems?.[0];

  const getGroupKey = useCallback(
    (item) => `${item.vesselName}`,
    []
  );

  const navigateToTemplate = (templateId) => {
    if (!templateId) {
      console.error('Vessel template ID is missing.');
      return;
    }

    const uri = `/vessel_template/${templateId}`;
    Aviator.navigate(uri, { silent: true });

    elementShowOrNew({
      type: 'vessel_template',
      params: {
        vesselTemplateID: templateId,
        collectionID: currentCollection.id,
      },
    });
  };

  const groupKey = getGroupKey(vessel);

  return (
    <button
      type="button"
      className="fs-5 btn btn-link p-0 text-start"
      onClick={() => navigateToTemplate(vessel?.vesselTemplateId)}
    >
      {groupKey}
    </button>
  );
}

VesselItemHeader.propTypes = {
  groupItems: PropTypes.arrayOf(
    PropTypes.shape({
      vesselTemplateId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      vesselName: PropTypes.string,
    })
  ).isRequired,
};

export default VesselItemHeader;
