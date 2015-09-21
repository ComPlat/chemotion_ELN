import React, {Component} from 'react';
import {Panel} from 'react-bootstrap';
import Wellplate from './Wellplate';

export default class WellplateDetails extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {wellplate} = this.props;
    return (
      <div>
        <Panel header="Wellplate Details" bsStyle='primary'>
          <h3>{wellplate.name}</h3>
          <Wellplate {...wellplate}
            handleWellplateChange={(wellContainers) => {console.log(wellContainers)}}/>
        </Panel>
      </div>
    );
  }
}