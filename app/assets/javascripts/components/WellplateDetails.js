import React, {Component} from 'react';
import {Panel} from 'react-bootstrap';
import WellPlate from './Wellplate';

export default class WellplateDetails extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <Panel header="Wellplate Details" bsStyle='primary'>
          <h3>{wellplate.name}</h3>
          <Wellplate {...wellplate}
            handleWellplateChange={(wells) => {console.log(wells)}}/>
        </Panel>
      </div>
    );
  }
}

let wellplate = {
  cols: 4,
  wells: [{
    id: 1,
    text: '1',
    sampleId: 1
  }, {
    id: 2,
    text: '2',
    sampleId: 2
  }, {
    id: 3,
    text: '3',
    sampleId: 3
  }, {
    id: 4,
    text: '4',
    sampleId: 4
  }, {
    id: 5,
    text: '5',
    sampleId: 5
  }, {
    id: 6,
    text: '6',
    sampleId: 6
  }, {
    id: 7,
    text: '7',
    sampleId: 7
  }, {
    id: 8,
    text: '8',
    sampleId: 8
  }, {
    id: 9,
    text: '9',
    sampleId: 9
  }, {
    id: 10,
    text: '10',
    sampleId: 10
  }, {
    id: 11,
    text: '11'
  }, {
    id: 12,
    text: '12'
  }]
};
