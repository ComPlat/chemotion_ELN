import React from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

import {
  ControlLabel, Button, Radio,
  Form, FormGroup, FormControl,
} from 'react-bootstrap';

function ManagementTable({
  columnDefs, defaultColDef, data, style, onGridReady
}) {
  return (
    <div className="ag-theme-balham" style={style}>
      <AgGridReact
        floatingFilter
        enableColResize
        pagination
        suppressHorizontalScroll
        columnDefs={columnDefs}
        defaultColDef={defaultColDef || {}}
        rowData={data}
        onGridReady={onGridReady}
        domLayout="autoHeight"
      />
    </div>
  );
}

ManagementTable.propTypes = {
  columnDefs: PropTypes.arrayOf(PropTypes.object).isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  defaultColDef: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  style: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onGridReady: PropTypes.func.isRequired,
};

export default class AbbreviationManagement extends React.Component {
  constructor() {
    super();

    this.createAbbreviation = this.createAbbreviation.bind(this);
    this.onAbbGridReady = this.onAbbGridReady.bind(this);
    this.onSuperatomGridReady = this.onSuperatomGridReady.bind(this);
  }

  onAbbGridReady(e) {
    const { onGridReady } = this.props;
    onGridReady(e, true);
  }

  onSuperatomGridReady(e) {
    const { onGridReady } = this.props;
    onGridReady(e, false);
  }

  createAbbreviation() {
    const { createAbbreviation, newAbb } = this.props;
    const abb = this.abbRef.value;
    const smiles = this.smilesRef.value;

    createAbbreviation(abb, smiles, newAbb);
  }

  render() {
    const {
      abbColumnDefs, superatomColumnDefs, abbreviations, superatoms,
      defaultColDef, newAbb, changeTypeCreate
    } = this.props;
    const newText = newAbb ? 'Abbreviation' : 'Superatom';

    return (
      <div>
        <div className="chemscanner-abb-view-header">
          <Form inline style={{ marginRight: '20px' }}>
            <FormGroup controlId="formInlineName" style={{ marginRight: '20px' }}>
              <ControlLabel>{newText}</ControlLabel>
              <FormControl
                type="text"
                placeholder={newText}
                inputRef={(r) => { this.abbRef = r; }}
                style={{ marginLeft: '10px', marginRight: '10px' }}
              />
            </FormGroup>
            <FormGroup controlId="formInlineEmail">
              <ControlLabel>SMILES</ControlLabel>
              {' '}
              <FormControl
                type="text"
                placeholder="SMILES"
                inputRef={(r) => { this.smilesRef = r; }}
              />
            </FormGroup>
          </Form>
          <Form inline>
            <FormGroup>
              <Radio
                inline
                value="similar"
                checked={newAbb}
                onChange={changeTypeCreate}
              >
                Abbreviation
              </Radio>
              <Radio
                inline
                value="similar"
                checked={!newAbb}
                onChange={changeTypeCreate}
              >
                Superatom
              </Radio>
            </FormGroup>
            <Button
              bsSize="small"
              onClick={this.createAbbreviation}
              style={{ marginLeft: '20px' }}
            >
              Create
            </Button>
          </Form>
        </div>
        <br />
        <div className="abbreviation-management">
          <ManagementTable
            columnDefs={abbColumnDefs}
            defaultColDef={defaultColDef}
            data={abbreviations}
            style={{ width: '70%', marginRight: '5px' }}
            onGridReady={this.onAbbGridReady}
          />
          <ManagementTable
            columnDefs={superatomColumnDefs}
            defaultColDef={defaultColDef}
            data={superatoms}
            style={{ width: '30%', marginLeft: '5px' }}
            onGridReady={this.onSuperatomGridReady}
          />
        </div>
      </div>
    );
  }
}

AbbreviationManagement.propTypes = {
  abbColumnDefs: PropTypes.arrayOf(PropTypes.object).isRequired,
  superatomColumnDefs: PropTypes.arrayOf(PropTypes.object).isRequired,
  defaultColDef: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  abbreviations: PropTypes.arrayOf(PropTypes.object).isRequired,
  superatoms: PropTypes.arrayOf(PropTypes.object).isRequired,
  onGridReady: PropTypes.func.isRequired,
  newAbb: PropTypes.bool.isRequired,
  changeTypeCreate: PropTypes.func.isRequired,
  createAbbreviation: PropTypes.func.isRequired,
};
