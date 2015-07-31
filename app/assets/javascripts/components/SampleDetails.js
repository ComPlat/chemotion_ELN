import React from 'react';
import {Modal} from 'react-bootstrap';

class SampleDetails extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      id: props.params.id
    }
  }

  hideModal() {
    this.context.router.transitionTo('/');
  }

  render() {
    return (
      <div>
        <Modal animation show={true} dialogClassName="sample-details" onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>{this.state.id}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Details<br/>
            Details<br/>
            Details<br/>
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}

// see http://stackoverflow.com/questions/31539349/how-to-emulate-window-location-with-react-router-and-es6-classes
// for usage of transitionTo with es6
SampleDetails.contextTypes = {
  router: React.PropTypes.func.isRequired
};

module.exports = SampleDetails;
