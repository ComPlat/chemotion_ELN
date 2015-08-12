import React from 'react';
import {Button, ButtonToolbar, FormControls, Input, Modal} from 'react-bootstrap';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

export default class SampleDetails extends React.Component {
  constructor(props, context) {
    console.log("constructor");

    super(props, context);
    this.state = {
      sample: null,
      id: props.params.id
    }
  }

  componentDidMount() {
    console.log("componentDidMount");
    ElementStore.listen(this.onChange.bind(this));
    ElementActions.fetchSampleById(this.state.id);
  }

  componentWillUnmount() {
    console.log("componentWillUnmount");
    ElementStore.unlisten(this.onChange.bind(this));
  }

  componentWillReceiveProps(nextProps) {
    console.log("componentWillReceiveProps");

    if(nextProps.params && nextProps.params.id && nextProps.params.id != this.state.id) {
      ElementActions.fetchSampleById(nextProps.params.id);
    }
  }

  onChange(state) {
    console.log("onChange");
    console.log(state.currentSample);
    if(state.currentSample) {
      this.setState({
        sample: state.currentSample,
        id: state.currentSample.id
      });
    }
  }

  closeDetails() {
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
    let ajaxCall = (unit, nextUnit, value) => {
      console.log("ajax call with unit: " + unit + " nextUnit: " + nextUnit + " and value: " + value);
      let convertedValue = value;
      if (unit && nextUnit && unit != nextUnit) {
        switch (unit) {
          case 'g':
            if (nextUnit == 'mol') {
              convertedValue = value * 2;
            }
            break;
          case 'mol':
            if (nextUnit == 'g') {
              convertedValue = value / 2;
            }
            break;
        }
      }
      console.log("result:" + convertedValue);
      return convertedValue;
    };

    return (
      <div>
        <h2>{this.sampleName()}</h2>
        <form>
          <Input type="text" label="Name" ref="nameInput" placeholder={this.sampleName()} />
          <FormControls.Static label="Created at" value={this.createdAt()} />
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={this.closeDetails.bind(this)}>Back</Button>
            <Button bsStyle="warning" onClick={this.updateSample.bind(this)}>Update Sample</Button>
          </ButtonToolbar>
        </form>
      </div>
    )
  }
}

// see http://stackoverflow.com/questions/31539349/how-to-emulate-window-location-with-react-router-and-es6-classes
// for usage of transitionTo with es6
SampleDetails.contextTypes = {
  router: React.PropTypes.func.isRequired
};
