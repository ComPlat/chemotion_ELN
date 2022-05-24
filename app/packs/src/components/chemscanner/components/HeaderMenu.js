import { List } from 'immutable';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import 'whatwg-fetch';
import XLSX from 'xlsx';

import {
  ButtonGroup,
  Button,
  DropdownButton,
  MenuItem,
  OverlayTrigger
} from 'react-bootstrap';

import { catalyst } from '../../staticDropdownOptions/reagents/catalyst';
import { chiralAuxiliaries } from '../../staticDropdownOptions/reagents/chiral_auxiliaries';
import { couplingReagents } from '../../staticDropdownOptions/reagents/coupling_reagents';
import { fluorination } from '../../staticDropdownOptions/reagents/fluorination';
import { halogenationBrClI } from '../../staticDropdownOptions/reagents/halogenation_BrClI';
import { ionicLiquids } from '../../staticDropdownOptions/reagents/ionic_liquids';
import { lewisAcids } from '../../staticDropdownOptions/reagents/lewis_acids';
import { ligands } from '../../staticDropdownOptions/reagents/ligands';
import { metallorganics } from '../../staticDropdownOptions/reagents/metallorganics';
import { orgBases } from '../../staticDropdownOptions/reagents/org_bases';
import { organoboron } from '../../staticDropdownOptions/reagents/organoboron';
import { organocatalysts } from '../../staticDropdownOptions/reagents/organocatalysts';
import { oxidation } from '../../staticDropdownOptions/reagents/oxidation';
import { phaseTransferReagents } from '../../staticDropdownOptions/reagents/phase_transfer_reagents';
import { reducingReagents } from '../../staticDropdownOptions/reagents/reducing_reagents';
import { solvents } from '../../staticDropdownOptions/reagents/solvents';

import SmiSelect from './SmiSelect';
import HelpPopover from './HelpPopover';

import NotificationContainer from '../containers/NotificationContainer';

import {
  extractMoleculeFromGroup,
  generateExcelMoleculeRow,
  generateExcelReactionRow
} from '../utils';

import {
  getSchemeMolecules,
  getReactionReagents,
  getReactionGroups
} from '../reactionUtils';

const SUPPORTED_FILE_TYPES = ['cdx', 'cdxml', 'doc', 'docx', 'xml', 'zip'];

const allReagents = Object.assign(
  {}, ionicLiquids, catalyst, ligands,
  chiralAuxiliaries, couplingReagents, halogenationBrClI, fluorination,
  orgBases, lewisAcids, organocatalysts, organoboron, metallorganics,
  oxidation, reducingReagents, phaseTransferReagents
);

const supportTypes = (files) => {
  let support = true;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const extension = file.name.split('.').pop();

    if (!SUPPORTED_FILE_TYPES.includes(extension)) support = false;
  }

  return support;
};

export default class HeaderMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      disabled: true,
      selectedReactionId: 0,
      selectedSolvents: [],
      selectedReagents: []
    };

    this.clickUploadMolecule = this.clickUploadMolecule.bind(this);
    this.clickUploadReaction = this.clickUploadReaction.bind(this);

    this.scanFilesForMolecules = this.scanFilesForMolecules.bind(this);
    this.scanFilesForReactions = this.scanFilesForReactions.bind(this);
    this.updateReagents = this.updateReagents.bind(this);

    this.exportCml = this.exportCml.bind(this);
    this.exportExcel = this.exportExcel.bind(this);

    this.changeScannedFileView = this.changeScannedFileView.bind(this);
    this.changeAbbreviationView = this.changeAbbreviationView.bind(this);
    this.changeFileStorageView = this.changeFileStorageView.bind(this);
    this.changeArchivedManagementView = this.changeArchivedManagementView.bind(this);

    this.solventValues = Object.keys(solvents).map(k => solvents[k]);
    this.allReagentValues = Object.keys(allReagents).map(k => allReagents[k]);
  }

  componentWillReceiveProps(nextProps) {
    const { reactions, molecules } = nextProps;

    let rId = this.state.selectedReactionId;
    const selectedR = reactions.filter(r => r.get('selected'));
    const disabled = selectedR.size !== 1 || !selectedR.get(0).get('id');

    const selectedReagents = [];
    const selectedSolvents = [];

    if (!disabled && selectedR.size === 1) {
      const reaction = selectedR.get(0);
      rId = reaction.get('id');
      const reactionMolecules = getSchemeMolecules(reaction, molecules);
      const reagents = getReactionReagents(reaction, reactionMolecules);

      reagents.forEach((m) => {
        const canoSmiles = m.get('canoSmiles');

        if (this.solventValues.includes(canoSmiles)) {
          selectedSolvents.push(canoSmiles);
        } else if (this.allReagentValues.includes(canoSmiles)) {
          selectedReagents.push(canoSmiles);
        }
      });
    }

    this.setState({
      selectedReactionId: rId,
      selectedSolvents,
      selectedReagents,
      disabled
    });
  }

  exportCml() {
    const { reactions, molecules } = this.props;

    let selectedR = reactions.filter(r => r.get('selected'));
    let selectedM = molecules.filter(r => r.get('selected'));
    if (selectedR.size === 0 && selectedM.size === 0) {
      selectedR = reactions.filter(r => r.get('externalId'));
      selectedM = molecules.filter(m => m.get('externalId'));
    }

    const simpleReactions = selectedR.map((r) => {
      const {
        reactants, reagents, solvents, products
      } = getReactionGroups(r, molecules);

      return {
        id: r.get('id'),
        reactants: extractMoleculeFromGroup(reactants.toJS()),
        reagents: extractMoleculeFromGroup(reagents.toJS()),
        solvents: extractMoleculeFromGroup(solvents.toJS()),
        products: extractMoleculeFromGroup(products.toJS()),
        yield: r.get('yield') || '',
        time: r.get('time') || '',
        temperature: r.get('temperature') || '',
        description: r.get('description') || ''
      };
    });

    const simpleMolecules = selectedM.toJS().map(m => ({
      id: m.id,
      mdl: m.mdl,
    }));

    fetch('/api/v1/public_chemscanner/export/cml', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      method: 'post',
      body: JSON.stringify({ reactions: simpleReactions, molecules: simpleMolecules })
    }).then((response) => {
      if (response.ok === false) return null;

      return response.json();
    }).then((res) => {
      if (!res) return;

      const a = document.createElement('a');
      a.style = 'display: none';
      document.body.appendChild(a);
      ['reactions', 'molecules'].forEach((group) => {
        const url = window.URL.createObjectURL(new Blob([res[group]]));
        a.href = url;
        a.download = `chemscanner_${group}.cml`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  exportExcel() {
    const { reactions, molecules } = this.props;
    let selectedR = reactions.filter(r => r.get('selected'));
    let selectedM = molecules.filter(r => r.get('selected'));
    if (selectedR.size === 0 && selectedM.size === 0) {
      selectedR = reactions.filter(r => r.get('externalId'));
      selectedM = molecules.filter(m => m.get('externalId'));
    }

    const wb = {};
    wb.SheetNames = [];
    wb.Sheets = {};

    const moleculeSheet = 'Molecules';
    const moleculeRows = selectedM.toJS().reduce((rows, mol) => {
      rows.push(generateExcelMoleculeRow(mol));
      return rows;
    }, [['Smiles', 'MDL', 'InChI', 'InChIKey', 'Description']]);
    const moleculeWs = XLSX.utils.aoa_to_sheet(moleculeRows);
    wb.SheetNames.push(moleculeSheet);
    wb.Sheets[moleculeSheet] = moleculeWs;

    const reactionSheet = 'Reactions';
    const reactionRows = selectedR.reduce((rows, immuReaction) => {
      const reaction = immuReaction.toJS();

      const {
        reactants, reagents, solvents, products
      } = getReactionGroups(immuReaction, molecules);

      reaction.reactants = reactants;
      reaction.reagents = reagents;
      reaction.solvents = solvents;
      reaction.products = products;

      rows.push(generateExcelReactionRow(reaction));

      return rows;
    }, [[
      'ReactionSmiles', 'Temperature', 'Yield', 'Time',
      'Reaction Description', 'Reaction Steps',
      'Reactants SDF', 'Reagents SDF', 'Products SDF',
      'Reactants Description', 'Products Description',
    ]]);
    const reactionWs = XLSX.utils.aoa_to_sheet(reactionRows);
    wb.SheetNames.push(reactionSheet);
    wb.Sheets[reactionSheet] = reactionWs;

    XLSX.writeFile(wb, 'chemscanner.xlsx', { bookSST: true });
  }

  scanFilesForMolecules() {
    const { showNotification, scanFile } = this.props;
    const { files } = this.molInput;

    if (supportTypes(files)) {
      scanFile(Array.from(files), true);
    } else {
      const fileTypes = SUPPORTED_FILE_TYPES.join(', ').toUpperCase();
      const notification = `Supported types: ${fileTypes}`;

      showNotification(notification);
    }

    this.molInput.value = '';
  }

  scanFilesForReactions() {
    const { showNotification, scanFile } = this.props;
    const { files } = this.reactionInput;

    if (supportTypes(files)) {
      scanFile(Array.from(files), false);
    } else {
      const fileTypes = SUPPORTED_FILE_TYPES.join(', ').toUpperCase();
      const notification = `Supported types: ${fileTypes}`;

      showNotification(notification);
    }

    this.reactionInput.value = '';
  }

  updateReagents({ value, type }) {
    const { updateReagents } = this.props;
    const { selectedReactionId } = this.state;

    const newSmiles = value.split(',');
    const selectedType = `selected${type[0].toUpperCase()}${type.substring(1)}`;
    const selectedSmiles = this.state[selectedType];

    const removedSmiles = selectedSmiles.filter(smi => !newSmiles.includes(smi));
    const addedSmiles = newSmiles.filter(smi => !selectedSmiles.includes(smi));

    const updateInfo = { add: addedSmiles, remove: removedSmiles };
    updateReagents(selectedReactionId, updateInfo);
  }

  clickUploadMolecule() {
    this.molInput.click();
    document.getElementById('chemscanner-scan-file-dd').click();
  }

  clickUploadReaction() {
    this.reactionInput.click();
    document.getElementById('chemscanner-scan-file-dd').click();
  }

  changeScannedFileView() {
    this.props.changeScannedFileView();
  }

  changeAbbreviationView() {
    this.props.changeAbbreviationView();
  }

  changeFileStorageView() {
    this.props.changeFileStorageView();
  }

  changeArchivedManagementView() {
    this.props.changeArchivedManagementView();
  }

  render() {
    const { cleanUp } = this.props;
    const { disabled, selectedReagents, selectedSolvents } = this.state;

    const helpPopover = <HelpPopover style={{ maxWidth: '800px' }} />;

    return (
      <div className="chemscanner-menu">
        <OverlayTrigger
          trigger="click"
          placement="left"
          rootClose
          overlay={helpPopover}
        >
          <Button style={{ position: 'absolute', right: '35px', top: '10px' }}>
            <i className="fa fa-question-circle" />
          </Button>
        </OverlayTrigger>
        <NotificationContainer />
        <input
          type="file"
          multiple="multiple"
          style={{ display: 'none' }}
          ref={(molInput) => { this.molInput = molInput; }}
          onChange={this.scanFilesForMolecules}
        />
        <input
          type="file"
          multiple="multiple"
          style={{ display: 'none' }}
          ref={(reactionInput) => { this.reactionInput = reactionInput; }}
          onChange={this.scanFilesForReactions}
        />
        <ButtonGroup>
          <DropdownButton
            title="Scan File"
            id="chemscanner-scan-file-dd"
          >
            <MenuItem className="chemscanner-menu-item" onSelect={this.clickUploadReaction}>
              Scan for reactions
            </MenuItem>
            <MenuItem className="chemscanner-menu-item" onSelect={this.clickUploadMolecule}>
              Scan for molecules
            </MenuItem>
          </DropdownButton>
        </ButtonGroup>
        <ButtonGroup>
          <Button onClick={cleanUp}>Clean Up</Button>
        </ButtonGroup>
        <div style={{ width: '160px' }}>
          <SmiSelect
            disabled={disabled}
            obj={solvents}
            type="solvents"
            value={selectedSolvents}
            onSelect={this.updateReagents}
          />
        </div>
        <div style={{ width: '200px' }}>
          <SmiSelect
            disabled={disabled}
            obj={allReagents}
            onSelect={this.updateReagents}
            value={selectedReagents}
            type="reagents"
            optionHeight={80}
          />
        </div>
        <ButtonGroup style={{ marginRight: '5px' }}>
          <DropdownButton title="Export" id="chemscanner-export-dd">
            <MenuItem eventKey="1" onSelect={this.exportCml}>CML</MenuItem>
            <MenuItem eventKey="2" onSelect={this.exportExcel}>Excel</MenuItem>
          </DropdownButton>
        </ButtonGroup>
        <ButtonGroup>
          <DropdownButton title="View" id="chemscanner-export-dd">
            <MenuItem
              eventKey="1"
              onSelect={this.changeScannedFileView}
            >
              Scanned Files
            </MenuItem>
            <MenuItem
              eventKey="2"
              onSelect={this.changeAbbreviationView}
            >
              Abbreviation/Superatom
            </MenuItem>
            <MenuItem
              eventKey="3"
              onSelect={this.changeFileStorageView}
            >
              File Storage
            </MenuItem>
            <MenuItem
              eventKey="4"
              onSelect={this.changeArchivedManagementView}
            >
              Archived Management
            </MenuItem>
          </DropdownButton>
        </ButtonGroup>
      </div>
    );
  }
}

HeaderMenu.propTypes = {
  reactions: PropTypes.instanceOf(List).isRequired,
  molecules: PropTypes.instanceOf(List).isRequired,
  scanFile: PropTypes.func.isRequired,
  showNotification: PropTypes.func.isRequired,
  cleanUp: PropTypes.func.isRequired,
  changeScannedFileView: PropTypes.func.isRequired,
  changeAbbreviationView: PropTypes.func.isRequired,
  changeFileStorageView: PropTypes.func.isRequired,
  changeArchivedManagementView: PropTypes.func.isRequired,
  updateReagents: PropTypes.func.isRequired,
};
