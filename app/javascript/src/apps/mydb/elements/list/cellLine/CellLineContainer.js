import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

import CellLineGroupItem from 'src/apps/mydb/elements/list/cellLine/CellLineGroupItem';
import CellLineGroupHeader from 'src/apps/mydb/elements/list/cellLine/CellLineGroupHeader';
import CellLine from 'src/models/cellLine/CellLine';

import ElementGroupsRenderer from 'src/apps/mydb/elements/list/renderers/ElementGroupsRenderer';

function CellLineContainer({
  elements,
  isGroupCollapsed,
  toggleGroupCollapse,
}) {
  const getGroupKey = useCallback(
    (element) => `${element.cellLineName}:${element.source}`,
    []
  );

  return (
    <ElementGroupsRenderer
      elements={elements}
      getGroupKey={getGroupKey}
      isGroupCollapsed={isGroupCollapsed}
      toggleGroupCollapse={toggleGroupCollapse}
      renderGroupHeader={(group) => (
        <CellLineGroupHeader cellLineItems={group} />
      )}
      renderGroupItem={(item, showDetails) => (
        <CellLineGroupItem
          cellLineItem={item}
          showDetails={showDetails}
        />
      )}
    />
  );
}

CellLineContainer.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.instanceOf(CellLine)).isRequired,
  isGroupCollapsed: PropTypes.func.isRequired,
  toggleGroupCollapse: PropTypes.func.isRequired,
};

export default CellLineContainer;
