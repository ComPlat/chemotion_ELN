import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import classnames from 'classnames';

import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import CommentIcon from 'src/components/comments/CommentIcon';
import { ShowUserLabels } from 'src/components/UserLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementReactionLabels from 'src/apps/mydb/elements/labels/ElementReactionLabels';
import ElementWellplateLabels from 'src/apps/mydb/elements/labels/ElementWellplateLabels';
import GenericElementLabels from 'src/apps/mydb/elements/labels/GenericElementLabels';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { DragDropItemTypes } from 'src/utilities/DndConst';

function TopSecretIcon({ element }) {
  if (element.type === 'sample' && element.is_top_secret === true) {
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip>Top secret</Tooltip>}>
        <i className="fa fa-user-secret" />
      </OverlayTrigger>
    );
  }
  return null;
}

TopSecretIcon.propTypes = {
  element: PropTypes.object,
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

const showDecoupledIcon = (sample) => (sample.decoupled ? (
  <OverlayTrigger placement="top" overlay={<Tooltip id="tip_decoupled_icon">is decoupled from molecule</Tooltip>}>
    <Button size="xxsm" variant="light"><i className="fa fa-chain-broken" aria-hidden="true" /></Button>
  </OverlayTrigger>
) : null);

const showInventoryLabelIcon = (sample) => (sample.inventory_sample && sample.inventory_label ? (
  <OverlayTrigger
    placement="top"
    overlay={<Tooltip>Inventory Label</Tooltip>}
  >
    <Badge className="bg-info text-light p-1 mt-0 rounded">
      {sample.inventory_label}
    </Badge>
  </OverlayTrigger>
) : null);

export default function SampleGroupElement({
  element: sample,
  isSelected,
  keyboardSelectedElementId,
  showDragColumn,
  showDetails,
}) {

  const applyHighlight = isSelected || keyboardSelectedElementId === sample.id
  return (
    <tr key={sample.id} className={classnames({ 'text-bg-primary': applyHighlight })}>
      <td width="30px">
        <ElementCheckbox element={sample} />
      </td>
      <td
        onClick={() => showDetails(sample.id)}
        role="button"
      >
        <div className="d-flex justify-content-between">
          {sample.title(isSelected)}

          <div className="d-flex align-items-center gap-1">
            {showInventoryLabelIcon(sample)}
            <CommentIcon commentCount={sample.comment_count} />
            <ShowUserLabels element={sample} />
            <XvialIcon label={sample.external_label} />
            <ElementReactionLabels element={sample} key={`${sample.id}_reactions`} />
            <ElementWellplateLabels element={sample} key={`${sample.id}_wellplate`} />
            <GenericElementLabels element={sample} key={`${sample.id}_element`} />
            <ElementCollectionLabels element={sample} key={`${sample.id}`} />
            <ElementAnalysesLabels element={sample} key={`${sample.id}_analyses`} />
            {showDecoupledIcon(sample)}
            <TopSecretIcon element={sample} />
          </div>
        </div>
      </td>
      {showDragColumn && (
        <td className="text-center align-middle">
          <ElementContainer
            key={sample.id}
            sourceType={DragDropItemTypes.SAMPLE}
            element={sample}
          />
        </td>
      )}
    </tr>
  );
}

SampleGroupElement.propTypes = {
  element: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  keyboardSelectedElementId: PropTypes.string,
  showDragColumn: PropTypes.bool.isRequired,
  showDetails: PropTypes.func.isRequired,
};
