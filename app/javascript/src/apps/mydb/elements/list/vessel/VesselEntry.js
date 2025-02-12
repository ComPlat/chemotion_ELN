/* eslint-disable no-use-before-define */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { useState } from 'react';
import UIStore from 'src/stores/alt/stores/UIStore';
import VesselItemEntry from 'src/apps/mydb/elements/list/vessel/VesselItemEntry';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import Aviator from 'aviator';
import ChevronIcon from 'src/components/common/ChevronIcon';

function VesselEntry({ vesselItems }) {
  const [detailedInformation, setDetailedInformation] = useState(false);
  const [showEntries, setShowEntries] = useState(true);

  const getBorderStyle = () =>
    (showEntries
      ? 'list-container title-panel p-3'
      : 'list-container title-panel p-3 cell-line-group-bottom-border');

  const renderItemEntries = () => (showEntries
    ? vesselItems.map((vesselItem) => (
      <VesselItemEntry key={vesselItem.id} vesselItem={vesselItem} />
    ))
    : []);

  const findThumbnailAttachment = (vessels) => {
    const searchContainer = (container) => {
      if (!container) return null;

      const thumbnail = container.attachments?.find((attachment) => attachment.preview);
      if (thumbnail) return thumbnail;
      return container.children?.map(searchContainer).find(Boolean) || null;
    };
    return vessels.map((vessel) => searchContainer(vessel.container)).find(Boolean) || null;
  };

  const renderNameHeader = (firstVesselItem) => {
    const thumbnail = findThumbnailAttachment(vesselItems);
    const imgSrc = thumbnail ? thumbnail.preview : null;

    return (
      <div className="d-flex gap-2 align-items-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={firstVesselItem.vesselName || 'Vessel'}
            className="me-2 border rounded img-fluid"
          />
        ) : (
          <div className="me-2" />
        )}

        <div className="flex-grow-1 fs-5">
          {`${firstVesselItem.vessel_template.name}`}
        </div>
        {renderDetailedInfoButton()}
        <ChevronIcon
          color="primary"
          direction={showEntries ? 'down' : 'right'}
        />
      </div>
    );
  };

  const renderDetailedInfos = (firstVesselItem) => {
    if (!detailedInformation) return null;

    return (
      <div className="mt-2">
        {renderProperty('Name', firstVesselItem.vessel_template.name)}
        {renderProperty('Details', firstVesselItem.vessel_template.details)}
        {renderProperty('Vessel type', firstVesselItem.vessel_template.vessel_type)}
        {renderProperty('Material type', firstVesselItem.vessel_template.material_type)}
        {renderProperty('Volume amount', firstVesselItem.vessel_template.volume_amount)}
        {renderProperty('Volume unit', firstVesselItem.vessel_template.volume_unit)}
      </div>
    );
  };

  const renderDetailedInfoButton = () => (
    <OverlayTrigger
      key="detailedInfoButton"
      placement="top"
      overlay={(
        <Tooltip id="detailed-info-button">
          Show detailed information about the material
        </Tooltip>
      )}
    >
      <Button
        variant="info"
        className={detailedInformation ? 'border border-primary' : ''}
        size="xsm"
        onClick={(e) => {
          e.stopPropagation();
          setDetailedInformation(!detailedInformation);
        }}
      >
        <i className="fa fa-info-circle" aria-hidden="true" />
      </Button>
    </OverlayTrigger>
  );

  const renderProperty = (propertyName, propertyValue) => {
    if (!propertyValue) return null;

    return (
      <div className="ms-4 d-flex align-items-center">
        <div className="flex-shrink-0">{propertyName}</div>
        <div className="flex-shrink-0 text-center mx-1"> : </div>
        <div className="flex-grow-1">{propertyValue}</div>
      </div>
    );
  };

  if (vesselItems.length === 0) return null;

  return (
    <div className="cell-line-group">
      <div
        className={getBorderStyle()}
        onClick={() => setShowEntries(!showEntries)}
      >
        {renderNameHeader(vesselItems[0])}
        {renderDetailedInfos(vesselItems[0])}
      </div>
      {renderItemEntries()}
    </div>
  );
}

VesselEntry.propTypes = {
  vesselItems: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      vessel_template: PropTypes.shape({
        name: PropTypes.string.isRequired,
        details: PropTypes.string,
        vessel_type: PropTypes.string,
        material_type: PropTypes.string,
        volume_amount: PropTypes.number,
        volume_unit: PropTypes.string,
      }).isRequired,
    })
  ).isRequired,
};

export default VesselEntry;
