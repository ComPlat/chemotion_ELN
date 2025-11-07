/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';
import { filter, cloneDeep } from 'lodash';
import { Constants } from 'chem-generic-ui';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import MatrixCheck from 'src/components/common/MatrixCheck';

export async function loadEls() {
  const response = await fetch('/klasses.json', {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
  if (!response.ok) {
    console.log('Network response was not ok: ', response);
    return [];
  }
  const json = await response.json();
  return json;
}

export const ALL_TYPES = [
  Constants.GENERIC_TYPES.ELEMENT,
  Constants.GENERIC_TYPES.SEGMENT,
  Constants.GENERIC_TYPES.DATASET,
];

export const allElnElements = [
  'sample', 'reaction', 'screen', 'wellplate', 'research_plan', 'vessel',
  'cell_line', 'device_description', 'sequence_based_macromolecule_sample',
];

export const allElnElementsForSearch = [
  'cell_lines', 'samples', 'reactions', 'wellplates', 'screens', 'research_plans',
  'sequence_based_macromolecule_samples',
];

export const allElnElmentsWithLabel = [
  { name: 'sample', label: 'Sample' },
  { name: 'reaction', label: 'Reaction' },
  { name: 'wellplate', label: 'Wellplate' },
  { name: 'screen', label: 'Screen' },
  { name: 'research_plan', label: 'Research Plan' },
  { name: 'cell_line', label: 'Cell Line' },
  { name: 'device_description', label: 'Device Description' },
  { name: 'vessel', label: 'Vessel' },
  { name: 'sequence_based_macromolecule_sample', label: 'Sequence Based Macromolecule Sample' },
];

export const allGenericElements = () => {
  let genericElements = [];
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};

  if (MatrixCheck(currentUser.matrix, 'genericElement')) {
    genericElements = UserStore.getState().genericEls || [];
  }
  return genericElements;
}

export const notification = props =>
  NotificationActions.add({
    title: props.title,
    message: props.msg,
    level: props.lvl,
    position: 'tc',
    dismissible: 'button',
    autoDismiss: props.autoDismiss || 5,
    uid: props.uid || uuid.v4(),
  });

export const GenericDSMisType = () => {
  const currentUser =
    (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (MatrixCheck(currentUser.matrix, `generic${Constants.GENERIC_TYPES.DATASET}`)) {
    return (
      <OverlayTrigger
        delayShow={500}
        placement="top"
        overlay={
          <Tooltip id="tooltip">
            Type (Chemical Methods Ontology) has been changed. <br />
            Please review this Dataset content.
          </Tooltip>
        }
      >
        <span className="text-danger">
          <i className="fa fa-exclamation-triangle" />
          &nbsp;
        </span>
      </OverlayTrigger>
    );
  }
  return null;
};

export const renderFlowModal = (generic, isToggle) => {
  let shortLabel = generic.short_label;
  if (!shortLabel) {
    const segmentKlasses =
      (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
    shortLabel = segmentKlasses.filter(s => s.id === generic.segment_klass_id);
    shortLabel = shortLabel.length > 0 ? shortLabel[0].label : '';
  }
  const params = {
    properties_release: cloneDeep(generic.properties_release) || {},
    properties: cloneDeep(generic.properties) || {},
    shortLabel,
    toggle: isToggle,
  };
  UIActions.rerenderGenericWorkflow(params);
};

export const segmentsByKlass = name => {
  const allSegments = UserStore.getState().segmentKlasses || [];
  return filter(
    allSegments,
    se => (se.element_klass && se.element_klass.name) === name
  );
};

export const elementNames = async (all = true, generics = null) => {
  const elnElements = all
    ? allElnElements
    : [];
  try {
    if (generics?.length > 0) return elnElements.concat(generics?.map((el) => el.name));
    const result = await loadEls();
    if (result?.length > 0) return elnElements.concat(result);
    return elnElements;
  } catch (error) {
    console.error('Can not get Element Names:', error);
    return elnElements;
  }
};

export const submit = async (_action, _params) => {
  const [action, params] = [_action, _params];
  let result = {
    title: 'Update template fail',
    lvl: 'error',
    msg: `Update ${params.update} template fail`,
    isSuccess: false,
  };
  try {
    const response = await action[`update${params.update}Template`](params.element);
    if (!response.error) {
      result = {
        title: `Update ${params.update} [${params.element.label}] template`,
        lvl: 'info',
        msg: `Saved successfully (${params.release})`,
        isSuccess: true,
        response,
      };
    } else {
      result = { ...result, msg: response.error };
    }
  } catch (errorMessage) {
    result = { ...result, msg: errorMessage };
  }
  return result;
};
