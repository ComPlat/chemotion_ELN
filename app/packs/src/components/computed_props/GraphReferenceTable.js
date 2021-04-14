import React from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';

import { Button } from 'react-bootstrap';

function TableEditBtn({ dataLength, onEditBtnClick, node }) {
  const isAdd = node.rowIndex === dataLength;
  const btnIcon = isAdd ? 'fa-plus' : 'fa-minus';

  return (
    <Button
      active
      onClick={() => onEditBtnClick(node.rowIndex)}
      bsSize="xsmall"
    >
      <i className={`fa ${btnIcon}`} />
    </Button>
  );
}

TableEditBtn.propTypes = {
  dataLength: PropTypes.number.isRequired,
  onEditBtnClick: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
};

export default class GraphReferenceTable extends React.Component {
  constructor(props) {
    super(props);

    this.onRefsChanged = this.onRefsChanged.bind(this);
    this.onGridReady = this.onGridReady.bind(this);
    this.onEditBtnClick = this.onEditBtnClick.bind(this);
    this.autoSizeAll = this.autoSizeAll.bind(this);
  }

  componentDidUpdate() {
    if (this.gridColumnApi) this.autoSizeAll();
  }

  onGridReady(params) {
    this.gridColumnApi = params.columnApi;
  }

  onRefsChanged(params) {
    const { data, updateData } = this.props;
    const refs = [...data];
    refs[params.rowIndex] = params.data;

    updateData(refs);
  }

  onEditBtnClick(rIdx) {
    const { data, updateData } = this.props;
    const isAdd = rIdx === (data.length - 1);
    const refs = [...data];

    if (isAdd) {
      refs.push({ x: '', y: '', type: 'reference' });
    } else {
      refs.splice(rIdx, 1);
    }

    updateData(refs);
  }

  autoSizeAll() {
    if (!this.api) return;
    setTimeout(() => {
      const allColumnIds = [];
      this.gridColumnApi.getAllColumns().forEach((column) => {
        allColumnIds.push(column.colId);
      });

      this.gridColumnApi.autoSizeColumns(allColumnIds);
    }, 0);
  }

  render() {
    const { xLabel, yLabel, data } = this.props;
    const columnDefs = [
      {
        headerName: xLabel,
        field: 'x',
        editable: true,
        cellEditor: 'agTextCellEditor',
      },
      {
        headerName: yLabel,
        field: 'y',
        editable: true,
        cellEditor: 'agTextCellEditor',
      },
      {
        headerName: '',
        field: 'type',
        editable: false,
        cellRendererFramework: TableEditBtn,
        cellRendererParams: {
          dataLength: data.length - 1,
          onEditBtnClick: this.onEditBtnClick
        },
        headerComponentParams: { headerName: '' }
      },
    ];

    return (
      <div className="ag-theme-material">
        <AgGridReact
          columnDefs={columnDefs}
          rowData={data}
          domLayout="autoHeight"
          onGridReady={this.onGridReady}
          onCellValueChanged={this.onRefsChanged}
        />
      </div>
    );
  }
}

GraphReferenceTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  updateData: PropTypes.func.isRequired,
  xLabel: PropTypes.string.isRequired,
  yLabel: PropTypes.string.isRequired,
};
