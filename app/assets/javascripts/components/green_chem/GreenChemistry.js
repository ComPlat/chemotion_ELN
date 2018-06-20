import React, { Component } from 'react';

import Reaction from '../models/Reaction';
import GreenMaterialGroup from './GreenMaterialGroup';
import { UrlSilentNavigation } from '../utils/ElementUtils';
import ElementActions from '../actions/ElementActions';

import GreenMetrics from './GreenMetrics';

export default class GreenChemistry extends Component {
  constructor() {
    super();

    this.updateGroupData = this.updateGroupData.bind(this);
  }

  updateGroupData() {
    const { reaction, onReactionChange } = this.props;
    onReactionChange(reaction, { schemaChanged: false });
  }

  render() {
    const { reaction, onReactionChange } = this.props;

    return (
      <div className="green-chemistry">
        <GreenMetrics reaction={reaction} />
        <GreenMaterialGroup
          group="starting_materials"
          materials={reaction.starting_materials}
          onChange={this.updateGroupData}
        />
        <GreenMaterialGroup
          group="reactants"
          materials={reaction.reactants}
          onChange={this.updateGroupData}
        />
        <GreenMaterialGroup
          group="products"
          materials={reaction.products}
          onChange={this.updateGroupData}
        />
        <GreenMaterialGroup
          group="solvents"
          materials={reaction.solvents}
          onChange={this.updateGroupData}
        />
        <GreenMaterialGroup
          group="purification_solvents"
          materials={reaction.purification_solvents}
          onChange={this.updateGroupData}
        />
        <div className="ag-theme-balham">
          <b>E factor: </b>
          <a href="https://doi.org/10.1039/C6GC02157C">The E Factor 25 Years on: The Rise of Green Chemistry and Sustainability. </a>
          <i>Sheldon, Roger A.  Green Chemistry 19, Nr. 1 (3. Januar 2017): 18–43.</i>
        </div>
        <div className="ag-theme-balham">
          <b>Atom economy (AE): </b>
          <a href="https://doi.org/10.1126/science.1962206">The Atom Economy--a Search for Synthetic Efficiency </a>
          <i>Trost, B. M. Science 254, Nr. 5037 (6. Dezember 1991): 1471–77.</i>
        </div>
      </div>
    );
  }
}

GreenChemistry.propTypes = {
  reaction: React.PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: React.PropTypes.func.isRequired,
};
