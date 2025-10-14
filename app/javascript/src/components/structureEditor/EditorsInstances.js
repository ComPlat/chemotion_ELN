import StructureEditor from 'src/models/StructureEditor';
import EditorAttrs from 'src/components/structureEditor/StructureEditorSet';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import loadScripts from 'src/components/structureEditor/loadScripts';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UIFetcher from 'src/fetchers/UIFetcher';

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
      cbLoaded: () => {},
    });
  }
};

const getEditorPropertiesFromUI = async (editorId) => {
  const data = await UIFetcher.initialize();
  if (data && data.structureEditors.editors && data.structureEditors.editors?.[editorId]) {
    return data.structureEditors.editors?.[editorId];
  }
  return null;
};

/**
 * Creates an editor by ID.
 */
export async function getEditorById(editorId, configs = {}, availableEditors = null) {
  const editorAlias = editorId ?? 'ketcher';

  if (editorAlias) {
    let configAlias = configs;
    let available = availableEditors?.[editorAlias] || UIStore.getState().structureEditors?.editors?.[editorAlias];
    if (!available) {
      available = await getEditorPropertiesFromUI(editorAlias);
      configAlias = { editor: editorAlias };
    }
    loadEditor(editorAlias, available.extJs);
    const editorConfigs = {
      ...EditorAttrs[editorAlias],
      ...available,
      ...configAlias,
      id: editorAlias,
    };
    return new StructureEditor(editorConfigs);
  }
  return null;
}

/**
 * Creates all editors based on user configuration and availability.
 */
export async function createEditors(_state = {}) {
  const matriceConfigs = _state.matriceConfigs || UserStore.getState().matriceConfigs || [];
  const availableEditors = UIStore.getState().structureEditors?.editors || {};

  const editorPromises = matriceConfigs.map(({ configs }) => {
    const id = configs.editor;
    return getEditorById(id, configs, availableEditors);
  });

  const resolvedEditors = await Promise.all(editorPromises);

  const editorsMap = resolvedEditors
    .filter(Boolean)
    .reduce((acc, editorInstance) => {
      acc[editorInstance.id] = editorInstance;
      return acc;
    }, {});

  return editorsMap;
}
export const initEditor = async () => {
  const userProfile = UserStore.getState().profile;
  let eId = userProfile?.data?.default_structure_editor;
  if (!eId || eId === 'ketcher2') eId = 'ketcher';
  return getEditorById(eId);
};
