import React from "react";

const ColumnSelect = ({ column, columnList, onChange }) => {
  let value = false;
  if (column) {
    value = columnList.reduce((agg, cur, idx) => {
      if (cur.value.tableIndex == column.tableIndex &&
          cur.value.columnIndex == column.columnIndex) {
        return idx;
      } else {
        return agg;
      }
    }, value);
  }

  const handleChange = (event) => {
    const index = event.target.value
    if (index) {
      onChange(columnList[index].value);
    } else {
      onChange(false);
    }
  };

  return (
    <select className="form-control form-control-sm" value={value} onChange={handleChange}>
      <option value={null}>-----------</option>
      {
        columnList.map((item, index) => {
          return <option value={index} key={index}>{item.label}</option>
        })
      }
    </select>
  );
};

export default ColumnSelect;
