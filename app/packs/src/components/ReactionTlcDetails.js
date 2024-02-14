import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tab, Tabs } from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import SampleTlcControl from 'src/components/SampleTlcControl';

// eslint-disable-next-line react/prefer-stateless-function
export default class ReactionTlcDetails extends Component {

  constructor(props) {
    super(props);

    const { reaction } = props;
    this.state = {
      // eslint-disable-next-line object-shorthand
      reaction: reaction
    };
  }

  // eslint-disable-next-line class-methods-use-this
  title(sample) {
    const moleculeLabel = sample.molecule_name_hash ? sample.molecule_name_hash.label : sample.molecule_iupac_name;
    // eslint-disable-next-line prefer-template
    const moleculeLabelMiniString = moleculeLabel ? moleculeLabel.substring(0, 12) + '...' : moleculeLabel;
    const sampleTabLabel = (moleculeLabel && moleculeLabel.length <= 12) ? moleculeLabel : moleculeLabelMiniString;
    return (
      <span
        className="pseudo-link"
        style={{ cursor: 'pointer' }}
        title={moleculeLabel || sample.name}
      >
        <i />{sampleTabLabel}
      </span>
    );
  }

  allReactionMaterials() {
    const { products, reactants, starting_materials } = this.state.reaction;
    const respectiveSamples = [];
    const { onChange, tabType } = this.props;
    if (tabType === 'Starting Materials') {
      respectiveSamples.push(...starting_materials);
    } else if (tabType === 'Reactants') {
      respectiveSamples.push(...reactants);
    } else {
      respectiveSamples.push(...products);
    }

    const tabs = respectiveSamples.map((sample) => {
      return (
        <Tab
          key={sample.id}
          eventKey={sample.id}
          title={this.title(sample)}
        >
          <SampleTlcControl
            sample={sample}
            onChange={onChange}
          />
        </Tab>
      );
    });

    return (
      <Tabs
        id="TlcTabs"
        style={{ marginTop: '2px' }}
      >
        {tabs}
      </Tabs>
    );
  }

  render() {
    return (
      <div>
        {this.allReactionMaterials()}
      </div>
    );
  }
}

ReactionTlcDetails.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onChange: PropTypes.func.isRequired,
  tabType: PropTypes.string.isRequired
};

