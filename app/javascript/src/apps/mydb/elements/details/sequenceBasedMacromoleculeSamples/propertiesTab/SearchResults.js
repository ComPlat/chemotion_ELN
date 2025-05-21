import React, { useContext, useState } from 'react';
import { Button, Modal, } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import Draggable from "react-draggable";

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SearchResults = () => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  let sbmmSample = sbmmStore.sequence_based_macromolecule_sample;

  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });

  const spinner = (
    <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
  );

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  }

  const searchByLabel = {
    accession: 'UniProt ID',
    protein_name: 'Name',
    ec: 'EC-Number',
  };

  const searchResult = sbmmStore.searchResult;

  const chooseUniprotEntry = (data) => {
    const identifier = data?.id ? data.id : data.primary_accession;
    sbmmStore.getSequenceBasedMacromoleculeByIdentifier(identifier, data.available_sources);
    sbmmStore.closeSearchResult();
    sbmmStore.removeSearchResult();
    sbmmStore.toggleSearchOptions(false);
  }

  const renderChooseLink = (node) => {
    return (
      <div className="d-flex align-items-center">
        {node.data.primary_accession}
        <Button
          variant="link"
          className="px-1 py-0"
          onClick={() => chooseUniprotEntry(node.data)}
        >
          Choose
        </Button>
      </div>
    );
  }

  const renderOrganismWithTaxonId = (node) => {
    return (
      <div>
        {node.data.organism} ({node.data.taxon_id})
      </div>
    );
  }

  const columnDefs = [
    {
      headerName: "UniProt number",
      field: 'primary_accession',
      cellRenderer: renderChooseLink,
      minWidth: 140,
      maxWidth: 140,
    },
    {
      headerName: "Source",
      field: "available_sources",
      minWidth: 80,
      maxWidth: 80,
    },
    {
      headerName: "Full name",
      field: 'full_name',
    },
    {
      headerName: "Short name",
      field: "short_name",
      minWidth: 100,
      maxWidth: 100,
    },
    {
      headerName: "Organism (Taxon id)",
      field: 'organism',
      cellRenderer: renderOrganismWithTaxonId,
    },
    {
      headerName: "EC-numbers",
      field: "ec_numbers",
      minWidth: 100,
      maxWidth: 100,
    },
  ];

  const defaultColDef = {
    editable: false,
    flex: 1,
    autoHeight: true,
    sortable: true,
    resizable: false,
    suppressMovable: true,
    cellClass: ["border-end", "p-2", "lh-sm"],
    wrapText: true,
    headerClass: ["border-end", "px-2"],
  };

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          show={true}
          onHide={() => sbmmStore.closeSearchResult()}
          backdrop={false}
          keyboard={false}
          className="draggable-modal-dialog-xxxl"
          size="xxxl"
          dialogClassName="draggable-modal"
          contentClassName="draggable-modal-content"
          style={{
            transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)`,
          }}
        >
          <Modal.Header className="ps-0 border-bottom border-gray-600 bg-gray-300" closeButton>
            <Modal.Title className="draggable-modal-stack-title">
              <i className="fa fa-arrows move" />
              Search Results
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="mb-4">
              <b>Your search for:</b>
              <br />
              {`${searchByLabel[sbmmSample.sequence_based_macromolecule?.search_field]}:
              ${sbmmSample.sequence_based_macromolecule?.search_term}`}
            </div>

            {searchResult.length < 1 && (<div>{spinner}</div>)}
            {searchResult.length >= 1 && searchResult[0].results && (<div><b>Your search has no results</b></div>)}
            {
              searchResult.length >= 1 && !searchResult[0].results && (
                <>
                  <div className="mb-4">
                    <b>{searchResult.length} {searchResult.length > 1 ? 'Results' : 'Result'}</b>
                  </div>

                  <div className="ag-theme-alpine w-100 mb-4">
                    <AgGridReact
                      columnDefs={columnDefs}
                      defaultColDef={defaultColDef}
                      rowData={searchResult || []}
                      rowHeight="auto"
                      domLayout="autoHeight"
                      autoSizeStrategy={{ type: 'fitGridWidth' }}
                    />
                  </div>
                </>
              )
            }
          </Modal.Body>
        </Modal>
      </div>
    </Draggable>
  );
}

export default observer(SearchResults);
