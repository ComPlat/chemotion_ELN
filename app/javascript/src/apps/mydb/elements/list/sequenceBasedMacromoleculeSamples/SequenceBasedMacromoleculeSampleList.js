import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Badge } from 'react-bootstrap';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';
import { DragDropItemTypes } from 'src/utilities/DndConst';

import { observer } from 'mobx-react';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

function ListItemHeader({
  group,
  toggleGroupCollapse,
}) {
  return (
    <div
      onClick={() => toggleGroupCollapse()}
      role="button"
    >
      <div className="d-flex align-items-center gap-2 fw-bold fs-5">
        <span>{group[0].sbmmShortLabel()}</span>
        <span>{group[0].sequence_based_macromolecule.short_name}</span>
      </div>
    </div>
  );
}

ListItemHeader.propTypes = {
  group: PropTypes.arrayOf(PropTypes.instanceOf(SequenceBasedMacromoleculeSample)).isRequired,
  toggleGroupCollapse: PropTypes.func.isRequired,
};

function ListItem({ element, showDetails }) {
  const badgeTitle = element.sequence_based_macromolecule.uniprot_derivation.split('_').slice(-1)[0];
  return (
    <div
      className="d-flex justify-content-between"
      onClick={showDetails}
      role="button"
    >
      <div className="d-flex align-items-center gap-2">
        <Badge bg="info" className="border border-active bg-opacity-25 text-active rounded">
          {badgeTitle}
        </Badge>
        <span>{element.title()}</span>
      </div>
      <div className="d-flex align-items-center gap-1 flex-wrap">
        <CommentIcon commentCount={element.comment_count} />
        <ElementCollectionLabels element={element} />
      </div>
    </div>
  );
}

ListItem.propTypes = {
  element: PropTypes.instanceOf(SequenceBasedMacromoleculeSample).isRequired,
  showDetails: PropTypes.func.isRequired,
};

function SequenceBasedMacromoleculeSampleList({
  elements,
}) {
  const getGroupKey = useCallback((element) => {
    return `sbmm-${element.sequence_based_macromolecule.id}`;
  }, []);

  return (
    <ElementGroupsRenderer
      type="sequence_based_macromolecule_sample"
      elements={elements}
      getGroupKey={getGroupKey}
      getGroupHeaderDragType={([sbmmSample]) => (
        DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE
      )}
      renderGroupHeader={(group, toggleGroupCollapse) => (
        <ListItemHeader
          group={group}
          toggleGroupCollapse={toggleGroupCollapse}
        />
      )}
      renderGroupItem={(element, showDetails) => (
        <ListItem
          element={element}
          showDetails={showDetails}
        />
      )}
    />
  );
}

SequenceBasedMacromoleculeSampleList.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.instanceOf(SequenceBasedMacromoleculeSample)).isRequired,
};

export default observer(SequenceBasedMacromoleculeSampleList);
