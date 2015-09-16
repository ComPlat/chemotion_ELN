import React, {Component} from 'react';
import {Panel} from 'react-bootstrap';

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
