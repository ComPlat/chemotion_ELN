import React, { Component } from 'react';
import { Navbar, FormGroup, FormControl, Button } from 'react-bootstrap';

import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import LoadingModal from 'src/components/common/LoadingModal';
import MoleculeModeratorComponent from 'src/apps/moleculeModerator/MoleculeModeratorComponent';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import Notifications from 'src/components/Notifications';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

const pageNav = (
  <Navbar fixedTop>
    <Navbar.Header>
      <Navbar.Brand>
        <a href="/">Home</a>
      </Navbar.Brand>
      <Navbar.Toggle />
    </Navbar.Header>
    <Navbar.Collapse>
      <Navbar.Text>
        Molecule Moderator
      </Navbar.Text>
    </Navbar.Collapse>
  </Navbar>
);

const pageNotify = (title, level, message) => {
  const notification = {
    title,
    message,
    level,
    dismissible: 'button',
    autoDismiss: 5,
    position: 'tc',
    uid: 'moderator'
  };
  NotificationActions.add(notification);
};

class MoleculeModerator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchTerm: '',
      molecule: null,
      showStructureEditor: false,
      msg: {
        show: false,
        level: null,
        message: null
      },
    };

    this.handleEditor = this.handleEditor.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleEditorSave = this.handleEditorSave.bind(this);
    this.handleSearchTermChange = this.handleSearchTermChange.bind(this);
    this.onSave = this.onSave.bind(this);
  }

  onSave() {
    LoadingActions.start();
    let { molecule } = this.state;
    const { msg } = this.state;
    MoleculesFetcher.updateMolfileSVG(molecule).then((json) => {
      if (json.msg.level !== 'error') {
        ({ molecule } = json);
      }
      msg.show = true;
      msg.level = json.msg.level;
      msg.message = json.msg.message;
      this.setState({ molecule, msg, showStructureEditor: false });
      LoadingActions.stop();
      pageNotify('Save', msg.level, msg.message);
    });
  }

  handleEditor(show) {
    this.setState({ showStructureEditor: show });
  }

  handleSearch() {
    LoadingActions.start();
    const { msg, searchTerm } = this.state;
    MoleculesFetcher.getByInChiKey(searchTerm)
      .then((result) => {
        msg.show = true;
        msg.level = result ? 'info' : 'error';
        msg.message = result ? 'Record found!' : 'No record found!';
        this.setState({ msg, molecule: result.molecule, showStructureEditor: false });
        LoadingActions.stop();
        pageNotify('Search', msg.level, msg.message);
      }).catch((errorMessage) => {
        msg.show = true;
        msg.level = 'error';
        msg.message = errorMessage;
        this.setState({ msg });
        LoadingActions.stop();
        pageNotify('Search', msg.level, msg.message);
      });
  }

  handleEditorSave(molfile, svg_file = null, config = null) {
    const { molecule } = this.state;
    molecule.molfile = molfile;
    const smiles = config ? config.smiles : null;
    const isChemdraw = !!smiles;
    MoleculesFetcher.renewSVGFile(molecule.id, svg_file, isChemdraw).then((json) => {
      molecule.molecule_svg_file = json.svg_path;
      this.setState({ molecule, showStructureEditor: false });
    });
  }

  handleSearchTermChange(e) {
    this.setState((state) => ({
      ...state,
      searchTerm: e.target.value.trim(),
    }));
  }

  render() {
    const { searchTerm } = this.state;
    const formSearch = (
      <form>
        <FormGroup controlId="frmCtrlInChiKey">
          <ControlLabel>InChiKey</ControlLabel>
          <FormControl type="text" placeholder="Enter text" value={searchTerm} onChange={this.handleSearchTermChange} />
        </FormGroup>
        <Button onClick={this.handleSearch}>Search&nbsp;<i className="fa fa-search" aria-hidden="true" /></Button>
      </form>
    );

    const pageComponent = this.state.molecule ?
      (<MoleculeModeratorComponent
        molecule={this.state.molecule}
        showStructureEditor={this.state.showStructureEditor}
        handleEditorSave={this.handleEditorSave}
        handleEditor={this.handleEditor}
        onSave={this.onSave}
      />) : <div />;

    return (
      <div>
        {pageNav}
        <div className="container" style={{ marginTop: '60px' }}>
          {formSearch}
          <hr />
        </div>
        {pageComponent}
        <Notifications />
        <LoadingModal />
      </div>
    );
  }
}

export default MoleculeModerator;
