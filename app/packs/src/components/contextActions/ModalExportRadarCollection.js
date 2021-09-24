import React from 'react';
import {Button, ButtonToolbar} from 'react-bootstrap';
import UIStore from './../stores/UIStore';
import CollectionStore from './../stores/CollectionStore';

export default class ModalExportRadarCollection extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      processing: false
    }

    this.handleClick = this.handleClick.bind(this)
  }

  handleClick() {
    const { onHide, action } = this.props;
    const { currentCollection } = UIStore.getState();
    this.setState({ processing: true });


    const params = {
      collection_id: currentCollection.id
    };

    action(params);

    setTimeout(() => {
      this.setState({ processing: false });
      onHide();
    }, 1000);
  }

  renderButtonBar() {
    const { onHide } = this.props;
    const { processing } = this.state;
    const bStyle = processing === true ? 'danger' : 'warning';
    const bClass = processing === true ? 'fa fa-spinner fa-pulse fa-fw' : 'fa fa-file-text-o';
    const bTitle = processing === true ? 'Archiving' : 'Archive to RADAR';
    return (
      <ButtonToolbar>
        <div className="pull-right">
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={onHide}>Cancel</Button>
            <Button
              bsStyle={bStyle}
              id="md-export-dropdown"
              disabled={this.isDisabled()}
              title="Archive to RADAR"
              onClick={this.handleClick}
            >
              <span><i className={bClass} />&nbsp;{bTitle}</span>
            </Button>
          </ButtonToolbar>
        </div>
      </ButtonToolbar>
    );
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
      <div className="export-collections-modal">
        {this.renderButtonBar()}
      </div>
    )
  }
}
