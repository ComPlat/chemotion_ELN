import PropTypes from 'prop-types';
import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

class FileItemApproveFilter extends React.Component {
  constructor(props) {
    super(props);

    this.state = { isApproved: null };

    this.valueGetter = props.valueGetter;
    this.onChange = this.onChange.bind(this);
  }

  onChange() {
    const { isApproved } = this.state;
    let newValue;
    if (isApproved === null) {
      newValue = true;
    } else if (isApproved) {
      newValue = false;
    } else {
      newValue = null;
    }

    this.setState({ isApproved: newValue }, this.props.filterChangedCallback);
  }

  getModel() {
    return { value: this.state.text };
  }

  setModel(model) {
    const text = model ? model.value : '';
    this.setState({ text });
  }

  doesFilterPass(params) {
    return params.data.isApproved === this.state.isApproved;
  }

  isFilterActive() {
    return this.state.isApproved !== null;
  }

  render() {
    const { isApproved } = this.state;

    let tooltipText;
    let bsStyle;
    let icon;
    let style = {};
    if (isApproved === null) {
      tooltipText = 'Show All';
      bsStyle = 'default';
      icon = 'check';
      style = { color: '#ccc' };
    } else if (isApproved) {
      tooltipText = 'Show Approved';
      bsStyle = 'success';
      icon = 'check-circle';
    } else {
      tooltipText = 'Show Not Approved';
      bsStyle = 'warning';
      icon = 'check-circle-o';
    }

    const tooltipId = 'cs-approve--filter-tooltip';
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

FileItemApproveFilter.propTypes = {
  valueGetter: PropTypes.func.isRequired,
  filterChangedCallback: PropTypes.func.isRequired,
};

export default FileItemApproveFilter;
