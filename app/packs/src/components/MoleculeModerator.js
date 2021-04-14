import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Navbar, FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap';
import MoleculeModeratorComponent from './MoleculeModeratorComponent';
import MoleculesFetcher from './fetchers/MoleculesFetcher';
import Notifications from './Notifications';
import LoadingModal from './common/LoadingModal';
import LoadingActions from './actions/LoadingActions';
import NotificationActions from './actions/NotificationActions';

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
      molecule: null,
      showStructureEditor: false,
      msg: { show: false, level: null, message: null },
    };

    this.handleEditor = this.handleEditor.bind(this);
    this.handleSearch = this.handleSearch.bind(this);
    this.handleEditorSave = this.handleEditorSave.bind(this);
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
    const { msg } = this.state;
    MoleculesFetcher.getByInChiKey(this.refInChiKey.value.trim())
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

  render() {
    const formSearch = (
      <form>
        <FormGroup controlId="frmCtrlInChiKey">
          <ControlLabel>InChiKey</ControlLabel>
          <FormControl type="text" placeholder="Enter text" inputRef={(ref) => { this.refInChiKey = ref; }} />
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

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('MoleculeModerator');
  if (domElement) ReactDOM.render(<MoleculeModerator />, domElement);
});
