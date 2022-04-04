import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tabs, Tab } from 'react-bootstrap';
import Reaction from './models/Reaction';
import ReactionTlcDetails from './ReactionTlcDetails';

export default class ReactionTlcSection extends Component {
  constructor(props) {
    super(props);

    const { reaction } = props;
    this.state = {
      reaction: reaction
    };
  }

  sampleType() {
    const { reaction, onChange } = this.props;
    const sampleType = ['Starting Materials', 'Reactants', 'Products'];

    const eachTab = sampleType.map((index) => {
      return (
        <Tab key={index} eventKey={index} title={index}>
          <ReactionTlcDetails
            reaction={reaction}
            onChange={onChange}
            tabType={index}
          />
        </Tab>
      );
    });

    return (
      <Tabs
        defaultActiveKey="Starting Materials"
        id="TlcTabs"
        style={{ marginTop: '2px' }}
      >
        {eachTab}
      </Tabs>
    );
  }

  render() {
    return (
      <div>
        {this.sampleType()}
      </div>
    );
  }
}

ReactionTlcSection.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onChange: PropTypes.func.isRequired
};

