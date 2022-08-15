/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { GridView } from 'chem-generic-ui-viewer';

const RepoKlassList = (props) => {
  const [rowData] = useState(props.list);
  const [columnDefs] = useState(props.cols);

  return (
    <div className="ag-theme-alpine" style={{ width: '100%' }}>
      <GridView gridData={rowData} gridColumn={columnDefs} />
    </div>
  );
};

export default RepoKlassList;
