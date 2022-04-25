import PropTypes from 'prop-types';
import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

class FileItemImportedFilter extends React.Component {
  constructor(props) {
    super(props);

    this.state = { isImported: null };

    this.valueGetter = props.valueGetter;
    this.onChange = this.onChange.bind(this);
  }

  onChange() {
    const { isImported } = this.state;
    let newValue;
    if (isImported === null) {
      newValue = true;
    } else if (isImported) {
      newValue = false;
    } else {
      newValue = null;
    }

    this.setState({ isImported: newValue }, this.props.filterChangedCallback);
  }

  getModel() {
    return { value: this.state.text };
  }

  setModel(model) {
    const text = model ? model.value : '';
    this.setState({ text });
  }

  doesFilterPass(params) {
    return params.data.isImported === this.state.isImported;
  }

  isFilterActive() {
    return this.state.isImported !== null;
  }

  render() {
    const { isImported } = this.state;

    let tooltipText;
    let bsStyle;
    let icon;
    let style = {};

    if (isImported === null) {
      tooltipText = 'Show All';
      bsStyle = 'default';
      icon = 'check';
      style = { color: '#ccc' };
    } else if (isImported) {
      tooltipText = 'Show Transferred';
      bsStyle = 'success';
      icon = 'check-circle';
    } else {
      tooltipText = 'Show Not Transferred';
      bsStyle = 'warning';
      icon = 'check-circle-o';
    }

    const tooltipId = 'cs-imported-filter-tooltip';
    const tooltip = <Tooltip id={tooltipId}>{tooltipText}</Tooltip>;

    return (
      <div className="ag-filter-body-wrapper">
        <div className="ag-filter-body" style={{ width: '50px' }} >
          <div className="ag-input-wrapper" style={{ margin: '4px 4px 1px 4px' }}>
            <OverlayTrigger placement="top" overlay={tooltip} >
              <Button
                bsSize="xsmall"
                bsStyle={bsStyle}
                onClick={this.onChange}
                style={style}
              >
                <i className={`fa fa-${icon}`} />
              </Button>
            </OverlayTrigger>
          </div>
        </div>
      </div>
    );
  }
}

FileItemImportedFilter.propTypes = {
  valueGetter: PropTypes.func.isRequired,
  filterChangedCallback: PropTypes.func.isRequired,
};

export default FileItemImportedFilter;
