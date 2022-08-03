import React, { useState, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';

const iconFormat = params => <i className={params.value} aria-hidden="true" />;

const data = [
  // {
  //     "label": "Sample",
  //     "desc": "ELN Sample",
  //     "released_at": "2021-08-06T21:25:07.881Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "sample",
  //     "icon_name": "icon-sample",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Reaction",
  //     "desc": "ELN Reaction",
  //     "released_at": "2021-08-06T21:25:07.908Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "reaction",
  //     "icon_name": "icon-reaction",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Wellplate",
  //     "desc": "ELN Wellplate",
  //     "released_at": "2021-08-06T21:25:07.914Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "wellplate",
  //     "icon_name": "icon-wellplate",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Screen",
  //     "desc": "ELN Screen",
  //     "released_at": "2021-08-06T21:25:07.920Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "screen",
  //     "icon_name": "icon-screen",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  // },
  // {
  //     "label": "Research Plan",
  //     "desc": "ELN Research Plan",
  //     "released_at": "2021-08-06T21:25:07.926Z",
  //     "klass_object": "ElementKlass",
  //     "klass_name": "research_plan",
  //     "icon_name": "icon-research_plan",
  //     "klass_prefix": "",
  //     "element_klass": {},
  //     "identifier": ""
  //  },
  {
      "label": "SurMOF substrate",
      "desc": "SurMOF substrate",
      "released_at": "2022-07-13T21:40:40.927Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Sample",
          "desc": "ELN Sample",
          "released_at": "2021-08-06T21:25:07.881Z",
          "klass_object": "ElementKlass",
          "klass_name": "sample",
          "icon_name": "icon-sample",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "5370a5b9-926e-47ef-82f8-c7f1e3b5b166"
  },
  {
      "label": "MOF Segment",
      "desc": "MOF Segment",
      "released_at": "2022-07-13T21:45:07.363Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Sample",
          "desc": "ELN Sample",
          "released_at": "2021-08-06T21:25:07.881Z",
          "klass_object": "ElementKlass",
          "klass_name": "sample",
          "icon_name": "icon-sample",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "47e35bfb-f797-4e2c-88b8-46bb098c6ff4"
  },
  {
      "label": "SurMOF Reaction",
      "desc": "SurMOF reaction",
      "released_at": "2022-07-13T21:44:07.173Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Reaction",
          "desc": "ELN Reaction",
          "released_at": "2021-08-06T21:25:07.908Z",
          "klass_object": "ElementKlass",
          "klass_name": "reaction",
          "icon_name": "icon-reaction",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "58244213-b5aa-4b01-9b97-5a47149e57bf"
  },
  {
      "label": "MOF Reaction details",
      "desc": "MOF reaction details",
      "released_at": "2022-07-13T21:45:56.944Z",
      "klass_object": "SegmentKlass",
      "klass_name": "",
      "icon_name": "",
      "klass_prefix": "",
      "element_klass": {
          "label": "Reaction",
          "desc": "ELN Reaction",
          "released_at": "2021-08-06T21:25:07.908Z",
          "klass_object": "ElementKlass",
          "klass_name": "reaction",
          "icon_name": "icon-reaction",
          "klass_prefix": "",
          "element_klass": {},
          "identifier": ""
      },
      "identifier": "f5b72c9b-2e0c-4124-96b2-9114e37f1512"
  }
];

const RepoKlassList = (props) => {
  const gridRef = useRef();
  const [rowData] = useState(props.list);
  // const [rowData] = useState(data);
  const [columnDefs] = useState([
    { field: 'label', suppressSizeToFit: true },
    { field: 'desc' },
    { field: 'released_at', headerName: 'Release at' },
    // { field: 'name' },
    // { field: 'icon_name', headerName: 'Icon', cellRenderer: iconFormat },
    { field: 'identifier', headerName: 'Identifier', suppressSizeToFit: true },
    { field: 'icon_name', headerName: 'Click to import into ELN', suppressSizeToFit: true }
  ]);
  const defaultColDef = useMemo(() => {
    return {
      minWidth: 160,
      editable: true,
      resizable: true,
    };
  }, []);

  // const autoSizeAll = useCallback(() => {
  //   const allColumnIds = [];
  //   console.log(gridRef.current.columnApi);
  //   gridRef.current.columnApi.getColumns().forEach((column) => {
  //     allColumnIds.push(column.getId());
  //   });
  //   gridRef.current.columnApi.autoSizeColumns(allColumnIds, false);
  // }, []);

  // const autoSizeAll = useCallback((params) => {
  //   const allColumnIds = [];
  //   console.log(params.columnApi.getAllDisplayedColumns());
  //   params.columnApi.getAllDisplayedColumns().forEach((column) => {
  //     allColumnIds.push(column.getId());
  //   });
  //   params.columnApi.autoSizeColumns(allColumnIds, false);
  // }, []);

  const autoSizeAll = useCallback(() => {
    gridRef.current.columnApi.autoSizeAllColumns(true);
  }, []);


  return (
    <div className="ag-theme-alpine" style={{ width: '100%' }}>
      {/* <AgGridReact rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" readOnlyEdit={true} onFirstDataRendered={autoSizeAll} /> */}
      <AgGridReact ref={gridRef} rowData={rowData} columnDefs={columnDefs} defaultColDef={defaultColDef} domLayout="autoHeight" readOnlyEdit onFirstDataRendered={autoSizeAll} />
    </div>
  );
};

export default RepoKlassList;