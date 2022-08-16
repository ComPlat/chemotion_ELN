import React, { Component } from 'react';
import { OverlayTrigger, Tooltip, Button, Glyphicon, ControlLabel, InputGroup } from 'react-bootstrap';
import ScanTaskFetcher from 'src/fetchers/ScanTaskFetcher'
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class AddScanTaskButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      disabled: props.disabled,
    };

    this.handleOnClick = this.handleOnClick.bind(this);
  }

  handleOnClick() {
    const { data } = this.props;
    ScanTaskFetcher.addNewTask(data.id).then((result) => {
      if (result && result.hasOwnProperty('id')) {
        NotificationActions.add({ message: `A weighting task for sample ${data.showed_name} was created successful`, level: 'success', position: 'tr' });
        this.setState({disabled: true});
      } else {
        NotificationActions.add({ message: result.error, level: 'error', position: 'tr' }); 
      }
    });
  }

  render() {
    const { data, bsSize } = this.props;
    let { disabled } = this.state;
    disabled = disabled && !isNaN(data.id);
    return (
      <div>
        <OverlayTrigger disabled={disabled} placement="top" overlay={this.infoMessage(data)}>
          <Button disabled={disabled} className="btn btn-circle btn-sm btn-success" bsSize={bsSize} onClick={this.handleOnClick}>
            <Glyphicon glyph="glyphicon glyphicon-tasks" />
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  infoMessage(data) {
    return (<Tooltip id="addScanTaskButton">
      Add a weighting task for this {data.showed_name}
    </Tooltip>);
  }
}