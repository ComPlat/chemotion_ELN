import React from 'react';
import {Button, ButtonToolbar} from 'react-bootstrap';
import UIStore from './../stores/UIStore';

export default class ModalExportCollection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      nested: true,
      processing: false
    }
    this.handleClick = this.handleClick.bind(this)
    this.toggleCheckbox = this.toggleCheckbox.bind(this)
  }

  checkbox() {
    return (
      <div>
        <input type="checkbox"
                 onChange={this.toggleCheckbox}
                 checked={this.state.nested}
                 className="common-checkbox" />
        <span className="g-marginLeft--10"> Include nested collections </span>
      </div>
    )
  }

  buttonBar() {
    const { onHide } = this.props;
    const { processing } = this.state;
    const bStyle = processing === true ? 'danger' : 'warning';
    const bClass = processing === true ? 'fa fa-spinner fa-pulse fa-fw' : 'fa fa-file-text-o';
    const bTitle = processing === true ? 'Exporting' : 'Export ZIP';
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
            <Button bsStyle={bStyle} id="md-export-dropdown" disabled={this.isDisabled()}
                title="Export as ZIP file (incl. attachments)" onClick={this.handleClick}>
                <span><i  className={bClass} />{bTitle}</span>
            </Button>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>
    )
  }

  handleClick() {
    const uiState = UIStore.getState();
    const { onHide, action, full } = this.props;
    this.setState({ processing: true });
    const params = {
      collections: (full ? [] : [uiState.currentCollection.id]),
      format: 'zip',
      nested: this.state.nested
    };
    action(params);
    setTimeout(() => {
      this.setState({ processing: false });
      onHide();
    }, 1800);
  }

  toggleCheckbox() {
    let newNested = !this.state.nested;

    this.setState({
      nested: newNested
    })
  }

  isDisabled() {
    const { processing } = this.state;
    return processing === true;
  }

  render() {
    const onChange = (v) => this.setState(
      previousState => {return { ...previousState, value: v }}
    )
    const { full } = this.props;
    return (
      <div>
        {!full && this.checkbox()}
        {this.buttonBar()}
      </div>
    )
  }
}
