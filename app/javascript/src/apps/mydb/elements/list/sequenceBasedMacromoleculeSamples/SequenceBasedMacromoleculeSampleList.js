import React, { useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { Badge } from 'react-bootstrap';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';
import { DragDropItemTypes } from 'src/utilities/DndConst';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

function ListItemHeader({
  group,
  toggleGroupCollapse,
  groupedByValue,
}) {
  let groupName = (
    <>
      <span>{group[0].sbmmShortLabel()}</span>
      <span>{group[0].sequence_based_macromolecule.short_name}</span>
    </>
  );

  if (groupedByValue === 'sbmm_sequence') {
    const sequence = group[0].sequence_based_macromolecule.sequence;
    const startSequence = sequence.slice(0, 10);
    const endSequence = sequence.slice(-10);
    const displaySequence = sequence.length > 30 ? `${startSequence} ... ${endSequence}` : sequence;
    groupName = (<span>{displaySequence}</span>);
  }
  return (
    <div
      onClick={() => toggleGroupCollapse()}
      role="button"
    >
      <div className="d-flex align-items-center gap-2 fw-bold fs-5">
        {groupName}
      </div>
    </div>
  );
}

ListItemHeader.propTypes = {
  group: PropTypes.arrayOf(PropTypes.instanceOf(SequenceBasedMacromoleculeSample)).isRequired,
  toggleGroupCollapse: PropTypes.func.isRequired,
  groupedByValue: PropTypes.string.isRequired,
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
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const groupedByValue = sbmmStore.list_grouped_by;

  const getGroupKey = useCallback((element) => {
    if (groupedByValue === 'sbmm_sequence') {
      return element.sequence_based_macromolecule.sequence;
    } else {
      return `sbmm-${element.sequence_based_macromolecule.id}`;
    }
  }, [groupedByValue]);

  let dndType = '';
  if (groupedByValue === 'sbmm') {
    dndType = ([sbmmSample]) => (
      DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE
    )
  }

  return (
    <ElementGroupsRenderer
      type="sequence_based_macromolecule_sample"
      elements={elements}
      getGroupKey={getGroupKey}
      getGroupHeaderDragType={dndType}
      renderGroupHeader={(group, toggleGroupCollapse) => (
        <ListItemHeader
          group={group}
          toggleGroupCollapse={toggleGroupCollapse}
          groupedByValue={groupedByValue}
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
