import React, { Component } from 'react';
import {
  Table, Button, Tooltip, OverlayTrigger, Label
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementAnalysesLabels from 'src/apps/mydb/elements/labels/ElementAnalysesLabels';
import ElementReactionLabels from 'src/apps/mydb/elements/labels/ElementReactionLabels';
import ElementWellplateLabels from 'src/apps/mydb/elements/labels/ElementWellplateLabels';
import GenericElementLabels from 'src/apps/mydb/elements/labels/GenericElementLabels';
import PubchemLabels from 'src/components/pubchem/PubchemLabels';
import ChemrepoLabels from 'src/apps/mydb/elements/labels/ChemrepoLabels';
import ComputedPropLabel from 'src/apps/mydb/elements/labels/ComputedPropLabel';
import ArrayUtils from 'src/utilities/ArrayUtils';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';

import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import KeyboardStore from 'src/stores/alt/stores/KeyboardStore';

import { DragDropItemTypes } from 'src/utilities/DndConst';
import SampleName from 'src/components/common/SampleName';
import { sampleShowOrNew } from 'src/utilities/routesUtils';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import { ShowUserLabels } from 'src/components/UserLabels';
import CommentIcon from 'src/components/comments/CommentIcon';

const buildFlattenSampleIds = (displayedMoleculeGroup) => {
  let flatIndex = 0;
  const flattenSamplesId = [];

  displayedMoleculeGroup.forEach((groupSample, index) => {
    const length = displayedMoleculeGroup[index].numSamples;
    for (let i = 0; i < length; i++) {
      flattenSamplesId[flatIndex + i] = groupSample[i].id;
    }
    flatIndex += length;
  });

  return flattenSamplesId;
};

const showDetails = (id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/sample/${id}`;
  Aviator.navigate(uri, { silent: true });
  sampleShowOrNew({ params: { sampleID: id, collectionID: currentCollection.id } });
};

const targets = {
  sample: ['reaction', 'wellplate', 'device', 'research_plan'],
  molecule: ['reaction'],
};

const isCurrEleDropType = (sourceType, targetType) => {
  if (['molecule', 'sample'].includes(sourceType) && !['wellplate', 'device', 'research_plan'].includes(targetType)) {
    return sourceType && targetType;
  }
  return sourceType && targetType && targets[sourceType].includes(targetType);
};

const dragColumn = (element, showDragColumn, sourceType, targetType) => {
  if (showDragColumn) {
    return (
      <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
        <ElementContainer
          key={element.id}
          sourceType={isCurrEleDropType(sourceType, targetType) ? sourceType : ''}
          element={element}
        />
      </td>
    );
  }
  return null;
};

function TopSecretIcon({ element }) {
  if (element.type === 'sample' && element.is_top_secret === true) {
    const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <i className="fa fa-user-secret" />
      </OverlayTrigger>
    );
  }
  return null;
}

TopSecretIcon.propTypes = {
  element: PropTypes.object,
};

function XvialIcon({ label }) {
  return (label || '').match(/^X\d+.*/) ? (
    <i
      className="icon-xvial"
      style={{ marginRight: '5px', fontSize: '20px' }}
    />
  ) : null;
}

XvialIcon.propTypes = {
  label: PropTypes.string,
};

XvialIcon.defaultProps = {
  label: ''
};

const showDecoupledIcon = (sample) => (sample.decoupled ? (
  <div className="decoupled-icon" onClick={(e) => e.stopPropagation()}>
    <OverlayTrigger placement="top" overlay={<Tooltip id="tip_decoupled_icon">is decoupled from molecule</Tooltip>}>
      <Label><i className="fa fa-chain-broken" aria-hidden="true" /></Label>
    </OverlayTrigger>
  </div>
) : null);

const overlayToggle = <Tooltip id="toggle_molecule">Toggle Molecule</Tooltip>;

const svgPreview = (showPreviews, sample) => (
  <div style={{ float: 'left' }}>
    {
      showPreviews
        ? (
          <SvgWithPopover
            hasPop
            previewObject={{
              txtOnly: '',
              isSVG: true,
              src: sample.svgPath
            }}
            popObject={{
              title: sample.molecule_iupac_name,
              src: sample.svgPath,
              height: '26vh',
              width: '52vw',
            }}
          />
        )
        : null
    }
  </div>
);

function MoleculeHeader({
  sample, show, showDragColumn, onClick, targetType
}) {
  const showIndicator = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';

  const { collId, showPreviews } = UIStore.getState();
  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={onClick}
    >
      {sample.molecule?.inchikey === 'DUMMY' && sample.molfile == null
        ? (<td colSpan="3" style={{ position: 'relative ' }}><div><h4>(No-structure sample)</h4></div></td>)
        : (
          <td colSpan="2" style={{ position: 'relative ' }}>
            {svgPreview(showPreviews, sample)}
            <div style={{ position: 'absolute', right: '3px', top: '14px' }}>
              <OverlayTrigger placement="bottom" overlay={overlayToggle}>
                <span style={{ fontSize: 15, color: '#337ab7', lineHeight: '10px' }}>
                  <i className={`glyphicon ${showIndicator}`} />
                </span>
              </OverlayTrigger>
            </div>
            <div style={{ paddingLeft: 5, wordWrap: 'break-word' }}>
              <h4><SampleName sample={sample} /></h4>
            </div>
            <div style={{
              position: 'absolute', top: '10px', right: '25px', float: 'right'
            }}
            >
              <ChemrepoLabels chemrepoId={sample.molecule.chem_repo && sample.molecule.chem_repo.id} />
              <PubchemLabels element={sample} />
            </div>
            <div style={{
              position: 'absolute', bottom: '10px', right: '25px', float: 'right'
            }}
            >
              <ComputedPropLabel cprops={sample.molecule_computed_props} />
            </div>
          </td>
        )}
      {sample.molecule?.inchikey === 'DUMMY' && sample.molfile == null
        ? null : dragColumn(sample, showDragColumn, DragDropItemTypes.MOLECULE, targetType)}
    </tr>
  );
}

export default class ElementsTableSampleEntries extends Component {
  constructor(props) {
    super();
    this.state = {
      displayedMoleculeGroup: [],
      moleculeGroupsShown: [],
      flattenSamplesId: [],
      keyboardIndex: null,
      keyboardSeletectedElementId: null,
    };

    this.sampleOnKeyDown = this.sampleOnKeyDown.bind(this);
  }

  componentDidMount() {
    KeyboardStore.listen(this.sampleOnKeyDown);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const displayedMoleculeGroup = [];
    const { currentElement } = ElementStore.getState();
    const { elements } = nextProps;
    const moleculelist = {};
    elements.forEach((sample) => {
      let samples = [];
      let molId = '';
      if (sample.decoupled && sample.molfile) {
        molId = `M${sample.id}`;
      } else if (sample.stereo == null) {
        molId = `M${sample.molecule.id}_any_any`;
      } else {
        molId = `M${sample.molecule.id}_${sample.stereo.abs || 'any'}_${sample.stereo.rel || 'any'}`;
      }
      if (moleculelist[molId]) {
        samples = moleculelist[molId];
      }
      samples.push(sample);
      moleculelist[molId] = samples;
    });
    Object.keys(moleculelist).forEach((moleculeId, idx) => {
      displayedMoleculeGroup.push(moleculelist[moleculeId]);
      let numSamples = moleculelist[moleculeId].length;
      if (nextProps.moleculeSort && numSamples > 3) { numSamples = 3; }
      displayedMoleculeGroup[idx].numSamples = numSamples;
    });
    this.setState({
      displayedMoleculeGroup,
      targetType: currentElement && currentElement.type,
      flattenSamplesId: buildFlattenSampleIds(displayedMoleculeGroup)
    }, this.forceUpdate());
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {
      collapseAll, showDragColumn, moleculeSort, currentElement, elements, ui
    } = this.props;
    const { checkedAll, checkedIds, uncheckedIds } = ui;
    const nextUi = nextProps.ui;
    return collapseAll !== nextProps.collapseAll // Bool
      || showDragColumn !== nextProps.showDragColumn // Bool
      || moleculeSort !== nextProps.moleculeSort // Bool
      || currentElement !== nextProps.currentElement // instance of Sample
      || elements !== nextProps.elements // Arr
      || checkedAll !== nextUi.checkedAll // Bool
      || checkedIds !== nextUi.checkedIds // Immutable List
      || uncheckedIds !== nextUi.uncheckedIds // Immutable List
      || this.state.keyboardIndex !== nextState.keyboardIndex // int
      || this.state.keyboardSeletectedElementId !== nextState.keyboardSeletectedElementId; // int
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.sampleOnKeyDown);
  }

  handleMoleculeToggle(moleculeName) {
    let { moleculeGroupsShown } = this.state;
    if (!moleculeGroupsShown.includes(moleculeName)) {
      moleculeGroupsShown = moleculeGroupsShown.concat(moleculeName);
    } else {
      moleculeGroupsShown = moleculeGroupsShown.filter((item) => item !== moleculeName);
    }
    this.setState({ moleculeGroupsShown }, this.forceUpdate());
    this.props.onChangeCollapse(false);
  }

  sampleOnKeyDown(state) {
    const { context } = state;
    if (context != 'sample') { return false; }

    const { documentKeyDownCode } = state;
    let { keyboardIndex, keyboardSeletectedElementId, flattenSamplesId } = this.state;

    switch (documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSeletectedElementId != null) {
          showDetails(keyboardSeletectedElementId);
        }
        break;
      case 38: // Up
        if (keyboardIndex > 0) {
          keyboardIndex--;
        } else {
          keyboardIndex = 0;
        }
        break;
      case 40: // Down
        if (keyboardIndex == null) {
          keyboardIndex = 0;
        } else if (keyboardIndex < (flattenSamplesId.length - 1)) {
          keyboardIndex++;
        }
        break;
      default:
        break;
    }

    keyboardSeletectedElementId = flattenSamplesId[keyboardIndex];
    this.setState({ keyboardIndex, keyboardSeletectedElementId });
  }

  showMoreSamples(index) {
    const { displayedMoleculeGroup } = this.state;
    let length = displayedMoleculeGroup[index].numSamples;
    length += 3;
    if (displayedMoleculeGroup[index].length < length) {
      length = displayedMoleculeGroup[index].length;
    }
    displayedMoleculeGroup[index].numSamples = length;

    this.setState({
      displayedMoleculeGroup,
      flattenSamplesId: buildFlattenSampleIds(displayedMoleculeGroup)
    }, this.forceUpdate());
  }

  isElementChecked(element) {
    const { checkedIds, uncheckedIds, checkedAll } = this.props.ui;
    return (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds || [], element.id))
      || ArrayUtils.isValInArray(checkedIds || [], element.id);
  }

  isElementSelected(element) {
    const { currentElement } = this.props;
    return (currentElement && currentElement.id === element.id);
  }

  renderSamples(samples, index) {
    const { keyboardSeletectedElementId, displayedMoleculeGroup } = this.state;
    const { showDragColumn } = this.props;
    const { length } = samples;
    const { numSamples } = displayedMoleculeGroup[index];

    const sampleRows = samples.slice(0, numSamples).map((sample, ind) => {
      const selected = this.isElementSelected(sample);
      const style = (selected || keyboardSeletectedElementId === sample.id) ? {
        color: '#fff', background: '#337ab7'
      } : {};

      return (
        <tr key={ind} style={style}>
          <td width="30px">
            <ElementCheckbox
              element={sample}
              key={sample.id}
              checked={this.isElementChecked(sample)}
            />
          </td>
          <td
            style={{ cursor: 'pointer', verticalAlign: 'middle' }}
            onClick={showDetails.bind(this, sample.id)}
          >
            {sample.title(selected)}

            <div style={{
              float: 'right', display: 'flex', alignItems: 'center', gap: '5px'
            }}
            >
              <div style={{ marginTop: '1px' }}><CommentIcon commentCount={sample.comment_count} /></div>
              <div style={{ marginTop: '3px' }}><ShowUserLabels element={sample} /></div>
              <div style={{ marginTop: '3px' }}><XvialIcon label={sample.external_label} /></div>
              <div style={{ marginTop: '1px' }}><ElementReactionLabels element={sample} key={`${sample.id}_reactions`} /></div>
              <ElementWellplateLabels element={sample} key={`${sample.id}_wellplate`} />
              <GenericElementLabels element={sample} key={`${sample.id}_element`} />
              <ElementCollectionLabels element={sample} key={`${sample.id}`} />
              <ElementAnalysesLabels element={sample} key={`${sample.id}_analyses`} />
              {showDecoupledIcon(sample)}
              <TopSecretIcon element={sample} />
            </div>
          </td>
          {dragColumn(sample, showDragColumn, DragDropItemTypes.SAMPLE, this.state.targetType)}
        </tr>
      );
    });

    if (numSamples < length) {
      const showMoreSamples = (
        <tr key={`${index}_showMore`}>
          <td colSpan="3" style={{ padding: 0 }}>
            <Button
              bsStyle="info"
              onClick={() => this.showMoreSamples(index)}
              style={{
                fontSize: '14px', width: '100%', float: 'left', borderRadius: '0px'
              }}
            >
              Show more samples
            </Button>
          </td>

        </tr>
      );
      sampleRows.push(showMoreSamples);
    }

    return sampleRows;
  }

  renderMoleculeGroup(moleculeGroup, index) {
    const { showDragColumn, collapseAll } = this.props;
    const { moleculeGroupsShown, targetType } = this.state;
    const { molecule } = moleculeGroup[0];
    const moleculeName = molecule.iupac_name || molecule.inchistring;
    const showGroup = !moleculeGroupsShown.includes(moleculeName) && !collapseAll;

    return (
      <tbody key={index}>
        <MoleculeHeader
          sample={moleculeGroup[0]}
          show={showGroup}
          showDragColumn={showDragColumn}
          onClick={() => this.handleMoleculeToggle(moleculeName)}
          targetType={targetType}
        />
        {showGroup ? this.renderSamples(moleculeGroup, index) : null}
      </tbody>
    );
  }

  render() {
    const { displayedMoleculeGroup } = this.state;
    return (
      <Table className="sample-entries">
        {Object.keys(displayedMoleculeGroup).map((group, index) => {
          const moleculeGroup = displayedMoleculeGroup[group];
          const { numSamples } = displayedMoleculeGroup[group];
          return this.renderMoleculeGroup(moleculeGroup, index, numSamples);
        })}
      </Table>
    );
  }
}

ElementsTableSampleEntries.propTypes = {
  onChangeCollapse: PropTypes.func,
  collapseAll: PropTypes.bool,
  elements: PropTypes.array,
  currentElement: PropTypes.object,
  showDragColumn: PropTypes.bool,
  ui: PropTypes.object,
  moleculeSort: PropTypes.bool,
};
