import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { aviatorNavigation } from 'src/utilities/routesUtils';

const VesselItemHeader = ({ groupItems }) => {
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

    aviatorNavigation('vessel_template', templateId, true, true);
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
          onClick={(e) => { e.stopPropagation(); navigateToTemplate(vessel?.vesselTemplateId); }}
        >
          Edit
        </Button>
      </OverlayTrigger>
    </div>
  );
};

VesselItemHeader.propTypes = {
  groupItems: PropTypes.arrayOf(
    PropTypes.shape({
      vesselTemplateId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      vesselName: PropTypes.string,
    })
  ).isRequired,
};

export default VesselItemHeader;
