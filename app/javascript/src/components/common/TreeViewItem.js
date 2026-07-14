import React from 'react';
import PropTypes from 'prop-types';
import ChevronIcon from 'src/components/common/ChevronIcon';

export default function TreeViewItem({
  id,
  title,
  selected,
  level,
  hasChildren,
  expanded,
  onClick,
  onToggleExpand,
  meta,
  actions,
  children,
}) {
  const handleKeyDown = (e) => {
    if (!onClick || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div>
      <div
        id={id}
        className={`tree-view__item ${selected ? 'tree-view__item--selected' : ''}`}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        style={{ paddingLeft: `${((level - 0.5) * 12) - 4}px` }}
      >
        {hasChildren ? (
          <ChevronIcon
            direction={expanded ? 'down' : 'right'}
            onClick={onToggleExpand}
          />
        ) : (<i className="fa fa-fw" />)}
        <span className="tree-view__title">{title}</span>
        {meta}
        {actions}
      </div>
      {expanded && hasChildren && (
        <div className="tree-view">
          {children}
        </div>
      )}
    </div>
  );
}

TreeViewItem.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  level: PropTypes.number,
  hasChildren: PropTypes.bool,
  expanded: PropTypes.bool,
  onClick: PropTypes.func,
  onToggleExpand: PropTypes.func,
  meta: PropTypes.node,
  actions: PropTypes.node,
  children: PropTypes.node,
};

TreeViewItem.defaultProps = {
  id: undefined,
  selected: false,
  level: 1,
  hasChildren: false,
  expanded: false,
  onClick: undefined,
  onToggleExpand: undefined,
  meta: null,
  actions: null,
  children: null,
};
