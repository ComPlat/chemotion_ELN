import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

import Reaction from 'src/models/Reaction';
import GreenMaterialGroup from 'src/apps/mydb/elements/details/reactions/greenChemistryTab/GreenMaterialGroup';
import GreenMetrics from 'src/apps/mydb/elements/details/reactions/greenChemistryTab/GreenMetrics';


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
        headerName: 'Industry segment',
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
      resizable: true,
    };

    return (
      <div className="green-chemistry ag-theme-alpine d-flex flex-column gap-3">
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
          <p>
            <b>E factor: </b>
            <a href="https://doi.org/10.1039/C6GC02157C">The E Factor 25 Years on: The Rise of Green Chemistry and Sustainability. </a>
            <i>Sheldon, Roger A.  Green Chemistry 19, Nr. 1 (3. Januar 2017): 18–43.</i>
          </p>
          <p>
            <b>Atom economy (AE): </b>
            <a href="https://doi.org/10.1126/science.1962206">The Atom Economy -- a Search for Synthetic Efficiency. </a>
            <i>Trost, B. M. Science 254, Nr. 5037 (6. Dezember 1991): 1471–77.</i>
          </p>
          <p>
            <b className="text-muted">Atom economy has a value between 0 (bad) - 1 (very good)</b>
          </p>
          <div className="e-factor-refs">
            <AgGridReact
              columnDefs={columnDefs}
              autoSizeStrategy={{type: 'fitGridWidth'}}
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
