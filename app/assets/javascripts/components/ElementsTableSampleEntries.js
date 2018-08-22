import React, { Component } from 'react';
import { Table, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Immutable from 'immutable';
import PropTypes from 'prop-types';
import _ from 'lodash';

import ElementCheckbox from './ElementCheckbox';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementAnalysesLabels from './ElementAnalysesLabels';
import ElementReactionLabels from './ElementReactionLabels';
import PubchemLabels from './PubchemLabels';
import ComputedPropLabel from './computed_props/ComputedPropLabel';
import ArrayUtils from './utils/ArrayUtils';
import ElementContainer from './ElementContainer';

import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import KeyboardStore from './stores/KeyboardStore';

import DragDropItemTypes from './DragDropItemTypes';
import SampleName from './common/SampleName';
import XMolHeadCont from './extra/ElementsTableSampleEntriesXMolHeadCont';
import Sample from './models/Sample';
import { sampleShowOrNew } from './routesUtils';
import SvgWithPopover from './common/SvgWithPopover';

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
  sample: ['reaction', 'wellplate', 'device'],
  molecule: ['reaction'],
};

const isCurrEleDropType = (sourceType, targetType) =>
  sourceType && targetType && targets[sourceType].includes(targetType);

const dragColumn = (element, showDragColumn, sourceType, targetType) => {
  if (showDragColumn) {
    return (
      <td style={{ verticalAlign: 'middle', textAlign: 'center' }} >
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

const TopSecretIcon = ({ element }) => {
  if (element.type === 'sample' && element.is_top_secret === true) {
    const tooltip = (<Tooltip id="top_secret_icon">Top secret</Tooltip>);
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <i className="fa fa-user-secret" />
      </OverlayTrigger>
    );
  }
  return null;
};

TopSecretIcon.propTypes = {
  element: PropTypes.object,
};

const XvialIcon = ({ label }) => {
  return label.match(/^X\d+.*/) ? (
    <i
      className="icon-xvial"
      style={{ marginRight: '5px', fontSize: '20px' }}
    />
  ) : null;
};

XvialIcon.propTypes = {
  label: PropTypes.string,
};

XvialIcon.defaultProps = {
  label: ''
};

const overlayToggle = <Tooltip id="toggle_molecule">Toggle Molecule</Tooltip>;

const svgPreview = (showPreviews, sample) => (
  <div style={{ float: 'left' }} >
    {
      showPreviews
        ? <SvgWithPopover element={sample} classNames='molecule' />
        : null
    }
  </div>
);

const MoleculeHeader = ({ sample, show, showDragColumn, onClick, targetType }) => {
  const showIndicator = (show) ? 'glyphicon-chevron-down' : 'glyphicon-chevron-right';
  const tdExtraContents = [];

  for (let j = 0; j < XMolHeadCont.count; j++) {
    const NoName = XMolHeadCont[`content${j}`];
    tdExtraContents.push(<NoName element={sample} key={`exMolHead${j}`} />);
  }

  const { collId, showPreviews } = UIStore.getState();
   // const dragItem = Sample.copyFromSampleAndCollectionId(sample, collId, true);
   // dragItem.id = null;

  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={onClick}
    >
      <td colSpan="2" style={{ position: 'relative ' }} >
        {svgPreview(showPreviews, sample)}
        <div style={{ position: 'absolute', right: '3px', top: '14px' }} >
          <OverlayTrigger placement="bottom" overlay={overlayToggle} >
            <span style={{ fontSize: 15, color: '#337ab7', lineHeight: '10px' }} >
              <i className={`glyphicon ${showIndicator}`} />
            </span>
          </OverlayTrigger>
        </div>
        <div style={{ paddingLeft: 5, wordWrap: 'break-word' }} >
          <h4><SampleName sample={sample} /></h4>
        </div>
        <div style={{ position: 'absolute', top: '10px', right: '25px', float: 'right' }} >
          {tdExtraContents.map(e => e)}
          <PubchemLabels element={sample} />
        </div>
        <div style={{ position: 'absolute', bottom: '10px', right: '25px', float: 'right' }} >
          <ComputedPropLabel cprops={sample.molecule_computed_props} />
        </div>
      </td>
      {dragColumn(sample, showDragColumn, DragDropItemTypes.MOLECULE, targetType)}
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

  componentWillReceiveProps(nextProps) {
    const displayedMoleculeGroup = [];
    const { currentElement } = ElementStore.getState();
    const { elements } = nextProps;
    const moleculelist = {};
    elements.forEach((sample) => {
      let samples = [];
      const molId = `M${sample.molecule.id}`;
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
    })
    this.setState({
      displayedMoleculeGroup,
      targetType: currentElement && currentElement.type,
      flattenSamplesId: buildFlattenSampleIds(displayedMoleculeGroup)
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    const { collapseAll, showDragColumn, moleculeSort, currentElement, elements, ui } = this.props;
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

  sampleOnKeyDown(state) {
    const context = state.context
    if (context != "sample") { return false; }

    const documentKeyDownCode = state.documentKeyDownCode
    let { keyboardIndex, keyboardSeletectedElementId, flattenSamplesId } = this.state

    switch(documentKeyDownCode) {
      case 13: // Enter
      case 39: // Right
        if (keyboardIndex != null && keyboardSeletectedElementId != null) {
          showDetails(keyboardSeletectedElementId)
        }
        break;
      case 38: // Up
        if (keyboardIndex > 0) {
          keyboardIndex--;
        } else {
          keyboardIndex = 0
        }
        break;
      case 40: // Down
        if (keyboardIndex == null) {
          keyboardIndex = 0
        } else if (keyboardIndex < (flattenSamplesId.length - 1)) {
          keyboardIndex++;
        }
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


  handleMoleculeToggle(moleculeName) {
    let { moleculeGroupsShown } = this.state;
    if (!moleculeGroupsShown.includes(moleculeName)) {
      moleculeGroupsShown = moleculeGroupsShown.concat(moleculeName);
    } else {
      moleculeGroupsShown = moleculeGroupsShown.filter(item => item !== moleculeName);
    }
    this.setState({ moleculeGroupsShown }, this.forceUpdate());
    this.props.onChangeCollapse(false);
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
    const length = samples.length;
    const numSamples = displayedMoleculeGroup[index].numSamples;

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
            style={{ cursor: 'pointer' }}
            onClick={showDetails.bind(this, sample.id)}
          >
            {sample.title(selected)}
            <div style={{ float: 'right', display: 'flex', alignItems: 'center' }}>
              <XvialIcon label={sample.external_label} />
              <ElementReactionLabels element={sample} key={`${sample.id}_reactions`} />
              <ElementCollectionLabels element={sample} key={`${sample.id}`} />
              <ElementAnalysesLabels element={sample} key={`${sample.id}_analyses`} />
              <TopSecretIcon element={sample} />
            </div>
          </td>
          {dragColumn(sample, showDragColumn, DragDropItemTypes.SAMPLE, this.state.targetType)}
        </tr>
      );
    });

    if (numSamples < length) {
      const showMoreSamples = (
        <tr key={`${index}_showMore`}><td colSpan="3" style={{ padding: 0 }} >
          <Button
            bsStyle="info"
            onClick={() => this.showMoreSamples(index)}
            style={{ fontSize: '14px', width: '100%', float: 'left', borderRadius: '0px' }}
          >Show more samples</Button>
        </td></tr>
      );
      sampleRows.push(showMoreSamples);
    }

    return sampleRows;
  }

  renderMoleculeGroup(moleculeGroup, index) {
    const { showDragColumn, collapseAll } = this.props;
    const { moleculeGroupsShown, targetType } = this.state;
    const molecule = moleculeGroup[0].molecule;
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
      <Table className="sample-entries" >
        {Object.keys(displayedMoleculeGroup).map((group, index) => {
          const moleculeGroup = displayedMoleculeGroup[group];
          const numSamples = displayedMoleculeGroup[group].numSamples;
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
