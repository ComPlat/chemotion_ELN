import PropTypes from 'prop-types';
import React from 'react';

import _ from 'lodash';

class FileItemVersionFilter extends React.Component {
  constructor(props) {
    super(props);

    this.state = { text: '' };

    this.inputRef = React.createRef();

    this.valueGetter = props.valueGetter;
    this.onChange = this.onChange.bind(this);
    this.debouncedChangedCallback = _.debounce(props.filterChangedCallback.bind(this), 300);
  }

  onChange(event) {
    const newValue = event.target.value;
    if (this.state.text === newValue) return;

    this.setState({ text: newValue }, this.debouncedChangedCallback);
  }

  getModel() {
    return { value: this.state.text };
  }

  setModel(model) {
    const text = model ? model.value : '';
    this.setState({ text });
  }

  doesFilterPass(params) {
    return params.node.data.version === this.state.text;
  }

  isFilterActive() {
    return this.state.text;
  }

  afterGuiAttached() {
    this.inputRef.current.focus();
  }

  render() {
    return (
      <div className="ag-filter-body-wrapper">
        <div className="ag-filter-body" >
          <div className="ag-input-wrapper" style={{ margin: '4px 4px 1px 4px' }}>
            <input
              ref={this.inputRef}
              value={this.state.text}
              onChange={this.onChange}
              className="ag-filter-filter"
              placeholder="Filter ..."
            />
          </div>
        </div>
      </div>
    );
  }
}

FileItemVersionFilter.propTypes = {
  valueGetter: PropTypes.func.isRequired,
  filterChangedCallback: PropTypes.func.isRequired,
};

export default FileItemVersionFilter;
