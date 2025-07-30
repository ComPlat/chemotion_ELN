import Aviator from 'aviator';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import uniqueId from 'react-html-id';
import { AgGridReact } from 'ag-grid-react';
import { ContextMenu, ContextMenuTrigger } from 'react-contextmenu';
import {
  Button, Row, Col, Dropdown
} from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import CustomHeader from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/CustomHeader';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ResearchPlanDetailsFieldTableColumnNameModal
  from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableColumnNameModal';
import ResearchPlanDetailsFieldTableMeasurementExportModal
  from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableMeasurementExportModal';
import ResearchPlanDetailsFieldTableSchemasModal
  from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableSchemasModal';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import { COLUMN_ID_SHORT_LABEL_REACTION, COLUMN_ID_SHORT_LABEL_SAMPLE } from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ResearchPlanDetailsFieldTableUtils';

export default class ResearchPlanDetailsFieldTable extends Component {
  constructor(props) {
    super(props);
    const { field } = props;
    this.state = {
      currentlyCollapsedInEditMode: field?.value?.startCollapsed ?? false,
      currentlyCollapsedInViewMode: field?.value?.startCollapsed ?? false,
      columnNameModal: {
        show: false,
        colId: null
      },
      schemaModal: {
        show: false
      },
      measurementExportModal: {
        show: false
      },
      gridApi: {},
      columnClicked: null,
      rowClicked: null,
      isDisable: true,
    };

    uniqueId.enableUniqueIds(this);

    this.ref = React.createRef();
    this.renderShortLabel = this.renderShortLabel.bind(this);
  }

  handleColumnNameModalShow(action, colId) {
    this.setState({
      columnNameModal: {
        show: true,
        action,
        colId
      }
    });
  }

  handleColumnNameModalSubmit(columnName, displayName = null, linkType = null) {
    const { columnNameModal } = this.state;
    const { action, colId } = columnNameModal;

    if (action === 'insert') {
      this.handleColumnInsert(columnName, displayName, linkType);
    } else if (action === 'rename') {
      this.handleColumnRename(colId, columnName, displayName, linkType);
    }

    this.handleColumnNameModalHide();
  }

  handleColumnNameModalHide() {
    this.setState({
      columnNameModal: {
        show: false,
        action: null,
        idx: null
      }
    });
  }

  handleColumnInsert(columnId, displayName = null, linkType = null) {
    const { field, onChange } = this.props;
    const { gridApi } = this.state;

    if (!columnId || columnId.trim() === '') {
      console.warn('Cannot insert column with empty name');
      return;
    }

    if (!gridApi || !gridApi.getColumnDefs) {
      console.error('Grid API not available for column insert');
      return;
    }

    try {
      const columnDefs = gridApi.getColumnDefs();

      // Check if a column with this link type already exists
      if (linkType) {
        const existingLinkColumn = columnDefs.find((col) => col.linkType === linkType);
        if (existingLinkColumn) {
          console.warn(`Column with ${linkType} linking already exists`);
          return;
        }
      }

      const newColumn = this.buildColumnSimple(columnId, displayName, linkType);
      columnDefs.push(newColumn);

      gridApi.setGridOption('columnDefs', columnDefs);

      field.value.columns = gridApi.getColumnDefs();
      field.value.columnStates = gridApi.getColumnState();

      onChange(field.value, field.id);
    } catch (error) {
      console.error('Error inserting column:', error);
    }
  }

  handleSchemaModalShow = () => {
    ResearchPlansFetcher.fetchTableSchemas().then((json) => {
      this.setState({
        schemaModal: {
          show: true,
          schemas: json.table_schemas
        }
      });
    });
  };

  buildColumnSimple(columnId, displayName = null, linkType = null) {
    const headerName = displayName || columnId;
    const id = uuidv4(); // Generate UUID once for both colId and field

    const column = {
      cellEditor: 'agTextCellEditor',
      colId: id,
      editable: true,
      field: id,
      headerName,
      key: id,
      name: headerName,
      resizable: true,
      width: 200,
    };

    // Add linking functionality if specified
    if (linkType) {
      column.linkType = linkType; // 'sample' or 'reaction'
      column.cellRenderer = this.renderShortLabel;
    }

    return column;
  }

  handleColumnRename(colId, newColumnId, displayName = null, linkType = null) {
    const { field, onChange } = this.props;
    const { gridApi } = this.state;

    const columnDefs = gridApi.getColumnDefs();
    const columnToRename = columnDefs.find((col) => col.colId === colId);

    if (!columnToRename) {
      console.error('Column to rename not found:', colId);
      return;
    }

    // Check if a column with this link type already exists (excluding current column)
    if (linkType) {
      const existingLinkColumn = columnDefs.find((col) => col.linkType === linkType && col.colId !== colId);
      if (existingLinkColumn) {
        console.warn(`Column with ${linkType} linking already exists`);
        return;
      }
    }

    // Get current row data
    const rowData = [];
    gridApi.forEachNode((node) => rowData.push(node.data));

    // Update column definition
    const headerName = displayName || newColumnId;
    columnToRename.headerName = headerName;

    // Update link type and cell renderer
    if (linkType) {
      columnToRename.linkType = linkType;
      columnToRename.cellRenderer = this.renderShortLabel;
    } else {
      delete columnToRename.linkType;
      delete columnToRename.cellRenderer;
    }

    // Update grid
    gridApi.setGridOption('columnDefs', columnDefs);
    gridApi.refreshHeader();

    // Save state
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = gridApi.getColumnState();

    const finalRowData = [];
    gridApi.forEachNode((node) => finalRowData.push(node.data));
    field.value.rows = finalRowData;

    onChange(field.value, field.id);
  }



  handleSchemasModalSubmit(schemaName) {
    const { field } = this.props;
    ResearchPlansFetcher.createTableSchema(schemaName, field.value).then(() => {
      this.handleSchemaModalShow();
    });
  }

  handleSchemasModalHide() {
    this.setState({
      schemaModal: {
        show: false
      }
    });
  }



  _handleMeasurementExportModalHide = () => {
    this.setState({
      measurementExportModal: {
        show: false
      }
    });
  };

  handleSchemasModalUse(schema) {
    const { field, onChange } = this.props;

    onChange(schema.value, field.id);
    this.handleSchemasModalHide();
  }

  handleSchemasModalDelete(schema) {
    ResearchPlansFetcher.deleteTableSchema(schema.id).then(() => {
      this.handleSchemaModalShow();
    });
  }

  cellValueChanged = () => {
    const { field, onChange } = this.props;
    const { gridApi } = this.state;

    const rowData = [];
    gridApi.forEachNode((node) => rowData.push(node.data));
    field.value.rows = rowData;
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = gridApi.getColumnState();

    onChange(field.value, field.id);
  };

  onGridReady = (params) => {
    this.setState({
      gridApi: params.api,
    });

    const { field } = this.props;
    if (!field.value.columnStates) return;
    params.api.applyColumnState(field.value.columnStates);
  };

  onSaveGridColumnState(params) {
    const { field, onChange } = this.props;
    const { gridApi } = this.state;

    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = gridApi.getColumnState();

    const sortedRows = [];
    gridApi.forEachNodeAfterFilterAndSort((row) => sortedRows.push(row.data));
    field.value.rows = sortedRows;

    onChange(field.value, field.id);
  }

  onSaveGridRow() {
    const { field, onChange } = this.props;
    const { gridApi } = this.state;

    const rowData = [];
    gridApi.forEachNode((node) => rowData.push(node.data));
    field.value.rows = rowData;

    onChange(field.value, field.id);
  }

  addNewRow = () => {
    const { field, onChange } = this.props;
    const { gridApi } = this.state;

    gridApi.applyTransaction({
      add: [{}],
    });

    const rowData = [];
    gridApi.forEachNode((node) => rowData.push(node.data));
    field.value.columns = gridApi.getColumnDefs();
    field.value.rows = rowData;

    onChange(field.value, field.id);
  };

  removeThisRow = () => {
    const { field, onChange } = this.props;
    const { gridApi, rowClicked } = this.state;
    let rowData = [];
    gridApi.forEachNodeAfterFilterAndSort((node) => {
      rowData.push(node.data);
    });
    gridApi.applyTransaction({ remove: [rowData[rowClicked]] });

    rowData = rowData.filter((value, index, arr) => index !== rowClicked);
    field.value.rows = rowData;

    onChange(field.value, field.id);
  };

  removeThisColumn = () => {
    const { field, onChange } = this.props;
    const { gridApi, columnClicked } = this.state;
    if (columnClicked) {
      // Get row data before removing column to clean up orphaned data
      const rowData = [];
      gridApi.forEachNode((node) => rowData.push(node.data));

      // Remove the column data from all rows
      rowData.forEach((row) => {
        if (row[columnClicked] !== undefined) {
          delete row[columnClicked];
        }
      });

      // Remove column definition
      let columnDefs = gridApi.getColumnDefs();
      columnDefs = columnDefs.filter((value) => value.colId !== columnClicked);

      // Update grid with new column definitions and cleaned data
      gridApi.setGridOption('columnDefs', columnDefs);
      gridApi.applyTransaction({ update: rowData });

      field.value.columns = gridApi.getColumnDefs();
      field.value.columnStates = gridApi.getColumnState();
      field.value.rows = rowData;

      onChange(field.value, field.id);
    }
  };

  onCellContextMenu(params) {
    this.setState({ columnClicked: params.column.colId, rowClicked: params.rowIndex });
  }

  handleRenameClick = () => {
    const { columnClicked } = this.state;
    if (columnClicked) {
      this.handleColumnNameModalShow('rename', columnClicked);
    }
  };

  handlePaste = () => {
    const { field, onChange } = this.props;
    const { gridApi, columnClicked, rowClicked } = this.state;

    if (!navigator.clipboard) {
      console.warn('Clipboard API not available');
      return;
    }

    navigator.clipboard.readText()
      .then((data) => {
        const lines = data.split(/\n/);
        const cellData = [];
        lines.forEach((element) => {
          cellData.push(element.split('\t'));
        });

        const columns = gridApi.getAllGridColumns();
        const rowData = [];
        gridApi.forEachNodeAfterFilterAndSort((node) => {
          rowData.push(node.data);
        });

        let rowIndex = 0;
        for (let i = 0; i < rowData.length; i++) {
          let startUpdate = false;
          if (i >= rowClicked) {
            let columnIndex = 0;
            for (let j = 0; j < columns.length; j++) {
              const element = columns[j];
              if (startUpdate || element.colId === columnClicked) {
                startUpdate = true;
                rowData[i][element.colId] = cellData[rowIndex][columnIndex];
                columnIndex++;
              }
            }
            rowIndex++;
          }
        }

        gridApi.applyTransaction({
          update: rowData,
        });

        field.value.rows = rowData;
        onChange(field.value, field.id);
      })
      .catch((err) => {
        console.error('Failed to read clipboard contents: ', err);
      });
  };

  handleInsertColumnClick = () => {
    // For insert action, don't pass the clicked column ID
    this.handleColumnNameModalShow('insert', null);
  };

  onCellMouseOver() {
    this.setState({ isDisable: false });
  }

  onCellMouseOut() {
    this.setState({ isDisable: true });
  }

  _handleMeasurementExportModalShow = () => {
    this.setState({
      measurementExportModal: {
        show: true
      }
    });
  };

  toggleTemporaryCollapse() {
    const { edit } = this.props;
    const { currentlyCollapsedInEditMode, currentlyCollapsedInViewMode } = this.state;

    if (edit) {
      this.setState(
        { currentlyCollapsedInEditMode: !currentlyCollapsedInEditMode }
      );
    } else {
      this.setState(
        { currentlyCollapsedInViewMode: !currentlyCollapsedInViewMode }
      );
    }
  }

  temporaryCollapseToggleButton() {
    const { edit } = this.props;
    const { currentlyCollapsedInEditMode, currentlyCollapsedInViewMode } = this.state;

    const collapsed = edit
      ? currentlyCollapsedInEditMode
      : currentlyCollapsedInViewMode;
    const collapseToggleIconClass = collapsed ? 'fa-expand' : 'fa-compress';
    const collapseToggleTitle = collapsed ? 'expand table' : 'collapse table';
    return (
      <Button
        variant="info"
        size="xxsm"
        title={collapseToggleTitle}
        onClick={this.toggleTemporaryCollapse.bind(this)}
      >
        <i className={`fa ${collapseToggleIconClass}`} />
      </Button>
    );
  }

  permanentCollapseToggleButton() {
    const { field } = this.props;
    const collapsed = field?.value?.startCollapsed ?? false;
    const togglePermanentCollapse = () => {
      const { onChange } = this.props;
      field.value.startCollapsed = !collapsed;

      onChange(field.value, field.id);
      this.setState({ currentlyCollapsedInViewMode: !collapsed });
    };

    return (
      <Button
        variant="info"
        size="xxsm"
        onClick={togglePermanentCollapse.bind(this)}
      >
        Table is
        {' '}
        <strong>{collapsed ? 'collapsed' : 'expanded'}</strong>
        {' '}
        in view mode
      </Button>
    );
  }



  openSampleByShortLabel(shortLabel) {
    SamplesFetcher.findByShortLabel(shortLabel)
      .then((result) => {
        if (result.sample_id && result.collection_id) {
          Aviator.navigate(`/collection/${result.collection_id}/sample/${result.sample_id}`, { silent: true });
          ElementActions.fetchSampleById(result.sample_id);
        } else {
          console.debug('No valid data returned for short label', shortLabel, result);
        }
      })
      .catch((error) => {
        console.error('Error fetching sample by short label:', error);
      });
  }

  openReactionByShortLabel(shortLabel) {
    ReactionsFetcher.findByShortLabel(shortLabel)
      .then((result) => {
        if (result.reaction_id && result.collection_id) {
          Aviator.navigate(`/collection/${result.collection_id}/reaction/${result.reaction_id}`, { silent: true });
          ElementActions.fetchReactionById(result.reaction_id);
        } else {
          console.debug('No valid data returned for short label', shortLabel, result);
        }
      })
      .catch((error) => {
        console.error('Error fetching reaction by short label:', error);
      });
  }

  renderEdit() {
    const { field, onExport } = this.props;
    const { rows, columns } = field.value;
    const {
      columnNameModal, schemaModal, measurementExportModal, isDisable, currentlyCollapsedInEditMode
    } = this.state;
    const contextMenuId = this.nextUniqueId();
    const defaultColDef = {
      resizable: true,
      rowDrag: true,
      sortable: true,
      editable: true,
      cellClass: 'cell-figure',
      headerComponent: CustomHeader,
      headerComponentParams: {
        handleColumnNameModalShow: this.handleColumnNameModalShow.bind(this)
      }
    };

    const gridWrapperClassName = ['research-plan-table-grid'];
    if (currentlyCollapsedInEditMode) {
      gridWrapperClassName.push('grid-with-collapsed-rows');
    }

    return (
      <div>
        <div className="d-flex justify-content-between">
          {this.permanentCollapseToggleButton()}
          {this.temporaryCollapseToggleButton()}
        </div>
        <div className={gridWrapperClassName.join(' ')}>
          <div id="myGrid" className="ag-theme-alpine">
            <ContextMenuTrigger id={contextMenuId} disable={isDisable}>
              <AgGridReact
                animateRows
                columnDefs={columns}
                defaultColDef={defaultColDef}
                domLayout="autoHeight"
                rowDragMultiRow
                onCellContextMenu={this.onCellContextMenu.bind(this)}
                onCellEditingStopped={this.cellValueChanged}
                onCellMouseOut={this.onCellMouseOut.bind(this)}
                onCellMouseOver={this.onCellMouseOver.bind(this)}
                onColumnMoved={this.onSaveGridColumnState.bind(this)}
                onColumnResized={this.onSaveGridColumnState.bind(this)}
                onGridReady={this.onGridReady}
                onRowDragEnd={this.onSaveGridRow.bind(this)}
                onSortChanged={this.onSaveGridColumnState.bind(this)}
                rowData={rows}
                rowDragManaged
                rowHeight={37}
                rowSelection="multiple"
                singleClickEdit
                stopEditingWhenCellsLoseFocus
                suppressDragLeaveHidesColumns
              />
            </ContextMenuTrigger>
            <ContextMenu id={contextMenuId}>
              <Dropdown.Menu show>
                <Dropdown.Item onClick={this.handlePaste}>Paste</Dropdown.Item>
                <Dropdown.Item onClick={this.handleRenameClick}>Rename column</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={this.handleInsertColumnClick}>Add new column</Dropdown.Item>
                <Dropdown.Item onClick={this.addNewRow}>Add new row</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={this.removeThisColumn}>Remove this column</Dropdown.Item>
                <Dropdown.Item onClick={this.removeThisRow}>Remove this row</Dropdown.Item>
              </Dropdown.Menu>
            </ContextMenu>
          </div>
        </div>

        <div>
          <Row className="py-2">
            <Col xs={4}>
              <Button
                size="xsm"
                className="py-2 px-4 w-100"
                variant="light"
                onClick={this.handleSchemaModalShow}
              >
                Table schemas
              </Button>
            </Col>
            <Col xs={4}>
              <Button
                size="xsm"
                className="py-2 px-4 w-100"
                variant="light"
                onClick={this._handleMeasurementExportModalShow}
              >
                Export Measurements
              </Button>
            </Col>
            <Col xs={4}>
              <Button
                size="xsm"
                className="py-2 px-4 w-100"
                variant="light"
                onClick={() => onExport(field)}
              >
                Export as Excel
              </Button>
            </Col>
          </Row>
        </div>
        <ResearchPlanDetailsFieldTableColumnNameModal
          modal={columnNameModal}
          onSubmit={this.handleColumnNameModalSubmit.bind(this)}
          onHide={this.handleColumnNameModalHide.bind(this)}
          columns={columns}
          colId={columnNameModal.colId}
        />
        <ResearchPlanDetailsFieldTableSchemasModal
          modal={schemaModal}
          onSubmit={this.handleSchemasModalSubmit.bind(this)}
          onHide={this.handleSchemasModalHide.bind(this)}
          onUse={this.handleSchemasModalUse.bind(this)}
          onDelete={this.handleSchemasModalDelete.bind(this)}
        />
        <ResearchPlanDetailsFieldTableMeasurementExportModal
          show={measurementExportModal.show}
          onHide={this._handleMeasurementExportModalHide}
          rows={rows}
          columns={columns}
        />
      </div>
    );
  }

  renderShortLabel(params) {
    const { data, colDef } = params;
    if (!data) {
      return params.value || '';
    }

    const cellValue = data[colDef.colId];
    if (!cellValue || cellValue === '') {
      return params.value || '';
    }

    // Use the linkType property to determine what kind of link to render
    if (colDef.linkType === COLUMN_ID_SHORT_LABEL_SAMPLE) {
      return React.createElement('a', {
        className: 'link',
        onClick: (e) => {
          e.preventDefault();
          this.openSampleByShortLabel(cellValue);
        },
        style: { cursor: 'pointer' }
      }, cellValue);
    }

    if (colDef.linkType === COLUMN_ID_SHORT_LABEL_REACTION) {
      return React.createElement('a', {
        className: 'link',
        onClick: (e) => {
          e.preventDefault();
          this.openReactionByShortLabel(cellValue);
        },
        style: { cursor: 'pointer' }
      }, cellValue);
    }

    return params.value || '';
  }

  renderStatic() {
    const { field } = this.props;
    const { columns, rows } = field.value;
    const { currentlyCollapsedInViewMode } = this.state;
    const staticColumns = cloneDeep(columns);

    staticColumns.forEach((item) => {
      // If column has linkType, add cell renderer
      if (item.linkType) {
        item.cellRenderer = this.renderShortLabel;
      }
      item.editable = false;
      item.resizable = false;
      item.sortable = false;
      item.rowDrag = false;
      item.wrapText = true;
      item.cellClass = ['lh-base', 'py-2', 'border-end'];
      return item;
    });

    const defaultColDef = {
      flex: 1,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      autoHeight: true,
      suppressMovable: true,
      headerClass: ['border-end'],
      cellClass: ['border-end'],
    };

    const gridWrapperClassName = ['research-plan-table-grid'];
    if (currentlyCollapsedInViewMode) {
      gridWrapperClassName.push('grid-with-collapsed-rows');
    }

    return (
      <div className={gridWrapperClassName.join(' ')}>
        <div className="d-flex justify-content-end">
          {this.temporaryCollapseToggleButton()}
        </div>
        <div className="ag-theme-alpine">
          <AgGridReact
            columnDefs={staticColumns}
            defaultColDef={defaultColDef}
            domLayout="autoHeight"
            autoSizeStrategy={{ type: 'fitGridWidth' }}
            rowData={rows}
            rowHeight="auto"
          />
        </div>
      </div>
    );
  }

  render() {
    const { edit } = this.props;

    if (edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldTable.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
  onExport: PropTypes.func
};
