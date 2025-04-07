import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';
import SampleGroupMoleculeHeader from 'src/apps/mydb/elements/list/sample/SampleGroupMoleculeHeader';
import SampleGroupItem from 'src/apps/mydb/elements/list/sample/SampleGroupItem';
import Sample from 'src/models/Sample';

import { DragDropItemTypes } from 'src/utilities/DndConst';

function SampleGroupContainer({
  elements,
  isGroupCollapsed,
  toggleGroupCollapse,
  moleculeSort,
}) {
  const getGroupKey = useCallback((sample) => sample.getMoleculeId(), []);

  return (
    <ElementGroupsRenderer
      elements={elements}
      getGroupKey={getGroupKey}
      isGroupCollapsed={isGroupCollapsed}
      toggleGroupCollapse={toggleGroupCollapse}
      getGroupHeaderDragType={([sample]) => (
        !sample.isNoStructureSample()
          ? DragDropItemTypes.MOLECULE
          : null
      )}
      renderGroupHeader={([sample]) => (
        <SampleGroupMoleculeHeader
          sample={sample}
          onClick={() => toggleGroupCollapse(getGroupKey(sample))}
        />
      )}
      renderGroupItem={(item, showDetails) => (
        <SampleGroupItem sample={item} showDetails={showDetails} />
      )}
      initialGroupLimit={moleculeSort ? 3 : null}
    />
  );
}

SampleGroupContainer.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.instanceOf(Sample)).isRequired,
  isGroupCollapsed: PropTypes.func.isRequired,
  toggleGroupCollapse: PropTypes.func.isRequired,
  moleculeSort: PropTypes.bool.isRequired,
};

export default SampleGroupContainer;
