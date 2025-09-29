import StructureEditor from 'src/models/StructureEditor';
import EditorAttrs from 'src/components/structureEditor/StructureEditorSet';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import loadScripts from 'src/components/structureEditor/loadScripts';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export const notifyError = (message) => {
  NotificationActions.add({
    title: 'Structure Editor error',
    message,
    level: 'error',
    position: 'tc',
    dismissible: 'button',
    autoDismiss: 10,
  });
};

const loadEditor = (editor, scripts) => {
  if (scripts?.length > 0) {
    loadScripts({
      es: scripts,
      id: editor,
      cbError: () => notifyError(
        `The ${editor} failed to initialize! Please contact your system administrator!`
      ),
      cbLoaded: () => { },
    });
  }
};

/**
 * Creates an editor by ID.
 */
export function getEditorById(editorId, configs = {}, availableEditors = null) {
  const editorAlias = editorId ?? 'ketcher';
  if (editorAlias) {
    const available = availableEditors?.[editorAlias] || UIStore.getState().structureEditors?.editors?.[editorAlias];
    if (!available) {
      return null;
    }
    loadEditor(editorAlias, available.extJs);
    return new StructureEditor({
      ...EditorAttrs[editorAlias],
      ...available,
      ...configs,
      id: editorAlias,
    });
  }
  return null;
}

/**
 * Creates all editors based on user configuration and availability.
 */
export function createEditors(_state = {}) {
  const matriceConfigs = _state.matriceConfigs || UserStore.getState().matriceConfigs || [];
  const availableEditors = UIStore.getState().structureEditors?.editors || {};
  const grantEditors = matriceConfigs
    .map(({ configs }) => {
      const id = configs.editor;
      return getEditorById(id, configs, availableEditors);
    })
    .filter(Boolean);

  return grantEditors.reduce((acc, editorInstance) => {
    acc[editorInstance.id] = editorInstance;
    return acc;
  }, {});
}

export const initEditor = () => {
  const userProfile = UserStore.getState().profile;
  let eId = userProfile?.data?.default_structure_editor;
  if (!eId || eId === 'ketcher2') eId = 'ketcher';
  return getEditorById(eId);
};
