import React from 'react';

import TableColumn from 'src/apps/admin/converter/create/TableColumn';

const TableForm = (props) => {
  const {
    // eslint-disable-next-line react/prop-types
    table, columnList, updateTable, addOperation, updateOperation, removeOperation
  } = props;

  return (
    <div>
      <div>
        <h4><i><u><b>Table Columns</b></u></i></h4>
      </div>

      <TableColumn
        table={table}
        label="Which column should be used as x-values?"
        columnKey="xColumn"
        operationsKey="xOperations"
        columnList={columnList}
        updateTable={updateTable}
        addOperation={addOperation}
        updateOperation={updateOperation}
        removeOperation={removeOperation}
      />
      <TableColumn
        table={table}
        label="Which column should be used as y-values?"
        columnKey="yColumn"
        operationsKey="yOperations"
        columnList={columnList}
        updateTable={updateTable}
        addOperation={addOperation}
        updateOperation={updateOperation}
        removeOperation={removeOperation}
      />

      <small className="text-muted">The data you pick will determine which table columns are going to converted.</small>
    </div>
  );
};

export default TableForm;
