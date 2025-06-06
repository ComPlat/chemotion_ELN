import React, {
  useState,
  useCallback,
  useEffect,
  useRef
} from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Button, Alert } from 'react-bootstrap';
import {
  validateRowUnified
} from 'src/utilities/importDataValidations';
import TextAreaCellEditor from 'src/components/contextActions/TextAreaCellEditor';

// Create a separate component for the delete button cell renderer
function DeleteButtonCellRenderer(props) {
  const { onDelete, data } = props;
  const onClick = () => {
    if (onDelete) {
      onDelete(data?.id);
    }
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      onClick={onClick}
    >
      <i className="fa fa-trash" />
    </button>
  );
}

DeleteButtonCellRenderer.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.string
  }),
  onDelete: PropTypes.func
};

DeleteButtonCellRenderer.defaultProps = {
  data: null,
  onDelete: null
};

function ValidationComponent({
  rowData: initialRowData,
  columnDefs,
  onValidate,
  onCancel,
  onRowDataChange
}) {
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

  const deleteRow = (rowIndex) => {
    if (rowIndex === undefined || rowIndex < 0 || rowIndex >= currentRowData.length) {
      return;
    }

    // Create a copy of the current data
    const newData = currentRowData.filter((_, index) => index !== rowIndex);

    // Update state
    setCurrentRowData(newData);
    onRowDataChange(newData);

    // Request a grid refresh after state update
    setTimeout(() => {
      if (gridApi) {
        gridApi.refreshCells({ force: true });
      }
    }, 0);
  };

  // Handler for the delete button click
  const handleDeleteRow = useCallback((rowId) => {
    if (rowId) {
      const rowIndex = currentRowData.findIndex((row) => row.id === rowId);
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

    // Process column defs to add special handling for molfile columns
    const processedColumnDefs = columnDefs.map((colDef) => {
      // Check if this is a molfile column based on field name or header
      const isMolfileColumn = (colDef.headerName && colDef.headerName.toLowerCase().includes('molfile'));

      if (isMolfileColumn) {
        return {
          ...colDef,
          cellEditor: 'textAreaCellEditor',
          cellEditorPopup: true,
          stopEditingWhenCellsLoseFocus: false,
          singleClickEdit: false,
          editable: true,
          // Used by AG Grid for displaying values - we want raw values
          valueFormatter: (params) => params.value,
          valueSetter: (params) => {
            // Called when cell editing ends to save changes
            if (params.newValue !== undefined && params.newValue !== null) {
              // Must create a new reference to trigger proper refresh
              const rowData = { ...params.data };
              rowData[params.colDef.field] = params.newValue;

              // Set the updated data back to the row
              params.node.setData(rowData);

              // Update React state directly as well
              const { rowIndex } = params.node;
              if (rowIndex !== undefined) {
                const updatedRowData = [...currentRowData];
                updatedRowData[rowIndex] = rowData;
                setCurrentRowData(updatedRowData);
                onRowDataChange(updatedRowData);
              }

              // Force refresh this cell
              if (params.api) {
                params.api.refreshCells({
                  force: true,
                  rowNodes: [params.node],
                  columns: [params.colDef.field]
                });
              }
              return true;
            }
            return false;
          },
          cellRenderer: (params) => {
            if (!params.value) return '';
            // Show a preview of the molfile (first line only)
            const lines = params.value.split('\n');
            const firstLine = lines[0] || '';
            // Return only the text content, not wrapped in HTML
            return firstLine ? `${firstLine.trim()} (${lines.length} lines)` : '';
          }
        };
      }
      return colDef;
    });

    // Add the row number and delete columns to the column definitions
    setGridColumnDefs([rowNumberColumn, ...processedColumnDefs, deleteButtonColumn]);
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

  const validateData = async () => {
    if (!gridApi) return;

    const allRows = [];
    gridApi.forEachNode((node) => allRows.push(node.data));

    const invalid = [];

    // Log the field names across all rows to help debug
    const allFields = new Set();
    allRows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (key !== 'id' && key !== 'valid' && key !== 'errors') {
          allFields.add(key);
        }
      });
    });

    // Use Promise.all to run validations in parallel
    const validationPromises = allRows.map(async (row) => {
      // Apply field-by-field validation based on each field type
      const validation = await validateRowUnified(row);

      if (!validation.valid) {
        const updatedRow = { ...row, valid: false, errors: validation.errors };
        Object.assign(row, updatedRow);
        invalid.push(row);
        return false;
      }

      Object.assign(row, { ...row, valid: true });
      return true;
    });

    await Promise.all(validationPromises);

    const allErrors = invalid.flatMap((row) => (
      (row.errors || []).map((error) => `Row ${row.id || 'unknown'}: ${error}`)
    ));

    setValidationErrors(allErrors);
    gridApi.refreshCells();
    onValidate(invalid, currentRowData);
  };

  const addNewRow = () => {
    const newRow = { id: `new-${Date.now()}`, valid: true };

    // Add the new row and update state
    const newData = [...currentRowData, newRow];
    setCurrentRowData(newData);
    onRowDataChange(newData);

    // Scroll to the new row
    setTimeout(() => {
      if (gridApi) {
        gridApi.paginationGoToPage(gridApi.paginationGetTotalPages() - 1);
        gridApi.ensureIndexVisible(newData.length - 1, 'bottom');
      }
    }, 100);
  };

  // Handle cell value changes
  const onCellValueChanged = (params) => {
    // Update the current row data when a cell changes
    const updatedData = [...currentRowData];
    const {
      rowIndex,
      newValue,
      colDef,
      data,
      api,
      node
    } = params;

    if (rowIndex !== undefined && rowIndex >= 0 && rowIndex < updatedData.length) {
      // Preserve the original formatting of pasted content by using the raw value
      if (newValue !== undefined && colDef && colDef.field) {
        // Create a new object for this row to avoid reference issues
        const updatedRow = { ...data };
        // This preserves exact formatting of molfile data when pasted
        updatedRow[colDef.field] = newValue;

        // Update row data
        updatedData[rowIndex] = updatedRow;

        // Also update the grid's data model to ensure consistency
        if (node && api) {
          node.setData(updatedRow);
          // Force refresh this specific cell
          api.refreshCells({
            force: true,
            rowNodes: [node],
            columns: [colDef.field]
          });
        }
      } else {
        updatedData[rowIndex] = { ...data };
      }

      // Update React state
      setCurrentRowData(updatedData);

      // Notify parent component of the data change
      if (onRowDataChange) {
        onRowDataChange(updatedData);
      }
    }
  };

  return (
    <Modal show size="xl" backdrop="static">
      <Modal.Header>
        <Modal.Title>Validate Data to import</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <p>
            Review and edit your data before importing.
            You can modify cell values directly, add new rows, or delete existing ones.
          </p>
          <p>Invalid rows will be highlighted in red after validation.</p>
        </div>

        {validationErrors.length > 0 && (
          <Alert variant="danger">
            <Alert.Heading>Validation Errors</Alert.Heading>
            <ul>
              {validationErrors
                .slice(0, showMore ? validationErrors.length : 5)
                .map((error) => (
                  <li key={`validation-error-${error}`}>{error}</li>
                ))}
            </ul>
            {validationErrors.length > 5 && !showMore && (
              <Button
                variant="link"
                onClick={() => setShowMore(true)}
                className="p-0"
              >
                Show all
                {' '}
                {validationErrors.length}
                {' '}
                errors...
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
              deleteButtonCellRenderer: DeleteButtonCellRenderer,
              textAreaCellEditor: TextAreaCellEditor
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
              <i className="fa fa-plus me-1" />
              Add Row
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
              onClick={() => onCancel()}
              className="me-2 btn-light"
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
  onCancel: PropTypes.func.isRequired,
  onRowDataChange: PropTypes.func.isRequired,
};

export default ValidationComponent;
