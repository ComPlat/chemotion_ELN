import React from 'react';
import {Button, FormControls, Input, Modal} from 'react-bootstrap';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

export default class SampleDetails extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = {
      sample: null,
      id: props.params.id
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
    ElementActions.fetchSampleById(this.state.id);
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState({sample: state.samples[0]});
  }

  hideModal() {
    this.context.router.transitionTo('/');
  }

  sampleName() {
    let sample = this.state.sample;

    return sample ? sample.name : '';
  }

  createdAt() {
    let sample = this.state.sample;

    return sample ? sample.created_at : '';
  }

  updateSample() {
    ElementActions.updateSample({
      id: this.state.id,
      name: this.refs.nameInput.getValue() || this.state.sample.name
    })
  }

  render() {
    let units = [{
      name: 't',
      callback: value => {
        console.log('unit t selected');
        console.log("value: " + value);
      }
    },
      {
        name: 'l',
        callback: value => {
          console.log('unit l selected');
          console.log("value: " + value);
        }
      }
    ];

    return (
      <div>
        <Modal animation show={true} dialogClassName="sample-details" onHide={this.hideModal.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>{this.sampleName()}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <form>
              <Input type="text" label="Name" ref="nameInput" placeholder={this.sampleName()} />
              <FormControls.Static label="Created at" value={this.createdAt()} />
              <Button bsStyle="warning" onClick={this.updateSample.bind(this)}>Update Sample</Button>
            </form>
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
