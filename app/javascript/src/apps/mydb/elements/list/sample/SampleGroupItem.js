import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Tooltip, OverlayTrigger, Badge,
} from 'react-bootstrap';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementReactionLabels from 'src/apps/mydb/elements/labels/ElementReactionLabels';
import ElementWellplateLabels from 'src/apps/mydb/elements/labels/ElementWellplateLabels';
import GenericElementLabels from 'src/apps/mydb/elements/labels/GenericElementLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import { ShowUserLabels } from 'src/components/UserLabels';

import Sample from 'src/models/Sample';

function TopSecretIcon({ element }) {
  if (element.type === 'sample' && element.is_top_secret === true) {
    const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <i className="fa fa-user-secret" />
      </OverlayTrigger>
    );
  }
  return null;
}

TopSecretIcon.propTypes = {
  element: PropTypes.instanceOf(Sample).isRequired,
};

function XvialIcon({ label }) {
  return (label || '').match(/^X\d+.*/) ? (
    <i className="icon-xvial px-1 fs-5" />
  ) : null;
}

XvialIcon.propTypes = {
  label: PropTypes.string,
};

XvialIcon.defaultProps = {
  label: ''
};

const showDecoupledIcon = (sample) => (
  sample.decoupled ? (
    <OverlayTrigger placement="top" overlay={<Tooltip id="tip_decoupled_icon">is decoupled from molecule</Tooltip>}>
      <Button size="xxsm" variant="light"><i className="fa fa-chain-broken" aria-hidden="true" /></Button>
    </OverlayTrigger>
  ) : null
);

const showInventoryLabelIcon = (sample) => (
  sample.inventory_sample && sample.inventory_label ? (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="sample_inventory_label">Inventory Label</Tooltip>}
    >
      <Badge
        className="bg-info text-light p-1 mt-0 rounded"
        key={`inventory_label_${sample.inventory_label}`}
      >
        {sample.inventory_label}
      </Badge>
    </OverlayTrigger>
  ) : null
);

function SampleGroupItem({ sample, showDetails }) {
  return (
    <div
      className="d-flex justify-content-between flex-wrap"
      onClick={showDetails}
      role="button"
    >
      {sample.title()}

      <div className="d-flex align-items-center gap-1 flex-wrap">
        {showInventoryLabelIcon(sample)}
        <CommentIcon commentCount={sample.comment_count} />
        <ShowUserLabels element={sample} />
        <XvialIcon label={sample.external_label} />
        <div className="d-flex align-items-center gap-1 ms-auto">
          <ElementReactionLabels element={sample} />
          <ElementWellplateLabels element={sample} />
          <GenericElementLabels element={sample} />
          <ElementCollectionLabels element={sample} />
          <ElementAnalysesLabels element={sample} />
        </div>
        {showDecoupledIcon(sample)}
        <TopSecretIcon element={sample} />
      </div>
    </div>
  );
}

SampleGroupItem.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  showDetails: PropTypes.func.isRequired,
};

export default SampleGroupItem;
