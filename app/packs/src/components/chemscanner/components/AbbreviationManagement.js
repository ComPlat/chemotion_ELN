import React from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

import {
  ControlLabel, Button, Radio,
  Form, FormGroup, FormControl,
} from 'react-bootstrap';

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
      abbColumnDefs, superatomColumnDefs, abbreviations,
      superatoms, newAbb, changeTypeCreate
    } = this.props;

    const newText = newAbb ? 'Abbreviation' : 'Superatom';

    return (
      <div style={{ marginTop: '20px' }}>
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
          <div className="ag-theme-balham ag-grid-abbreviation">
            <AgGridReact
              pagination
              paginationAutoPageSize
              floatingFilter
              columnDefs={abbColumnDefs}
              rowData={abbreviations}
              onGridReady={this.onAbbGridReady}
            />
          </div>
          <div className="ag-theme-balham ag-grid-superatom">
            <AgGridReact
              pagination
              paginationAutoPageSize
              floatingFilter
              columnDefs={superatomColumnDefs}
              rowData={superatoms}
              onGridReady={this.onSuperatomGridReady}
            />
          </div>
        </div>
      </div>
    );
  }
}

AbbreviationManagement.propTypes = {
  abbColumnDefs: PropTypes.arrayOf(PropTypes.object).isRequired,
  superatomColumnDefs: PropTypes.arrayOf(PropTypes.object).isRequired,
  abbreviations: PropTypes.arrayOf(PropTypes.object).isRequired,
  superatoms: PropTypes.arrayOf(PropTypes.object).isRequired,
  onGridReady: PropTypes.func.isRequired,
  newAbb: PropTypes.bool.isRequired,
  changeTypeCreate: PropTypes.func.isRequired,
  createAbbreviation: PropTypes.func.isRequired,
}
