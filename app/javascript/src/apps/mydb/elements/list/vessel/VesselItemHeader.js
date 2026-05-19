import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
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

    const uri = `/collection/${currentCollection.id}/vessel_template/${templateId}`;
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
    <div className="d-flex gap-2 align-items-center">
      <div className="flex-grow-1 fw-bold fs-5">
        {groupKey}
      </div>
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id="edit-vessel-template">
            Edit vessel template
          </Tooltip>
        )}
      >
        <Button
          onClick={() => navigateToTemplate(vessel?.vesselTemplateId)}
        >
          Edit
        </Button>
      </OverlayTrigger>
    </div>
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
