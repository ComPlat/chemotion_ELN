import React, { useContext, useEffect, useState } from 'react';
import {
  Card, Table, Button, Form, Alert
} from 'react-bootstrap';
import { getSnapshot } from 'mobx-state-tree';

import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const UserCounter = () => {
  const { userStore } = useContext(StoreContext);
  const { currentUser } = userStore;
  const [counters, setCounters] = useState({});
  const [klasses, setKlasses] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    GenericElsFetcher.fetchElementKlasses().then((result) => {
      const genericEntities = result && result.klass.filter((u) => u.is_generic === true);
      setKlasses(genericEntities || []);
    });
  }, []);

  // currentUser.counters is a MST map, not a plain object; sync it into local,
  // editable state once per user, converted via getSnapshot() so bracket access
  // and spreading below work as expected.
  const [syncedUserId, setSyncedUserId] = useState(null);
  if (currentUser && currentUser.id !== syncedUserId) {
    setSyncedUserId(currentUser.id);
    setCounters(getSnapshot(currentUser.counters));
  }

  const handleCounterChange = (key, value) => {
    const newCounters = { ...counters };
    newCounters[key] = value;
    setCounters(newCounters);
  };

  const handleUpdate = (type) => {
    UsersFetcher.updateUserCounter({
      type,
      counter: counters[type] || 0,
    })
      .then(() => {
        setSuccessMessage('Settings updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  if (klasses.length === 0) return null;

  const counterBody = klasses
    .filter((k) => k.is_active === true)
    .map((klass) => {
      const counterNum = parseInt((counters && counters[klass.name]) || 0, 10);
      const nextNum = `${currentUser?.initials || ''}-${klass.klass_prefix}${counterNum + 1}`;
      return (
        <tr key={klass.id} className="align-middle">
          <td>{klass.label}</td>
          <td>{klass.klass_prefix}</td>
          <td>
            <Form.Control
              type="number"
              value={counterNum}
              onChange={(e) => handleCounterChange(klass.name, e.target.value)}
              min={0}
            />
          </td>
          <td>{nextNum}</td>
          <td>
            <Button
              variant="primary"
              onClick={() => handleUpdate(klass.name)}
            >
              Update counter
            </Button>
          </td>
        </tr>
      );
    });

  return (
    <Card>
      <Card.Header>
        Element Counter
      </Card.Header>
      <Card.Body>
        <Table bordered responsive>
          <thead>
            <tr>
              <th>Element Label</th>
              <th>Prefix</th>
              <th>Counter starts at</th>
              <th>Next Label</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {counterBody}
          </tbody>
        </Table>
        {successMessage && (
        <Alert variant="success">
          {successMessage}
        </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default observer(UserCounter);
