import PropTypes from 'prop-types';
import React from 'react';
import { Form, ControlLabel, Button } from 'react-bootstrap';

import _ from 'lodash';

class FileItemFileNameFilter extends React.Component {
  constructor(props) {
    super(props);

    this.state = { text: '', showArchived: false };

    this.inputRef = React.createRef();

    this.valueGetter = props.valueGetter;
    this.onChange = this.onChange.bind(this);
    this.toggleArchived = this.toggleArchived.bind(this);
    this.debouncedChangedCallback = _.debounce(props.filterChangedCallback.bind(this), 300);
  }

  onChange(event) {
    const newValue = event.target.value;
    if (this.state.text === newValue) return;

    this.setState({ text: newValue }, this.debouncedChangedCallback);
  }

  getModel() {
    const { text, showArchived } = this.state;
    return { text, showArchived };
  }

  setModel(model) {
    const text = model ? model.value : '';
    const showArchived = model ? model.showArchived : false;

    this.setState({ text, showArchived });
  }

  toggleArchived() {
    this.setState({ showArchived: !this.state.showArchived }, this.debouncedChangedCallback);
  }

  doesFilterPass(params) {
    const { text, showArchived } = this.state;

    let iter = params.node;
    while (iter.level > 0) iter = iter.parent;

    const { fileName, extendedMetadata } = iter.data;
    const passText = fileName.includes(text);
    let { archived } = extendedMetadata;
    if (archived == null) archived = false;

    // If showArchived, check passText
    if (showArchived) return passText;

    // Otherwise, archived items will not passed
    return passText && !archived;
  }

  isFilterActive() { return true; }

  afterGuiAttached() {
    this.inputRef.current.focus();
  }

  render() {
    const { showArchived } = this.state;

    let textArchive;
    let icon;
    if (showArchived) {
      textArchive = 'Hide';
      icon = (
        <span className="fa-stack" style={{ fontSize: '0.63em' }}>
          <i className="fa fa-archive fa-stack-1x" />
          <i className="fa fa-ban fa-stack-2x text-danger" />
        </span>
      );
    } else {
      textArchive = 'Show';
      icon = (<i className="fa fa-archive" />);
    }

    return (
      <div className="ag-filter-body-wrapper">
        <div className="ag-filter-body" >
          <div className="ag-input-wrapper file-filter" style={{ margin: '4px 4px 1px 4px' }}>
            <div style={{ display: 'contents' }}>
              <Form inline style={{ margin: '4px 4px 1px 4px', width: '100%' }}>
                <ControlLabel style={{ marginRight: '30px' }}>
                  File Name
                </ControlLabel>
                <input
                  ref={this.inputRef}
                  value={this.state.text}
                  onChange={this.onChange}
                  style={{ width: '65%' }}
                  className="ag-filter-filter"
                  placeholder="Filter ..."
                />
              </Form>
            </div>
            <div style={{ display: 'contents' }}>
              <Form inline style={{ margin: '4px 4px 1px 4px', width: '100%' }}>
                <ControlLabel style={{ marginRight: '5px', width: '89px' }}>
                  {textArchive} Archived
                </ControlLabel>
                <Button bsSize="xsmall" onClick={this.toggleArchived}>
                  {icon}
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

FileItemFileNameFilter.propTypes = {
  valueGetter: PropTypes.func.isRequired,
  filterChangedCallback: PropTypes.func.isRequired,
};

export default FileItemFileNameFilter;
