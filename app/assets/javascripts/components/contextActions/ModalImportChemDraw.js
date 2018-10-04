import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';

import ChemReadContainer from '../chemread/ChemReadContainer';
import ReactionsFetcher from '../fetchers/ReactionsFetcher';

import ElementActions from '../actions/ElementActions';

export default class ModalImportChemDraw extends React.Component {
  constructor(props) {
    super(props);

    this.onHide = this.onHide.bind(this);
    this.importAll = this.importAll.bind(this);
    this.importSelected = this.importSelected.bind(this);
    this.importReactions = this.importReactions.bind(this);
  }

  onHide() {
    this.props.onHide();
  }

  importAll() {
    const { files } = this.chemRead.state;

    let importList = [];
    files.forEach((f) => {
      importList = importList.concat(f.info.map(x => ({ desc: x.desc, smi: x.smi })));
    });
    this.importReactions(importList);
  }

  importSelected() {
    const { files, selected } = this.chemRead.state;

    const importList = [];
    selected.forEach((x) => {
      const fileIdx = files.findIndex(f => f.uid === x.uid);
      const tmp = files[fileIdx].info[x.smiIdx];
      importList.push({ desc: tmp.desc, smi: tmp.smi });
    });
    this.importReactions(importList);
  }

  importReactions(iList) {
    ElementActions.importReactionsFromChemRead(iList);
    this.onHide();
  }

  render() {
    return (
      <div style={{ height: '100%' }}>
        <div className="chemReadModal">
          <ChemReadContainer
            ref={(chemRead) => { this.chemRead = chemRead; }}
          />
        </div>
        <ButtonToolbar style={{ marginRight: '10px' }}>
          <Button bsStyle="primary" onClick={this.onHide}>Cancel</Button>
          <Button bsStyle="warning" onClick={this.importSelected} >
            Import Selected
          </Button>
          <Button bsStyle="warning" onClick={this.importAll} >
            Import All
          </Button>
        </ButtonToolbar>
      </div>
    );
  }
}

ModalImportChemDraw.propTypes = {
  onHide: PropTypes.func.isRequired,
};
