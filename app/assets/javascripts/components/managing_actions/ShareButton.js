import React from 'react';
import {Button} from 'react-bootstrap';

export default class ShareButton extends React.Component {
  constructor(props, context) {
    super(props, context);
  }

  showShareModal() {
    this.context.router.transitionTo('/sharing');
  }

  render() {
    return (
      <Button onClick={this.showShareModal.bind(this)}>Share</Button>
    )
  }
}

ShareButton.contextTypes = {
  router: React.PropTypes.func.isRequired
};
