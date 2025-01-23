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

  const findThumbnailAttachment = (container) => {
    if (!container || !container.children) return null;

    for (const child of container.children) {
      if (child.attachments?.length) {
        const thumbnail = child.attachments.find((attachment) => attachment.preview);
        if (thumbnail) return thumbnail;
      }
      const nestedThumbnail = findThumbnailAttachment(child);
      if (nestedThumbnail) return nestedThumbnail;
    }

    return null;
  };

  const renderNameHeader = (firstVesselItem) => {
    const thumbnail = findThumbnailAttachment(firstVesselItem.container);
    const imgSrc = thumbnail ? thumbnail.preview : null;

    return (
      <div className="d-flex gap-2 align-items-center">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={firstVesselItem.vesselName || 'Vessel'}
            className="vessel-header-image me-2 border rounded"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div className="me-2" />
        )}

        <div className="flex-grow-1 fs-5">
          {`${firstVesselItem.vessel_template.name}`}
        </div>
        {renderCreateSubSampleButton()}
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
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setDetailedInformation(!detailedInformation);
        }}
      >
        <i className="fa fa-info-circle" aria-hidden="true" />
      </Button>
    </OverlayTrigger>
  );

  const renderCreateSubSampleButton = () => {
    const { currentCollection, isSync } = UIStore.getState();

    if (currentCollection.label === 'All') return null;
    if (currentCollection.is_sync_to_me && currentCollection.permission_level === 0) return null;

    return (
      <OverlayTrigger
        key="subSampleButton"
        placement="top"
        overlay={(
          <Tooltip id="detailed-info-button">
            Create sample of vessel template
          </Tooltip>
        )}
      >
        <Button
          size="sm"
          onClick={(event) => {
            event.stopPropagation();

            const uri = isSync
              ? `/scollection/${currentCollection.id}/vessel/new`
              : `/collection/${currentCollection.id}/vessel/new`;
            Aviator.navigate(uri, { silent: true });

            const creationEvent = {
              type: 'vessel',
              params: {
                collectionID: currentCollection.id,
                vesselID: 'new',
                vessel_template: vesselItems[0],
              },
            };
            elementShowOrNew(creationEvent);
          }}
        >
          <i className="fa fa-plus" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  };

  const renderProperty = (propertyName, propertyValue) => {
    if (!propertyValue) return null;

    return (
      <div>
        <div className="property-key floating">{propertyName}</div>
        <div className="property-key-minus floating">-</div>
        <div className="property-value">{propertyValue}</div>
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
      vesselName: PropTypes.string,
      vesselType: PropTypes.string,
      materialType: PropTypes.string,
      volumeAmount: PropTypes.number,
      volumeUnit: PropTypes.string,
    })
  ).isRequired,
};

export default VesselEntry;
