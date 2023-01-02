import React, { useState } from 'react';
import { Button, ButtonToolbar, Form, FormControl, Radio, Grid, Row, Col } from 'react-bootstrap';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import StructureEditor from 'src/models/StructureEditor';
import FormData from 'src/components/searchModal/FormData';

const KetcherRailsform = ({ molfile, handleCancel, currentState, isPublic }) => {
  const editor = new StructureEditor({ ...FormData.forms[1], id: 'ketcher' });

  const defaultValues = [{
    elementType: 'all',
    queryMolfile: null,
    searchType: 'sub',
    tanimotoThreshold: 0.7 
  }];
  const [changedValues, setChangedValues] = useState(defaultValues);
 
  const handleSearchTypeChange = (e) => {
    changedValues[0]['searchType'] = e.target.value;
    setChangedValues((a) => [...a]);
  }

  const handleTanimotoChange = (e) => {
    const val = e.target && e.target.value;
    console.log(val - val, e.target.value);
    if (!isNaN(val - val)) {
      changedValues[0]['tanimotoThreshold'] = e.target.value;
      setChangedValues((a) => [...a]);
    }
  }

  const handleSave = () => {
    const structure = editor.structureDef;
    const { molfile, info } = structure;
    structure.fetchSVG().then((svg) => {
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
    if (molfileLines[1].trim()[0] !== 0) {
      structureSearch(molfile);
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
    UIActions.setSearchSelection(selection);
    ElementActions.fetchBasedOnSearchSelectionAndCollection({
      selection, collectionId, isSync, isPublic
    });
  }

  return (
    <>
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
    </>
  );
}

export default KetcherRailsform;
