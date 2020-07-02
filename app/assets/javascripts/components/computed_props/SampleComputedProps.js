import React from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

function dateFormatter(params) {
  const dateTime = new Date(params.value);
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return dateTime.toLocaleDateString('en-GB', options);
}

export default class SampleComputedProps extends React.Component {
  constructor(props) {
    super(props);

    this.onGridReady = this.onGridReady.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (this.gridApi) this.gridApi.setRowData(nextProps.cprops);
  }

  onGridReady(params) {
    this.gridApi = params.api;
  }

  render() {
    const { cprops } = this.props;
    if (cprops.length === 0) {
      return (
        <span>No computed properties found. </span>
      );
    }

    const columnDefs = [
      {
        headerName: 'MaP',
        headerTooltip: 'Maximum Potential',
        field: 'max_potential',
        width: 67,
      },
      {
        headerName: 'MiP',
        headerTooltip: 'Minimum Potential',
        field: 'min_potential',
        width: 63,
      },
      {
        headerName: 'MeP',
        headerTooltip: 'Mean Potential',
        field: 'mean_potential',
        width: 66,
      },
      {
        headerName: 'MeAbsP',
        headerTooltip: 'Mean Absolute Potential',
        width: 88,
        field: 'mean_abs_potential',
      },
      {
        headerName: 'HOMO',
        field: 'homo',
        width: 80,
      },
      {
        headerName: 'LUMO',
        field: 'lumo',
        width: 77,
      },
      {
        headerName: 'IP',
        field: 'ip',
        width: 53,
      },
      {
        headerName: 'EA',
        field: 'ea',
        width: 55,
      },
      {
        headerName: 'Dipol',
        field: 'dipol_debye',
        width: 72,
      },
      {
        headerName: 'S1',
        valueGetter: params => params.data.tddft.s1_energy,
        width: 55,
      },
      {
        headerName: 'T1',
        valueGetter: params => params.data.tddft.t1_energy,
        width: 55,
      },
      {
        headerName: 'deltaEST',
        valueGetter: params => params.data.tddft.delta_est,
        width: 90,
      },
      {
        headerName: 'Singlet osc str.',
        valueGetter: params => params.data.tddft.s1_osc,
        width: 125,
      },
      {
        headerName: 'TADF rate',
        valueGetter: params => params.data.tddft.tadf_rate,
        width: 105,
      },
      {
        headerName: 'Date',
        headerTooltip: 'Request Date',
        field: 'created_at',
        width: 81,
        valueFormatter: dateFormatter,
      },
    ];

    return (
      <div className="ag-theme-balham">
        <AgGridReact
          onGridReady={this.onGridReady}
          enableColResize
          suppressCellSelection
          columnDefs={columnDefs}
          editable={false}
          rowData={cprops}
          domLayout="autoHeight"
        />
      </div>
    );
  }
}

SampleComputedProps.propTypes = {
  cprops: PropTypes.arrayOf(PropTypes.object).isRequired,
};
