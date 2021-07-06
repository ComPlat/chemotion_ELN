import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

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

    const data = [
      { segment: 'Oil refining', factor: '< 0.1' },
      { segment: 'Bulk chemicals', factor: '< 1 - 5' },
      { segment: 'Fine chemicals', factor: '5 - 50' },
      { segment: 'Pharmaceuticals', factor: '25 - > 100' },
    ];

    const columnDefs = [
      {
        headerName: 'Industry Segment',
        field: 'segment',
      },
      {
        headerName: 'E factor (kg waste per kg product)',
        field: 'factor',
        width: 148,
      },
    ];

    const defaultColDef = {
      editable: false,
      width: 120,
    };

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
        <div className="metrics-refs">
          <div className="ag-theme-balham">
            <b>E factor: </b>
            <a href="https://doi.org/10.1039/C6GC02157C">The E Factor 25 Years on: The Rise of Green Chemistry and Sustainability. </a>
            <i>Sheldon, Roger A.  Green Chemistry 19, Nr. 1 (3. Januar 2017): 18–43.</i>
            <br />
            <br />
            <b>Atom economy (AE): </b>
            <a href="https://doi.org/10.1126/science.1962206">The Atom Economy -- a Search for Synthetic Efficiency. </a>
            <i>Trost, B. M. Science 254, Nr. 5037 (6. Dezember 1991): 1471–77.</i>
            <br />
            <br />
            <b style={{ color: 'rgba(0, 0, 0, 0.54)' }}>
              Atom economy has a value between 0 (bad) - 1 (very good)
            </b>
          </div>
          <div className="e-factor-refs ag-theme-balham">
            <AgGridReact
              enableColResize
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              headerHeight={68}
              rowData={data}
              domLayout="autoHeight"
            />
          </div>
        </div>
      </div>
    );
  }
}

GreenChemistry.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
};
