import React, { useState, useContext } from 'react';
import { Button, ButtonToolbar, Form, FormControl, Radio, Grid, Row, Col, Panel, Alert } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import StructureEditor from 'src/models/StructureEditor';
import FormData from 'src/components/searchModal/FormData';
import SearchResult from './SearchResult';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const KetcherRailsform = ({ molfile, handleCancel, currentState, isPublic }) => {
  const editor = new StructureEditor({ ...FormData.forms[1], id: 'ketcher' });

  const defaultValues = [{
    elementType: 'all',
    queryMolfile: null,
    searchType: 'sub',
    tanimotoThreshold: 0.7 
  }];
  const [changedValues, setChangedValues] = useState(defaultValues);
  const [searchSvg, setSearchSvg] = useState();
  const searchResultsStore = useContext(StoreContext).searchResults;
 
  const handleSearchTypeChange = (e) => {
    changedValues[0]['searchType'] = e.target.value;
    setChangedValues((a) => [...a]);
  }

  const handleTanimotoChange = (e) => {
    const val = e.target && e.target.value;
    if (!isNaN(val - val)) {
      changedValues[0]['tanimotoThreshold'] = e.target.value;
      setChangedValues((a) => [...a]);
    }
  }

  const handleSave = () => {
    const structure = editor.structureDef;
    const { molfile, info } = structure;
    structure.fetchSVG().then((svg) => {
      // const svg_file = svg.replace(/viewBox="([^"]+)"/, 'viewBox="0,0,300,128"').replace(/height="([^"]+)"/, 'height="128"').replace(/width="([^"]+)"/, 'width="300"');
      // setSearchSvg(<img src={ `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` } style={{width: '300px'}} />);
      handleStructureEditorSave(molfile);
    });
  }

  const handleStructureEditorSave = (molfile) => {
    if (molfile) {
      changedValues[0]['queryMolfile'] = molfile;
      setChangedValues((a) => [...a]);
    }
    //// Check if blank molfile
    const molfileLines = molfile.match(/[^\r\n]+/g);
    //// If the first character ~ num of atoms is 0, we will not search
    if (molfileLines[1].trim()[0] != 0) {
      searchResultsStore.showSearchResults();
      searchResultsStore.changeErrorMessage("");
      structureSearch(molfile);
    } else {
      searchResultsStore.changeErrorMessage("Please fill out all needed fields");
    }
  }

  const structureSearch = (molfile) => {
    const uiState = currentState;
    const { currentCollection } = uiState;
    const collectionId = currentCollection ? currentCollection.id : null;
    const isSync = currentCollection ? currentCollection.is_sync_to_me : false;
    const isPublic = isPublic;
    let tanimoto = changedValues[0].tanimotoThreshold;
    if (tanimoto <= 0 || tanimoto > 1) { tanimoto = 0.3; }

    const selection = {
      elementType: changedValues[0].elementType,
      molfile,
      search_type: changedValues[0].searchType,
      tanimoto_threshold: tanimoto,
      page_size: uiState.number_of_results,
      search_by_method: 'structure',
      structure_search: true
    };
    searchResultsStore.loadSearchResults({
      selection, collectionId, isSync, isPublic
    });
  }

  const showErrorMessage = () => {
    if (searchResultsStore.error_message) {
      return <Alert bsStyle="danger">{searchResultsStore.error_message}</Alert>;
    }
  }

  const SearchValuesList = () => {
    if (searchResultsStore.searchResultVisible && searchSvg != '') {
      // <div>{searchSvg}</div>
      return (
        <>
          <div style={{ position: 'relative' }}>
            <h4>Your Search</h4>
            {
              <div>{changedValues[0]['queryMolfile']}</div>
            }
            {
              searchResultsStore.searchResultsCount > 0 ? null : (
                <div className="search-spinner"><i className="fa fa-spinner fa-pulse fa-4x fa-fw" /></div>
              )
            }
          </div>
        </>
      );
    } else {
      return (null);
    }
  }

  const searchResults = () => {
    if (searchResultsStore.searchResultsCount > 0) {
      return <SearchResult handleCancel={handleCancel} currentState={currentState} />;
    } else {
      return null;
    }
  }

  const togglePanel = () => () => {
    if (searchResultsStore.searchResultsCount > 0) {
      searchResultsStore.toggleSearch();
      searchResultsStore.toggleSearchResults();
    }
  }

  let defaultClassName = 'collapsible-search-result';
  let invisibleClassName = searchResultsStore.search_result_panel_visible ? '' : ' inactive';
  let searchIcon = `fa fa-chevron-${searchResultsStore.search_icon} icon-right`;
  let resultIcon = `fa fa-chevron-${searchResultsStore.result_icon} icon-right`;

  return (
    <>
      <Panel
        id="collapsible-search"
        className={defaultClassName}
        onToggle={togglePanel()}
        expanded={searchResultsStore.searchVisible}
      >
        <Panel.Heading>
          <Panel.Title toggle>
            Search
            <i className={searchIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body>
            {showErrorMessage()}
            <iframe
              id="ketcher"
              src="/ketcher"
              title="Ketcher Rails"
              height="730px"
              width="100%"
              style={{border: 'none'}}
              //ref={(f) => { ifr = f; }}
            />
            <Grid style={{ margin: 0, paddingLeft: 0 }}>
              <Row style={{ marginTop: '20px' }}>
                <Col sm={4} md={3}>
                  <ButtonToolbar>
                    <Button bsStyle="warning" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button bsStyle="primary" onClick={handleSave} style={{ marginRight: '20px' }} >
                      Search
                    </Button>
                  </ButtonToolbar>
                </Col>
                <Col sm={6} md={4}>
                  <Form inline>
                    <Radio
                      //ref={(input) => { this.searchSimilarRadio = input; }}
                      value="similar"
                      checked={changedValues[0].searchType === 'similar'}
                      onChange={handleSearchTypeChange}
                    >
                      &nbsp; Similarity Search &nbsp;
                    </Radio>
                    &nbsp;&nbsp;
                    <FormControl
                      style={{ width: '40%' }}
                      type="text"
                      value={changedValues[0].tanimotoThreshold}
                      //ref={(input) => { this.searchTanimotoInput = input; }}
                      onChange={handleTanimotoChange}
                    />
                  </Form>
                </Col>
                <Col sm={4} md={2}>
                  <Radio
                    //ref={(input) => { searchSubstructureRadio = input; }}
                    value="sub"
                    checked={changedValues[0].searchType === 'sub'}
                    onChange={handleSearchTypeChange}
                  >
                    Substructure Search
                  </Radio>
                </Col>
              </Row>
            </Grid>
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
      <Panel
        id="collapsible-result"
        className={defaultClassName + invisibleClassName}
        onToggle={togglePanel()}
        expanded={searchResultsStore.searchResultVisible}
      >
        <Panel.Heading>
          <Panel.Title toggle>
            Result
            <i className={resultIcon} />
          </Panel.Title>
        </Panel.Heading>
        <Panel.Collapse>
          <Panel.Body style={{minHeight: '120px'}}>
            <SearchValuesList />
            {searchResults()}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    </>
  );
}

export default observer(KetcherRailsform);
