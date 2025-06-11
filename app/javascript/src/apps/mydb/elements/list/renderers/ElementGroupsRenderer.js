import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Set } from 'immutable';
import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';
import ElementItem from 'src/apps/mydb/elements/list/renderers/ElementItem';
import ChevronIcon from 'src/components/common/ChevronIcon';

function ElementGroupsRenderer({
  type,
  getGroupKey,
  getItemKey,
  elements,
  renderGroupHeader,
  renderGroupItem,
  getGroupHeaderDragType,
  initialGroupLimit,
}) {
  const [groupLimits, setGroupLimits] = useState({});
  useEffect(() => setGroupLimits({}), [elements, getGroupKey]);

  const groups = useMemo(() => {
    const groupedElements = {};
    elements.forEach((element) => {
      const groupKey = getGroupKey(element);
      // Elements may be part of multiple groups
      const groupKeys = Array.isArray(groupKey) ? groupKey : [groupKey];

      groupKeys.forEach((k) => {
        if (!groupedElements[k]) {
          groupedElements[k] = [];
        }
        groupedElements[k].push(element);
      });
    });
    return groupedElements;
  }, [elements, getGroupKey]);

  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  useEffect(() => {
    const updateCollapsedGroups = ({ groupCollapse }) => {
      if (!groupCollapse[type]) {
        setCollapsedGroups(new Set());
        return;
      }

      const { baseState, except } = groupCollapse[type];
      const isGroupCollapsed = (groupKey) => (
        (baseState === 'collapsed')
          ? !except.has(groupKey)
          : except.has(groupKey)
      );

      setCollapsedGroups(Object.keys(groups).reduce(
        (acc, groupKey) => (isGroupCollapsed(groupKey) ? acc.add(groupKey) : acc),
        new Set(),
      ));
    };

    UIStore.listen(updateCollapsedGroups);
    return () => UIStore.unlisten(updateCollapsedGroups);
  }, [groups, type]);

  const showMoreItems = (groupKey) => {
    setGroupLimits((prev) => ({
      ...prev,
      [groupKey]: (prev[groupKey] || initialGroupLimit) + 3,
    }));
  };

  const getGroupLimit = initialGroupLimit === null
    ? () => Number.POSITIVE_INFINITY
    : (groupKey) => (groupLimits[groupKey] || initialGroupLimit);

  if (!groups || groups.length === 0) {
    return <div>No elements available</div>;
  }

  return (
    <div className="element-groups-renderer">
      {Object.keys(groups).map((groupKey) => {
        const group = groups[groupKey];
        const groupLimit = getGroupLimit(groupKey);
        const isCollapsed = collapsedGroups.has(groupKey);
        const toggleGroupCollapse = () => {
          UIActions.toggleGroupCollapse({ type, groupKey });
        };
        const groupHeaderDragType = typeof getGroupHeaderDragType === 'function'
          ? getGroupHeaderDragType(group)
          : null;

        return (
          <div key={`element-group:${groupKey}`} className="element-group">
            <div className="element-group-header">
              {groupHeaderDragType && (
                <div className="element-group-header-drag-handle">
                  <ElementDragHandle
                    element={group[0]}
                    sourceType={groupHeaderDragType}
                  />
                </div>
              )}
              <div className="element-group-header-content">
                {renderGroupHeader(group, toggleGroupCollapse)}
              </div>
              <div className="element-group-header-collapse">
                <OverlayTrigger
                  placement="top"
                  overlay={(
                    <Tooltip id={`collapse-tooltip-${groupKey}`}>
                      {`${isCollapsed ? 'Expand' : 'Collapse'} group`}
                    </Tooltip>
                  )}
                >
                  <ChevronIcon
                    direction={isCollapsed ? 'right' : 'down'}
                    color="primary"
                    onClick={toggleGroupCollapse}
                  />
                </OverlayTrigger>
              </div>
            </div>
            {!isCollapsed && (
              <>
                <div className="element-group-items">
                  {group.slice(0, groupLimit).map(
                    (element) => (
                      <ElementItem
                        key={`eliment-group-item:${groupKey}-${getItemKey(element)}`}
                        element={element}
                        renderItem={renderGroupItem}
                      />
                    )
                  )}
                </div>
                {group.length > groupLimit && (
                  <div className="element-group-show-more">
                    <Button
                      type="button"
                      variant="info"
                      onClick={() => showMoreItems(groupKey)}
                    >
                      Show more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

ElementGroupsRenderer.propTypes = {
  type: PropTypes.string.isRequired,
  getGroupKey: PropTypes.func.isRequired,
  getItemKey: PropTypes.func,
  elements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string,
      ]).isRequired,
    }),
  ).isRequired,
  renderGroupHeader: PropTypes.func.isRequired,
  renderGroupItem: PropTypes.func.isRequired,
  getGroupHeaderDragType: PropTypes.func,
  initialGroupLimit: PropTypes.number,
};

ElementGroupsRenderer.defaultProps = {
  initialGroupLimit: null,
  getGroupHeaderDragType: null,
  getItemKey: (item) => item.id,
};

export default ElementGroupsRenderer;
