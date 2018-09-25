import React from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

import Reaction from '../models/Reaction';

function getWaste(samples) {
  return samples.filter(s => s.waste);
}

function getNonWaste(samples) {
  return samples.filter(s => s == null || !s.waste);
}

function sumReducer(acc, cur) {
  return acc + cur;
}

function floatFormatter(params) {
  const { value } = params;
  return value === '' ? value : value.toFixed(2);
}

export default class GreenMetrics extends React.Component {
  constructor() {
    super();

    this.onGridReady = this.onGridReady.bind(this);
    this.autoSizeAll = this.autoSizeAll.bind(this);
  }

  componentDidUpdate() {
    this.autoSizeAll();
  }

  onGridReady(params) {
    this.api = params.api;
  }

  autoSizeAll() {
    if (!this.api) return;
    setTimeout(() => {
      this.api.sizeColumnsToFit();
    }, 0);
  }

  render() {
    const { reaction } = this.props;
    const startsAmount = reaction.starting_materials
      .map(x => x.amount_g).reduce(sumReducer, 0);
    const selectedStartsAmount = getNonWaste(reaction.starting_materials)
      .map(x => x.amount_g).reduce(sumReducer, 0);

    const reactantsAmount = reaction.reactants
      .map(x => x.amount_g).reduce(sumReducer, 0);
    const selectedReactantsAmount = getNonWaste(reaction.reactants)
      .map(x => x.amount_g).reduce(sumReducer, 0);

    const solventsAmount = reaction.solvents
      .map(x => x.amount_g).reduce(sumReducer, 0);
    const selectedSolventsAmount = getNonWaste(reaction.solvents)
      .map(x => x.amount_g).reduce(sumReducer, 0);

    const pSolventsAmount = reaction.purification_solvents
          .map(x => x.amount_g).reduce(sumReducer, 0);
    const selectedPSolventsAmount = getNonWaste(reaction.purification_solvents)
          .map(x => x.amount_g).reduce(sumReducer, 0);

    const prodsAmount = reaction.products
      .map(x => x.amount_g).reduce(sumReducer, 0);
    const selectedProductsAmount = getNonWaste(reaction.products)
      .map(x => x.amount_g).reduce(sumReducer, 0);
    const wastedProductsAmount = getWaste(reaction.products)
          .map(x => x.amount_g).reduce(sumReducer, 0);

    const sef = (startsAmount + reactantsAmount + solventsAmount - prodsAmount) / prodsAmount;
    const cef = (
      startsAmount + reactantsAmount + solventsAmount +
      pSolventsAmount - prodsAmount
    ) / prodsAmount;
    const cuef = (
      selectedStartsAmount + selectedReactantsAmount + selectedSolventsAmount +
      selectedPSolventsAmount - selectedProductsAmount - wastedProductsAmount
    ) / selectedProductsAmount;

    const aesm = reaction.starting_materials
          .map(x => x.molecule_molecular_weight * x.coefficient)
          .reduce(sumReducer, 0);
    const aep = reaction.products
          .map(x => x.molecule_molecular_weight * x.coefficient)
          .reduce(sumReducer, 0);
    const caep = getNonWaste(reaction.products)
          .map(x => x.molecule_molecular_weight * x.coefficient)
          .reduce(sumReducer, 0);
    const aer = reaction.reactants
          .map(x => x.equivalent < 0.3 ? 0 : (x.molecule_molecular_weight * x.coefficient))
          .reduce(sumReducer, 0);
    const caer = getNonWaste(reaction.reactants)
          .map(x => x.equivalent < 0.3 ? 0 : (x.molecule_molecular_weight * x.coefficient))
          .reduce(sumReducer, 0);
    const ae = (aep / (aesm + aer));
    const cae = (caep / (aesm + caer));

    const data = [{
      sef: sef || '',
      cef: cef || '',
      cuef: cuef || '',
      ae: ae,
      cae: cae,
    }];

    const columnDefs = [
      {
        headerName: 'Simple E factor (sEF)',
        field: 'sef',
      },
      {
        headerName: 'Complete E factor (cEF)',
        field: 'cef',
      },
      {
        headerName: 'Custom E factor',
        field: 'cuef',
      },
      {
        headerName: 'Atom economy (AE)',
        field: 'ae',
      },
      {
        headerName: 'Custom Atom economy',
        field: 'cae',
      },
    ];

    const defaultColDef = {
      editable: false,
      valueFormatter: floatFormatter,
    };

    return (
      <div className="green-metrics ag-theme-balham">
        <AgGridReact
          enableColResize
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowData={data}
          onGridReady={this.onGridReady}
          headerHeight={68}
          domLayout="autoHeight"
        />
      </div>
    );
  }
}

GreenMetrics.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired
};
