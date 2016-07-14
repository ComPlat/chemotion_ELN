import React from 'react';
import {Button, ButtonToolbar, Checkbox} from 'react-bootstrap';

export default class ManagingModalDelete extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      delete_subsamples: false
    }
  }

  handleClick() {
    const {onHide, action} = this.props;
    action(this.state);
    onHide();
  }

  handleCheck() {
    let {delete_subsamples} = this.state;

    this.setState({
      delete_subsamples: !delete_subsamples
    });
  }

  render() {
    const {onHide} = this.props;
    return (
      <div>
        <Checkbox onChange={() => this.handleCheck()} checked={this.state.checked ? this.state.checked : false}>
          Also delete reaction subsamples?
        </Checkbox>
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
          <Button bsStyle="warning" onClick={() => this.handleClick()}>Delete</Button>
        </ButtonToolbar>
      </div>
    )
  }
}
