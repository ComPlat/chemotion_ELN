import React, { useEffect, useContext } from 'react';
import {
  Button, ButtonToolbar, Form, Accordion
} from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import StructureEditor from 'src/models/StructureEditor';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import {
  togglePanel, showErrorMessage, AccordeonHeaderButtonForSearchForm, panelVariables
} from 'src/components/searchModal/forms/SearchModalFunctions';
import SearchResult from 'src/components/searchModal/forms/SearchResult';

function KetcherRailsform() {
  const ketcherStructure = {
    structure: {
      path: 'ketcher',
      setMolfileInFrame: false,
      setMfFuncName: 'setMolecule',
      getMfFuncName: 'getMolfile',
      getMfWithCallback: false,
      getSVGFuncName: 'getSVG',
      getSVGWithCallback: false
    }
  };
  const editor = new StructureEditor({ ...ketcherStructure, id: 'ketcher' });

  const searchStore = useContext(StoreContext).search;
  const panelVars = panelVariables(searchStore);
  const activeSearchAccordionClass = searchStore.search_accordion_active_key === 0 ? 'active' : '';
  const activeResultAccordionClass = searchStore.search_accordion_active_key === 1 ? ' active' : '';
  const { pgCartridge } = UIStore.getState();
  let iframe;
  const iframeHeight = panelVars.invisibleClassName ? '88.3vh' : '85vh';

  useEffect(() => {
    iframe = document.getElementById('ketcher');
    iframe.onload = () => {
      if (searchStore.ketcherRailsValues.queryMolfile && editor && searchStore.searchModalVisible) {
        editor.structureDef.molfile = searchStore.ketcherRailsValues.queryMolfile;
      }
    };
  }, [iframe]);

  const handleSearchTypeChange = (e) => {
    searchStore.changeKetcherRailsValue('searchType', e.target.value);
  };

  const searchValuesByMolfile = () => {
    searchStore.changeSearchValues([searchStore.ketcherRailsValues.queryMolfile]);
  };

  const structureSearch = (molfile) => {
    const uiState = UIStore.getState();
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    let tanimoto = searchStore.ketcherRailsValues.tanimotoThreshold;
    if (tanimoto <= 0 || tanimoto > 1) { tanimoto = 0.3; }

    const selection = {
      elementType: 'structure',
      molfile,
      search_type: searchStore.ketcherRailsValues.searchType,
      tanimoto_threshold: tanimoto,
      page_size: uiState.number_of_results,
      search_by_method: 'structure',
      structure_search: true
    };
    searchStore.loadSearchResults({
      selection, collectionId, isSync, moleculeSort: true
    });
    searchStore.clearSearchAndTabResults();
    searchValuesByMolfile();
  };

  const handleTanimotoChange = (e) => {
    const val = e.target && e.target.value;
    if (!Number.isNaN(val - val)) {
      searchStore.changeKetcherRailsValue('tanimotoThreshold', e.target.value);
    }
  };

  const handleStructureEditorSave = (molfile) => {
    if (molfile) {
      searchStore.changeKetcherRailsValue('queryMolfile', molfile);
    }
    const message = 'Please add a drawing. The drawing is empty';
    searchStore.addErrorMessage(message);

    /// / Check if blank molfile
    const molfileLines = molfile.match(/[^\r\n]+/g);
    /// / If the first character ~ num of atoms is 0, we will not search
    if (molfileLines[1].trim()[0] !== 0) {
      searchStore.showSearchResults();
      searchStore.removeErrorMessage(message);
      structureSearch(molfile);
    }
  };

  const handleSearch = () => {
    const structure = editor.structureDef;
    const { molfile } = structure;
    handleStructureEditorSave(molfile);
  };

  const handleClear = () => {
    searchStore.clearSearchResults();

    const iframe = document.querySelector('#ketcher').contentWindow;
    iframe.document.querySelector('#new').click();
  };

  return (
    <Accordion defaultActiveKey={0} activeKey={searchStore.search_accordion_active_key} className="search-modal" flush>
      <Accordion.Item eventKey={0} className={activeSearchAccordionClass}>
        <h2 className="accordion-header">
          <AccordeonHeaderButtonForSearchForm
            title={panelVars.searchTitle}
            eventKey={0}
            disabled={searchStore.search_accordion_toggle_disabled}
            callback={togglePanel(searchStore)}
          />
        </h2>
        <Accordion.Collapse eventKey={0}>
          <div className="accordion-body">
            {showErrorMessage(searchStore)}
            <iframe
              id="ketcher"
              src="/ketcher"
              title="Ketcher Rails"
              width="100%"
              style={{ border: 'none', minHeight: `calc(${iframeHeight} - 242px)` }}
            />
            <div className="ketcher-buttons">
              <ButtonToolbar className="gap-2">
                <Button variant="primary" onClick={() => searchStore.handleCancel()}>
                  Cancel
                </Button>
                <Button variant="warning" onClick={handleSearch}>
                  Search
                </Button>
              </ButtonToolbar>
              <Form className="d-inline-flex flex-nowrap align-items-center gap-5" inline>
                <Form.Check
                  type="radio"
                  value="similar"
                  label="Similarity Search"
                  checked={searchStore.ketcherRailsValues.searchType === 'similar'}
                  onChange={handleSearchTypeChange}
                />
                <Form.Control
                  style={{ width: '40%' }}
                  type="text"
                  value={searchStore.ketcherRailsValues.tanimotoThreshold}
                  onChange={handleTanimotoChange}
                />
              </Form>
              <Form inline>
                <Form.Check
                  type="radio"
                  value="sub"
                  label={pgCartridge !== 'none'
                    ? `Substructure Search with ${pgCartridge}` : 'Substructure Search'}
                  checked={searchStore.ketcherRailsValues.searchType === 'sub'}
                  onChange={handleSearchTypeChange}
                />
              </Form>
            </div>
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
      <Accordion.Item eventKey={1} className={`${panelVars.invisibleClassName}${activeResultAccordionClass}`}>
        <h2 className="accordion-header">
          <AccordeonHeaderButtonForSearchForm
            title={panelVars.resultTitle}
            eventKey={1}
            disabled={false}
            callback={togglePanel(searchStore)}
          />
        </h2>
        <Accordion.Collapse eventKey={1}>
          <div className="accordion-body">
            <SearchResult
              handleClear={() => handleClear(searchStore)}
            />
          </div>
        </Accordion.Collapse>
      </Accordion.Item>
    </Accordion>
  );
}

export default observer(KetcherRailsform);
