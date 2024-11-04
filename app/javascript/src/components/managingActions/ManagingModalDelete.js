import React from 'react';
import { Button, ButtonToolbar, Checkbox, OverlayTrigger, Tooltip, Label } from 'react-bootstrap';

export default class ManagingModalDelete extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      deleteSubsamples: false,
    };

    this.handleCheck = this.handleCheck.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.onHide = this.onHide.bind(this);
  }

  onHide() {
    this.props.onHide();
  }

  handleClick() {
    const { onHide, action } = this.props;
    action(this.state);
    onHide();
  }

  handleCheck() {
    const { deleteSubsamples } = this.state;

    this.setState({
      deleteSubsamples: !deleteSubsamples,
    });
  }

  render() {
    return (
      <div>
        <Checkbox
          onChange={this.handleCheck}
          checked={this.state.deleteSubsamples}
        >
          Also delete reaction associated samples&nbsp;
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="delete_reaction_samples_info">if left unchecked, only the solvent and reactant samples of the selected reactions will be deleted</Tooltip>}
          >
            <Label>?</Label>
          </OverlayTrigger>
        </Checkbox>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={this.onHide}>Cancel</Button>
          <Button bsStyle="warning" onClick={this.handleClick}>Delete</Button>
        </ButtonToolbar>
      </div>
    );
  }
}
