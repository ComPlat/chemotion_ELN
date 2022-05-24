import PropTypes from 'prop-types';
import React, { Component } from 'react';

class FileItemTreeCellRenderer extends Component {
  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
  }

  onClick(data) {
    this.props.onClick(data);
  }

  render() {
    const { data, valueGetter } = this.props;
    const onClick = () => this.onClick(data);
    const { expanded } = data;

    const icon = expanded ? 'ag-icon-tree-open' : 'ag-icon-tree-closed';
    const iconWrapper = expanded ? 'ag-group-expanded' : 'ag-group-contracted';
    const level = data.level || 0;
    const iconComp = (
      <span className={iconWrapper}>
        <span className={`ag-icon ${icon}`} role="presentation" />
      </span>
    );

    return (
      <div
        className="ag-cell ag-cell-auto-height ag-cell-value"
        aria-expanded="true"
      >
        <span
          className={`ag-cell-wrapper ag-cell-expandable ag-row-group-indent-${level}`}
          onClick={onClick}
          role="button"
          aria-hidden="true"
        >
          { (data.children || []).length > 0 ? iconComp : null }
          <span className="ag-group-value">{valueGetter(data)}</span>
        </span>
      </div>
    );
  }
}

FileItemTreeCellRenderer.propTypes = {
  data: PropTypes.instanceOf(Object).isRequired,
  onClick: PropTypes.func.isRequired,
  valueGetter: PropTypes.func.isRequired,
};

export default FileItemTreeCellRenderer;
