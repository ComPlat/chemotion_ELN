import React from 'react';
import {Button, ButtonToolbar, FormControls, Input, Modal} from 'react-bootstrap';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

import Aviator from 'aviator';

export default class SampleDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sample: null,
      id: props.id
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
    if(this.state.id) {
      ElementActions.fetchSampleById(this.state.id);
    }
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    if(state.currentElement) {
      this.setState({
        sample: state.currentElement,
        id: state.currentElement.id
      });
    }
  }

  closeDetails() {
    Aviator.navigate('/');
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

