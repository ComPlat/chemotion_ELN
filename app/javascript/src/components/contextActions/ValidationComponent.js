import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Button, Alert } from 'react-bootstrap';

// Create a separate component for the delete button cell renderer
function DeleteButtonCellRenderer(props) {
  const onClick = () => {
    if (props.onDelete) {
      props.onDelete(props.data.id);
    }
  };

  return (
    <button 
      type="button"
      className="btn btn-sm btn-outline-danger"
      onClick={onClick}
    >
      <i className="fa fa-trash"></i>
    </button>
  );
}

DeleteButtonCellRenderer.propTypes = {
  data: PropTypes.object,
  onDelete: PropTypes.func
};

function ValidationComponent({ rowData: initialRowData, columnDefs, onValidate, onCancel }) {
  const [gridApi, setGridApi] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [gridColumnDefs, setGridColumnDefs] = useState([]);
  const [currentRowData, setCurrentRowData] = useState(initialRowData);
  const gridRef = useRef(null);

  // Initialize current row data from props
  useEffect(() => {
    setCurrentRowData(initialRowData);
  }, [initialRowData]);

  // Handler for the delete button click
  const handleDeleteRow = useCallback((rowId) => {
    if (rowId) {
      const rowIndex = currentRowData.findIndex(row => row.id === rowId);
      if (rowIndex !== -1) {
        deleteRow(rowIndex);
      }
    }
  }, [currentRowData]);

  // Add row number and action columns to the column definitions
  useEffect(() => {
    const rowNumberColumn = {
      headerName: '#',
      valueGetter: 'node.rowIndex + 1',
      width: 70,
      editable: false,
      sortable: false,
      filter: false,
      pinned: 'left',
      suppressMenu: true,
      suppressSizeToFit: true
    };

    const deleteButtonColumn = {
      headerName: '',
      field: 'delete',
      width: 70,
      editable: false,
      sortable: false,
      filter: false,
      suppressMenu: true,
      cellRenderer: 'deleteButtonCellRenderer',
      cellRendererParams: {
        onDelete: handleDeleteRow
      }
    };

    // Add the row number and delete columns to the column definitions
    setGridColumnDefs([rowNumberColumn, ...columnDefs, deleteButtonColumn]);
  }, [columnDefs, handleDeleteRow]);

  // Add custom style for invalid rows
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .invalid-row {
        background-color: rgba(255, 0, 0, 0.2) !important;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
  }, []);

  const getRowClass = (params) => (
    params.data && !params.data.valid ? 'invalid-row' : ''
  );

  const validateData = () => {
    if (!gridApi) return;

    const allRows = [];
    gridApi.forEachNode((node) => allRows.push(node.data));

    const invalid = allRows.filter((row) => {
      const errors = [];

      Object.keys(row).forEach((key) => {
        if (key === 'valid' || key === 'id' || key === 'errors' || key === 'delete') return;

        if (row[key] === '' || row[key] === null || row[key] === undefined) {
          errors.push(`Field "${key}" cannot be empty`);
        }
      });

      if (errors.length > 0) {
        const updatedRow = { ...row, valid: false, errors };
        Object.assign(row, updatedRow);
        return true;
      }

      Object.assign(row, { ...row, valid: true });
      return false;
    });

    const allErrors = invalid.flatMap((row) => (
      (row.errors || []).map((error) => `Row ${row.id || 'unknown'}: ${error}`)
    ));

    setValidationErrors(allErrors);
    gridApi.refreshCells();
    onValidate(invalid);
  };

  const addNewRow = () => {
    if (!currentRowData.length) return;

    // Create a new empty row with the same structure as existing rows
    const newRow = { id: `new-${Date.now()}`, valid: true };
    
    // Add empty values for all columns
    columnDefs.forEach((colDef) => {
      if (colDef.field && colDef.field !== 'id' && colDef.field !== 'valid' && colDef.field !== 'delete') {
        newRow[colDef.field] = '';
      }
    });

    // Add the new row and update state
    const newData = [...currentRowData, newRow];
    setCurrentRowData(newData);
    
    // Scroll to the new row
    setTimeout(() => {
      if (gridApi) {
        gridApi.paginationGoToPage(gridApi.paginationGetTotalPages() - 1);
        gridApi.ensureIndexVisible(newData.length - 1, 'bottom');
      }
    }, 100);
  };

  const deleteRow = (rowIndex) => {
    if (rowIndex === undefined || rowIndex < 0 || rowIndex >= currentRowData.length) {
      return;
    }

    // Get the data from the row before deleting
    const rowToDelete = currentRowData[rowIndex];
    console.log(`Deleting row: ${rowIndex}`, rowToDelete);
    
    // Create a copy of the current data
    const newData = currentRowData.filter((_, index) => index !== rowIndex);
    console.log(`Remaining rows: ${newData.length}`);
    
    // Update state
    setCurrentRowData(newData);
    
    // Request a grid refresh after state update
    setTimeout(() => {
      if (gridApi) {
        gridApi.refreshCells({ force: true });
      }
    }, 0);
  };

  // Handle cell value changes
  const onCellValueChanged = (params) => {
    // Update the current row data when a cell changes
    const updatedData = [...currentRowData];
    const rowIndex = params.rowIndex;
    
    if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < updatedData.length) {
      updatedData[rowIndex] = params.data;
      setCurrentRowData(updatedData);
    }
  };

  return (
    <Modal show size="xl" backdrop="static">
      <Modal.Header>
        <Modal.Title>Validate Import Data</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <p>Review and edit your data before importing. You can modify cell values directly, add new rows, or delete existing ones.</p>
          <p>Invalid rows will be highlighted in red after validation.</p>
        </div>

        {validationErrors.length > 0 && (
          <Alert variant="danger">
            <Alert.Heading>Validation Errors</Alert.Heading>
            <ul>
              {validationErrors
                .slice(0, showMore ? validationErrors.length : 5)
                .map((error, idx) => (
                  <li key={`validation-error-${idx}`}>{error}</li>
                ))}
            </ul>
            {validationErrors.length > 5 && !showMore && (
              <Button
                variant="link"
                onClick={() => setShowMore(true)}
                className="p-0"
              >
                Show all {validationErrors.length} errors...
              </Button>
            )}
          </Alert>
        )}

        <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={currentRowData}
            columnDefs={gridColumnDefs}
            pagination
            paginationPageSize={20}
            onGridReady={onGridReady}
            getRowClass={getRowClass}
            onCellValueChanged={onCellValueChanged}
            rowClassRules={{
              'invalid-row': (params) => params.data && !params.data.valid
            }}
            defaultColDef={{
              editable: true,
              resizable: true,
              sortable: true,
              filter: true
            }}
            components={{
              deleteButtonCellRenderer: DeleteButtonCellRenderer
            }}
          />
        </div>

        <div className="d-flex justify-content-between mt-3">
          <div>
            <Button
              variant="success"
              onClick={addNewRow}
              className="me-2"
            >
              <i className="fa fa-plus me-1"></i> Add Row
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (gridApi) {
                  gridApi.paginationGoToPage(gridApi.paginationGetTotalPages() - 1);
                }
              }}
            >
              Show More Rows
            </Button>
          </div>
          <div>
            <Button
              variant="outline-secondary"
              onClick={() => onCancel(currentRowData)}
              className="me-2"
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={validateData}>
              Validate Data
            </Button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}

ValidationComponent.propTypes = {
  rowData: PropTypes.arrayOf(
    PropTypes.shape({
      valid: PropTypes.bool
    })
  ).isRequired,
  columnDefs: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      headerName: PropTypes.string
    })
  ).isRequired,
  onValidate: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ValidationComponent;