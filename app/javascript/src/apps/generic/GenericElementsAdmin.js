import React, { useContext, useEffect, useState } from 'react';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import GenericKlassFetcher from 'src/fetchers/GenericKlassFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { GenericMenu, Unauthorized } from 'src/apps/generic/GenericUtils';
import { notification, submit } from 'src/apps/generic/Utils';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

const FN_ID = 'GenericElements';

const GenericElementsAdmin = () => {
  const { userStore } = useContext(StoreContext);
  const { currentUser } = userStore;
  const [revisions, setRevisions] = useState([]);

  useEffect(() => {
    LoadingActions.start();

    if (!currentUser) {
      userStore.fetchCurrentUser();
    }

    userStore.fetchGenericElKlasses();
    LoadingActions.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchElementKlasses = () => {
    LoadingActions.start();
    userStore.fetchGenericElKlasses();
    LoadingActions.stop();
  };

  const handleCreateKlass = (response) => {
    const { element, notify } = response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    element.is_generic = true;
    LoadingActions.start();
    GenericElsFetcher.createElementKlass(element)
      .then((result) => {
        if (result.error) {
          notification({
            title: `Element [${element.name}]`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `Element [${element.name}]`,
            lvl: 'info',
            msg: 'Created successfully',
          });
          fetchElementKlasses();
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleUpdateKlass = (response) => {
    const { element, notify } = response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    LoadingActions.start();
    GenericElsFetcher.updateElementKlass(element)
      .then((result) => {
        if (result.error) {
          notification({
            title: `Element [${element.name}]`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `Element [${element.name}]`,
            lvl: 'info',
            msg: 'Updated successfully',
          });
          fetchElementKlasses();
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleActivateKlass = (e) => {
    const act = e.is_active ? 'De-activate' : 'Activate';
    LoadingActions.start();
    GenericElsFetcher.deActivateKlass({
      id: e.id,
      is_active: !e.is_active,
      klass: 'ElementKlass',
    })
      .then((result) => {
        if (result.error) {
          notification({
            title: `${act} Element failed`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `${act} Element [${result.name}] successfully`,
            lvl: 'info',
            msg: `Element is ${act.toLowerCase()} now`,
          });
          fetchElementKlasses();
        }
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleDeleteKlass = (element) => {
    if (element.is_active) {
      notification({
        title: 'Delete failed',
        lvl: 'error',
        msg: `You cannot delete an active element [${element.name}]. Please make it [inactive] first.`,
      });
      return;
    }
    // eslint-disable-next-line no-restricted-globals, no-alert
    const confirmed = confirm('Are you sure you want to delete this record?');
    if (confirmed) {
      GenericElsFetcher.deleteKlass({
        id: element.id,
        klass: 'ElementKlass',
      })
        .then((result) => {
          if (result.error) {
            notification({
              title: `Element [${element.name}]`,
              lvl: 'error',
              msg: result.error,
            });
          } else {
            notification({
              title: `Element [${element.name}]`,
              lvl: 'info',
              msg: 'Deleted successfully',
            });
            fetchElementKlasses();
          }
        })
        .finally(() => {
          LoadingActions.stop();
        });
    }
  };

  const handleDownloadKlass = (e) => {
    LoadingActions.start();
    GenericKlassFetcher.downloadKlass(e.id, 'ElementKlass')
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleUploadKlass = (response) => {
    const { element, notify } = response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    LoadingActions.start();
    GenericElsFetcher.uploadKlass(element)
      .then((result) => {
        if (result?.status === 'success') {
          fetchElementKlasses();
        }
        notification({
          title: 'Upload Element',
          lvl: result?.status || 'error',
          msg: result?.message || 'Unknown error',
        });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const fetchRevisions = (element) => {
    console.log(element);
    if (element?.id) {
      GenericElsFetcher.fetchKlassRevisions(element.id, 'ElementKlass').then(
        (result) => {
          // eslint-disable-next-line prefer-object-spread
          let curr = Object.assign({}, { ...element.properties_template });
          // eslint-disable-next-line prefer-object-spread
          curr = Object.assign(
            {},
            { properties_release: curr },
            { uuid: 'current' }
          );
          setRevisions([].concat(curr, result.revisions));
        }
      );
    }
  };

  const delRevision = (params) => {
    const { id, data, uuid } = params;
    LoadingActions.start();
    GenericElsFetcher.deleteKlassRevision({
      id,
      klass_id: data?.id,
      klass: 'ElementKlass',
    })
      .then((response) => {
        if (response.error) {
          notification({
            title: 'Delete Revision',
            lvl: 'error',
            msg: response.error,
          });
        } else {
          fetchRevisions(data);
          notification({
            title: `Revision [${uuid}] deleted successfully`,
            lvl: 'info',
            msg: 'Deleted successfully',
          });
        }
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleSubmit = async (element, release = 'draft') => {
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericElsFetcher, {
      update: Constants.GENERIC_TYPES.ELEMENT,
      element,
      release,
    });
    if (result.isSuccess) {
      notification(result);
      fetchElementKlasses();
      LoadingActions.stop();
    } else {
      notification(result);
    }
    LoadingActions.stop();
  };

  const renderGrid = () => {
    const elements = orderBy(
      userStore.genericElementKlassesArray(''),
      ['is_active', 'name', 'klass_prefix'],
      ['desc', 'asc', 'asc']
    );
    return (
      <Designer
        fnCopy={handleCreateKlass}
        fnCreate={handleCreateKlass}
        fnSubmit={handleSubmit}
        fnActive={handleActivateKlass}
        fnDelete={handleDeleteKlass}
        fnUpdate={handleUpdateKlass}
        fnUpload={handleUploadKlass}
        fnDownload={handleDownloadKlass}
        fnRefresh={fetchElementKlasses}
        preview={{
          fnDelRevisions: delRevision,
          fnRevisions: fetchRevisions,
          revisions,
        }}
        genericType={Constants.GENERIC_TYPES.ELEMENT}
        gridData={elements || []}
        refSource={{ currentUser }}
      />
    );
  };

  if (currentUser && !currentUser.generic_admin?.elements) {
    return <Unauthorized userName={currentUser?.name} text={FN_ID} />;
  }

  return (
    <div className="vw-90 my-auto mx-auto">
      <GenericMenu userName={currentUser?.name} text={FN_ID} />
      <div className="mt-3">
        {renderGrid()}
      </div>
      <Notifications />
      <LoadingModal />
    </div>
  );
};

export default observer(GenericElementsAdmin);
