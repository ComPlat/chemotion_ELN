import React from 'react';
import {Button, ButtonToolbar, Checkbox} from 'react-bootstrap';

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

  handleClick() {
    const { onHide, action } = this.props;
    action(this.state);
    onHide();
  }

  onHide() {
    this.props.onHide();
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
          Also delete reaction subsamples?
        </Checkbox>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={this.onHide}>Cancel</Button>
          <Button bsStyle="warning" onClick={this.handleClick}>Delete</Button>
        </ButtonToolbar>
      </div>
    );
  }
}
