import ProfilesFetcher from 'src/fetchers/ProfilesFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { three_parts_patten } from './Ketcher2SurfaceChemistryUtils';
const key = 'ketcher-tmpls';

const createAddAttachmentidToNewUserTemplate = async (newValue, newItem, deleteIdx) => {
  const res = await ProfilesFetcher.uploadUserTemplates({
    content: JSON.stringify(newItem),
  }).catch(err => console.log("err in create"));
  const attachment_id = res?.template_details?.filename;
  newItem['props']['path'] = attachment_id;
  newValue[newValue.length - 1] = newItem;
  if (deleteIdx) newValue.splice(deleteIdx, 1);
  window.removeEventListener('storage', null);
  localStorage.setItem(key, JSON.stringify(newValue));
};

const removeUserTemplate = async (listOfLocalid, oldValue) => {
  for (let i = 0; i < oldValue.length; i++) {
    const localItem = oldValue[i];
    const itemIndexShouldBeRemoved = listOfLocalid.indexOf(
      localItem.props.path
    );
    if (itemIndexShouldBeRemoved === -1) {
      ProfilesFetcher.deleteUserTemplate({
        path: localItem?.props.path,
      });
      break;
    }
  }
};

const updateUserTemplateDetails = async (oldValue, newValue) => {
  const listOfLocalNames = newValue.map(
    (item) => JSON.parse(item.struct)?.header?.moleculeName
  );
  for (let i = 0; i < oldValue.length; i++) {
    const localItem = JSON.parse(oldValue[i].struct);
    const exists = listOfLocalNames.indexOf(localItem?.header?.moleculeName) !== -1;
    if (!exists) {
      await ProfilesFetcher.deleteUserTemplate({
        path: oldValue[i].props.path,
      }).catch(() =>
        console.log('ISSUE WITH DELETE', localItem?.props?.path)
      );
      createAddAttachmentidToNewUserTemplate(newValue, newValue[i], i);
      break;
    }
  }
};

const onEventListen = async (event) => {
  let { newValue, oldValue } = event;
  if (newValue && oldValue && newValue.length && oldValue.length) {
    newValue = JSON.parse(newValue);
    oldValue = JSON.parse(oldValue);
    if (event.key === key) { // matching key && deleteAllowed
      newValue = await sanitizeTemplateAlias(newValue);
      if (newValue.length > oldValue.length) { // when a new template is added
        let newItem = newValue[newValue.length - 1];
        createAddAttachmentidToNewUserTemplate(newValue, newItem);
      } else if (newValue.length < oldValue.length) { // when a template is deleted
        const listOfLocalid = newValue.map((item) => item.props.path);
        removeUserTemplate(listOfLocalid, oldValue);
      } else if (newValue.length == oldValue.length) { // when a template is update atom id, bond id
        updateUserTemplateDetails(oldValue, newValue);
      }
    } else if (event.key === 'ketcher-opts') {
      UsersFetcher.updateUserKetcher2Options(event.newValue);
    }
  }
};


const sanitizeTemplateAlias = async (newValue) => {
  for (let i = 0; i < newValue.length; i++) {
    let item = newValue[i];
    item.struct = JSON.parse(item.struct);
    let _struct = item.struct;
    const allNodes = Object.keys(_struct);
    for (let n = 0; n < allNodes.length; n++) {
      const item_mol = allNodes[n];
      if (/^mol.*/.test(item_mol)) {
        const atoms = _struct[item_mol].atoms;
        for (let j = 0; j < atoms.length; j++) {
          const atom = atoms[j];
          if (three_parts_patten.test(atom.alias)) {
            const splits = atom.alias.split("_");
            _struct[item_mol].atoms[j].alias = `t_${splits[1]}`;
            console.log(_struct[item_mol].atoms[j].alias, "ALIASSSSS");
          }
        }
      }
      item.struct = JSON.stringify({ struct: _struct }, null, 4);
      newValue[i] = item;
    }
  }
  console.log({ newValue });
  return newValue;
};

export default onEventListen;