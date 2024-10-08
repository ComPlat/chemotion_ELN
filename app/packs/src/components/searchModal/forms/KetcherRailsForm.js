import React, { useEffect, useContext } from 'react';
import {
  Button, ButtonToolbar, Form, FormControl, Radio, Grid, Row, Col, Panel
} from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import StructureEditor from 'src/models/StructureEditor';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { togglePanel, showErrorMessage, panelVariables } from 'src/components/searchModal/forms/SearchModalFunctions';
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
  const { pgCartridge } = UIStore.getState();
  let iframe;

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
    <>
      <Panel
        id="collapsible-search"
        className={panelVars.defaultClassName}
        onToggle={togglePanel(searchStore)}
        expanded={searchStore.searchVisible}
      >
        <Panel.Heading className={panelVars.inactiveSearchClass}>
          <Panel.Title toggle>
            {panelVars.searchTitle}
            <i className={panelVars.searchIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            {showErrorMessage(searchStore)}
            <iframe
              id="ketcher"
              src="/ketcher"
              title="Ketcher Rails"
              width="100%"
              style={{ border: 'none', minHeight: '53.9vh' }}
            />
            <Grid style={{ margin: 0, paddingLeft: 0 }}>
              <Row style={{ marginTop: '20px' }}>
                <Col sm={4} md={3}>
                  <ButtonToolbar>
                    <Button bsStyle="warning" onClick={() => searchStore.handleCancel()}>
                      Cancel
                    </Button>
                    <Button bsStyle="primary" onClick={handleSearch} style={{ marginRight: '20px' }}>
                      Search
                    </Button>
                  </ButtonToolbar>
                </Col>
                <Col sm={6} md={4}>
                  <Form inline>
                    <Radio
                      value="similar"
                      checked={searchStore.ketcherRailsValues.searchType === 'similar'}
                      onChange={handleSearchTypeChange}
                    >
                      &nbsp; Similarity Search &nbsp;
                    </Radio>
                    &nbsp;&nbsp;
                    <FormControl
                      style={{ width: '40%' }}
                      type="text"
                      value={searchStore.ketcherRailsValues.tanimotoThreshold}
                      onChange={handleTanimotoChange}
                    />
                  </Form>
                </Col>
                <Col sm={4} md={2}>
                  <Radio
                    value="sub"
                    checked={searchStore.ketcherRailsValues.searchType === 'sub'}
                    onChange={handleSearchTypeChange}
                  >
                    {pgCartridge ? `Substructure Search with ${pgCartridge}` : 'Substructure Search'}
                  </Radio>
                </Col>
              </Row>
            </Grid>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel
        id="collapsible-result"
        className={panelVars.defaultClassName + panelVars.invisibleClassName}
        onToggle={togglePanel(searchStore)}
        expanded={searchStore.searchResultVisible}
      >
        <Panel.Heading className={panelVars.inactiveResultClass}>
          <Panel.Title toggle>
            {panelVars.resultTitle}
            <i className={panelVars.resultIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body style={{ minHeight: '120px' }}>
            <SearchResult
              handleClear={handleClear}
            />
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default observer(KetcherRailsform);
