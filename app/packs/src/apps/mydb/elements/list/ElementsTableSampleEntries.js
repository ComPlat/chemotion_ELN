import React, { Component } from 'react';
import {
  Table, Button, Tooltip, OverlayTrigger
} from 'react-bootstrap';
import classnames from 'classnames';
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
import ChevronIcon from 'src/components/common/ChevronIcon';

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

const dragColumn = (element, sourceType, targetType) => (
  <td className="text-center align-middle">
    <ElementContainer
      key={element.id}
      sourceType={isCurrEleDropType(sourceType, targetType) ? sourceType : ''}
      element={element}
    />
  </td>
);

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
    <i className="icon-xvial px-1 fs-5" />
  ) : null;
}

XvialIcon.propTypes = {
  label: PropTypes.string,
};

XvialIcon.defaultProps = {
  label: ''
};

const showDecoupledIcon = (sample) => (sample.decoupled ? (
  <OverlayTrigger placement="top" overlay={<Tooltip id="tip_decoupled_icon">is decoupled from molecule</Tooltip>}>
    <Button size="xxsm" variant="light"><i className="fa fa-chain-broken" aria-hidden="true" /></Button>
  </OverlayTrigger>
) : null);

const overlayToggle = <Tooltip id="toggle_molecule">Toggle Molecule</Tooltip>;

const svgPreview = (sample) => (
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
);

function MoleculeHeader({ sample, show, showPreviews, showDragColumn, onClick, targetType }) {
  const isNoStructureSample = sample.molecule?.inchikey === 'DUMMY' && sample.molfile == null;

  return (
    <tr
      role="button"
      onClick={onClick}
    >
      {isNoStructureSample
        ? (
          <td colSpan="3" className="position-relative">
            <div>
              <h4>
                (No-structure sample)
              </h4>
            </div>
          </td>
        )
        : (
          <td colSpan="2">
            <div className="d-flex align-items-start gap-1">
              {showPreviews && svgPreview(sample)}
              <h4 className="flex-grow-1"><SampleName sample={sample} /></h4>
              <div className="d-flex align-items-center gap-1">
                {sample.molecule.chem_repo && sample.molecule.chem_repo.id && <ChemrepoLabels chemrepoId={sample.molecule.chem_repo.id} />}
                <PubchemLabels element={sample} />
                <ComputedPropLabel cprops={sample.molecule_computed_props} />
                <OverlayTrigger placement="bottom" overlay={overlayToggle}>
                  <ChevronIcon direction={show ? 'down' : 'right'} color="primary"/>
                </OverlayTrigger>
              </div>
            </div>
          </td>
        )}
      {!isNoStructureSample
          && showDragColumn
          && dragColumn(sample, DragDropItemTypes.MOLECULE, targetType)}
    </tr>
  );
}

export default class ElementsTableSampleEntries extends Component {
  constructor(props) {
    super(props);

    const { showPreviews } = UIStore.getState();
    this.state = {
      displayedMoleculeGroup: [],
      moleculeGroupsShown: [],
      showPreviews,
      flattenSamplesId: [],
      keyboardIndex: null,
      keyboardSeletectedElementId: null,
    };

    this.sampleOnKeyDown = this.sampleOnKeyDown.bind(this);
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
  }

  componentDidMount() {
    KeyboardStore.listen(this.sampleOnKeyDown);
    UIStore.listen(this.onUIStoreChange);
  }

  onUIStoreChange(state) {
    const { showPreviews } = state;
    if (this.state.showPreviews !== showPreviews) {
      this.setState({ showPreviews });
    }
  }

  getMolId(sample) {
    if (sample.decoupled && sample.molfile) {
      return `M${sample.id}`;
    } else if (sample.stereo == null) {
      return `M${sample.molecule.id}_any_any`;
    } else {
      return `M${sample.molecule.id}_${sample.stereo.abs || 'any'}_${sample.stereo.rel || 'any'}`;
    }
  }

  componentDidUpdate(prevProps) {
    const { elements, moleculeSort } = this.props;
    if (elements === prevProps.elements && moleculeSort === prevProps.moleculeSort) {
      return
    }

    const moleculeList = elements.reduce((acc, sample) => {
      const key = this.getMolId(sample);
      if (!acc[key]) {
        acc[key] = [sample];
      } else {
        acc[key].push(sample);
      }
      return acc;
    }, {});

    const displayedMoleculeGroup = Object.keys(moleculeList).map((molId) => {
      const m = moleculeList[molId];
      if (moleculeSort && m.length > 3) {
        m.numSamples = 3;
      } else {
        m.numSamples = m.length;
      }
      return m;
    });

    const { currentElement } = ElementStore.getState();
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
    const { keyboardIndex, keyboardSeletectedElementId, showPreviews } = this.state;
    const { checkedAll, checkedIds, uncheckedIds } = ui;
    const nextUi = nextProps.ui;
    return collapseAll !== nextProps.collapseAll // Bool
      || showPreviews !== nextState.showPreviews // Bool
      || showDragColumn !== nextProps.showDragColumn // Bool
      || moleculeSort !== nextProps.moleculeSort // Bool
      || currentElement !== nextProps.currentElement // instance of Sample
      || elements !== nextProps.elements // Arr
      || checkedAll !== nextUi.checkedAll // Bool
      || checkedIds !== nextUi.checkedIds // Immutable List
      || uncheckedIds !== nextUi.uncheckedIds // Immutable List
      || keyboardIndex !== nextState.keyboardIndex // int
      || keyboardSeletectedElementId !== nextState.keyboardSeletectedElementId; // int
  }

  componentWillUnmount() {
    KeyboardStore.unlisten(this.sampleOnKeyDown);
    UIStore.unlisten(this.onUIStoreChange);
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
    const { ui: { checkedIds = [], uncheckedIds = [], checkedAll } } = this.props;
    return (checkedAll && !uncheckedIds.includes(element.id)) || checkedIds.includes(element.id);
  }

  isElementSelected(element) {
    const { currentElement } = this.props;
    return (currentElement && currentElement.id === element.id);
  }

  renderSamples(samples, index) {
    const { targetType, keyboardSeletectedElementId, displayedMoleculeGroup } = this.state;
    const { showDragColumn } = this.props;
    const { length } = samples;
    const { numSamples } = displayedMoleculeGroup[index];

    const sampleRows = samples.slice(0, numSamples).map((sample) => {
      const selected = this.isElementSelected(sample);
      const applyHighlight = selected || keyboardSeletectedElementId === sample.id

      return (
        <tr key={sample.id} className={classnames({ 'text-bg-primary': applyHighlight })}>
          <td width="30px">
            <ElementCheckbox
              element={sample}
              key={sample.id}
              checked={this.isElementChecked(sample)}
            />
          </td>
          <td
            onClick={() => showDetails(sample.id)}
            role="button"
          >
            <div className="d-flex justify-content-between">
              {sample.title(selected)}

              <div className="d-flex align-items-center gap-1">
                <CommentIcon commentCount={sample.comment_count} />
                <ShowUserLabels element={sample} />
                <XvialIcon label={sample.external_label} />
                <ElementReactionLabels element={sample} key={`${sample.id}_reactions`} />
                <ElementWellplateLabels element={sample} key={`${sample.id}_wellplate`} />
                <GenericElementLabels element={sample} key={`${sample.id}_element`} />
                <ElementCollectionLabels element={sample} key={`${sample.id}`} />
                <ElementAnalysesLabels element={sample} key={`${sample.id}_analyses`} />
                {showDecoupledIcon(sample)}
                <TopSecretIcon element={sample} />
              </div>
            </div>
          </td>
          {showDragColumn && dragColumn(sample, DragDropItemTypes.SAMPLE, targetType)}
        </tr>
      );
    });

    if (numSamples < length) {
      const showMoreSamples = (
        <tr key={`${index}_showMore`}>
          <td colSpan="3" className="p-0">
            <Button
              variant="info"
              onClick={() => this.showMoreSamples(index)}
              className="w-100"
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
    const { showPreviews, moleculeGroupsShown, targetType } = this.state;
    const { molecule } = moleculeGroup[0];
    const moleculeName = molecule.iupac_name || molecule.inchistring;
    const showGroup = !moleculeGroupsShown.includes(moleculeName) && !collapseAll;

    return (
      <tbody key={index} className="sheet">
        <MoleculeHeader
          sample={moleculeGroup[0]}
          show={showGroup}
          showPreviews={showPreviews}
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
