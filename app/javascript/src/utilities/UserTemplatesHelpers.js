import ProfilesFetcher from 'src/fetchers/ProfilesFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';

const key = 'ketcher-tmpls';

const createAddAttachmentidToNewUserTemplate = async (newValue, newItem, deleteIdx) => {
  const res = await ProfilesFetcher.uploadUserTemplates({
    content: JSON.stringify(newItem),
  }).catch((err) => console.error('err in create'));
  const attachment_id = res?.template_details?.filename;
  newItem.props.path = attachment_id;
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
    (item) => JSON.parse(item.struct).header.moleculeName
  );
  for (let i = 0; i < oldValue.length; i++) {
    const localItem = JSON.parse(oldValue[i].struct);
    const exists = listOfLocalNames.indexOf(localItem.header.moleculeName) !== -1;
    if (!exists) {
      await ProfilesFetcher.deleteUserTemplate({
        path: oldValue[i].props.path,
      }).catch(() => console.error('ISSUE WITH DELETE', localItem?.props?.path));
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
      if (newValue.length > oldValue.length) { // when a new template is added
        const newItem = newValue[newValue.length - 1];
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

export default onEventListen;
