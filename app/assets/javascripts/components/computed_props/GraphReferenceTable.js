import React from 'react';
import ReactTable from 'react-table';

export default class GraphReferenceTable extends React.Component {
  constructor(props) {
    super(props);

    this.renderEditable = this.renderEditable.bind(this);
    this.renderButton = this.renderButton.bind(this);
  }

  renderEditable(cellInfo) {
    const { data, updateData } = this.props;
    const cellValue = data[cellInfo.index][cellInfo.column.id];

    return (
      <div
        style={{ backgroundColor: '#fafafa', textAlign: 'center' }}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.target.innerHTML;
          const refs = [...data];
          refs[cellInfo.index][cellInfo.column.id] = value;

          updateData(refs);
        }}
      >
        {cellValue}
      </div>
    );
  }

  renderButton(cellInfo) {
    const { data, updateData } = this.props;
    const isAdd = cellInfo.index === (data.length - 1);
    const btnIcon = isAdd ? 'fa-plus' : 'fa-minus';

    return (
      <i
        className={`fa ${btnIcon} clickable-icon`}
        aria-hidden="true"
        onClick={() => {
          const refs = [...data];
          if (isAdd) {
            refs.push({ x: '', y: '', type: 'reference' });
          } else {
            refs.splice(cellInfo.index, 1);
          }

          updateData(refs);
        }}
      />
    );
  }

  render() {
    const { xLabel, yLabel, data } = this.props;

    const columns = [
      {
        Header: xLabel,
        accessor: 'x',
        Cell: this.renderEditable
      },
      {
        Header: yLabel,
        accessor: 'y',
        Cell: this.renderEditable
      },
      {
        Header: '',
        accessor: 'type',
        maxWidth: 30,
        Cell: this.renderButton
      },
    ];

    return (
      <ReactTable
        data={data}
        columns={columns}
        defaultPageSize={10}
        className="-striped -highlight"
      />
    );
  }
}

GraphReferenceTable.propTypes = {
  data: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
  updateData: React.PropTypes.func.isRequired,
  xLabel: React.PropTypes.string.isRequired,
  yLabel: React.PropTypes.string.isRequired,
};
