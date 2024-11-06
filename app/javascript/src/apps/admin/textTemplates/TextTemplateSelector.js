import React, { Component } from 'react'
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';

function RemoveRowBtn({ removeRow, node }) {
  const { data } = node;

  const btnClick = () => {
    removeRow(data.name);
  };

  return (
    <Button
      active
      onClick={btnClick}
      size='xxsm'
      variant="danger"
      className='mt-1'
    >
      <i className="fa fa-trash" />
    </Button>
  );
}

RemoveRowBtn.propTypes = {
  removeRow: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  node: PropTypes.object.isRequired,
};

function AddRowBtn({ addRow }) {
  return (
    <Button
      active
      onClick={() => addRow()}
      size="xxsm"
      variant="primary"
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

AddRowBtn.propTypes = {
  addRow: PropTypes.func.isRequired,
};

class TextTemplateSelector extends Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.gridApi?.sizeColumnsToFit()
  }

  componentDidUpdate() {
    this.gridApi?.sizeColumnsToFit()
  }

  onSelectionChanged = ({api}) => {
    const selectedRows = api.getSelectedRows();
    if (selectedRows.length === 0) return;

    const { selectTemplate } = this.props;
    selectTemplate(selectedRows[0].name);
  }

  onGridReady = ({api}) => {
    this.gridApi = api;
  }

  render() {
    const {
      templateNames,
      addTemplate,
      renameTemplate,
      removeTemplate
    } = this.props;

    const columnDefs = [
      {
        field: 'name',
        editable: true,
        minWidth: 150,
        onCellValueChanged: ({ oldValue, newValue }) => {
          renameTemplate(oldValue, newValue);
        }
      },
      {
        headerName: '',
        colId: 'actions',
        headerComponent: AddRowBtn,
        headerComponentParams: {
          addRow: addTemplate,
        },
        cellRenderer: RemoveRowBtn,
        cellRendererParams: {
          removeRow: removeTemplate,
        },
        editable: false,
        filter: false,
        width: 35,
      },
    ];

    return (
      <div className="h-100 d-flex flex-column">
        <div className="ag-theme-balham flex-grow-1">
          <AgGridReact
            suppressHorizontalScroll
            columnDefs={columnDefs}
            defaultColDef
            rowSelection="single"
            onGridReady={this.onGridReady}
            onSelectionChanged={this.onSelectionChanged}
            rowData={templateNames.map((n) => ({ name: n }))}
            className='fs-6'
            rowHeight={35}
          />
        </div>
      </div>
    );
  }
};

export default TextTemplateSelector;
