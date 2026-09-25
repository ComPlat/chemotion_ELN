/* eslint-disable prefer-object-spread */
import React, { useContext, useEffect, useState } from 'react';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import GenericDSsFetcher from 'src/fetchers/GenericDSsFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { GenericMenu, Unauthorized } from 'src/apps/generic/GenericUtils';
import { notification, submit } from 'src/apps/generic/Utils';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

const FN_ID = 'GenericDatasets';

const GenericDatasetsAdmin = () => {
  const { userStore } = useContext(StoreContext);
  const { currentUser, dsAdminKlasses } = userStore;

  const [show, setShow] = useState({ tab: '', modal: '' });
  const [revisions, setRevisions] = useState([]);

  useEffect(() => {
    LoadingActions.start();

    if (!currentUser) {
      userStore.fetchCurrentUser();
    }

    userStore.fetchGenericElKlasses();

    if (dsAdminKlasses.length < 1) {
      userStore.fetchAdminDatasetKlasses(true);
    }
    LoadingActions.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSegmentKlasses = () => {
    LoadingActions.start();
    userStore.fetchDatasetKlasses(true);
    LoadingActions.stop();
  };

  const getShowState = (att, val) => ({ ...show, [att]: val });

  const handleShowState = (att, val, cb = () => {}) => {
    setShow(getShowState(att, val));
    cb;
  };

  const closeModal = (cb = () => {}) => {
    handleShowState('modal', '', cb);
  };

  const handleActivateKlass = (e) => {
    const act = e.is_active ? 'De-activate' : 'Activate';
    GenericDSsFetcher.deActivateKlass({
      id: e.id,
      is_active: !e.is_active,
      klass: 'DatasetKlass',
    })
      .then((result) => {
        if (result.error) {
          notification({
            title: `${act} Dataset fail`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `${act} Dataset successfully`,
            lvl: 'info',
            msg: `${e.label} is ${act.toLowerCase()} now`,
          });
          closeModal(fetchSegmentKlasses());
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const handleSubmit = async(element, release = 'draft') => {
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericDSsFetcher, { update: Constants.GENERIC_TYPES.DATASET, element, release });
    if (result.isSuccess) {
      notification(result);
      fetchSegmentKlasses();
      LoadingActions.stop();
    } else {
      notification(result);
    }
    LoadingActions.stop();
  };

  const fetchRevisions = (element) => {
    if (element?.id) {
      GenericDSsFetcher.fetchKlassRevisions(element.id, 'DatasetKlass').then(
        (result) => {
          let curr = Object.assign({}, { ...element.properties_template });
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
    GenericDSsFetcher.deleteKlassRevision({
      id,
      klass_id: data?.id,
      klass: 'DatasetKlass',
    }).then((response) => {
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
    });
  };

  const renderGrid = () => {
    const elements = orderBy(dsAdminKlasses, ['is_active', 'label'], ['desc', 'asc']);
    return (
      <Designer
        fnCopy={() => {}}
        fnCreate={() => {}}
        fnSubmit={handleSubmit}
        fnActive={handleActivateKlass}
        fnDerive={() => {}}
        fnUpdate={() => {}}
        fnRefresh={fetchSegmentKlasses}
        preview={{
          fnDelRevisions:delRevision,
          fnRevisions: fetchRevisions,
          revisions,
        }}
        genericType={Constants.GENERIC_TYPES.DATASET}
        gridData={elements}
        klasses={userStore.genericElementKlassesArray('datasetAdmin')}
        refSource={{ currentUser }}
      />
    );
  };

  if (currentUser && !currentUser.generic_admin?.datasets) {
    return <Unauthorized userName={currentUser.name} text={FN_ID} />;
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

export default observer(GenericDatasetsAdmin);
