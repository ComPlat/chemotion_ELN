import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Container, Alert, Form, Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import { LinksForDeviseForm } from 'src/components/navigation/NavNewSession';
import { useFormValues, submitAsForm } from 'src/utilities/FormHelper';
import { aviatorNavigationToApp } from 'src/utilities/routesUtils';
import { capitalizeWords } from 'src/utilities/textHelper';

const Password = () => {
  const { userStore, notifications } = useContext(StoreContext);
  const { currentRoute, extraRules, deviseMappings } = userStore;

  const tokenParams = new URLSearchParams(location.search);
  const token = tokenParams.get('reset_password_token');

  const [errors, setErrors] = useState({});
  const [form, setForm] = useFormValues({
    reset_password_token: token, // aus params füllen
    password: '',
    password_confirmation: '',
  });

  const minimumPasswordLength = deviseMappings?.minimum_password_length || '';

  const handlePasswordnSubmit = async ({ values, url }) => {
    const response = await submitAsForm({
      url, form: values, prefix: 'user', method: 'PUT'
    });

    return {
      status: response.status,
      ...(await response.json())
    };
  };

  useEffect(() => {
    userStore.fetchDeviseMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const url = '/users/password';
    const values = form;
    const confirmationResult = await handlePasswordnSubmit({ values, url });
    const { status, message, token, role } = confirmationResult;

    if (status === 200) {
      if (token) {
        userStore.setAuthToken(token);
        userStore.setRole(role);
        userStore.setDeviseErrorMessages('');
        notifications.add({
          message,
          level: 'info',
        });
        aviatorNavigationToApp('/mydb/collection/all');
      } else {
        userStore.setDeviseErrorMessages(message);
        aviatorNavigationToApp('/sign_in');
      }
    } else if (status === 400) {
      setErrors(message);
    }
  }, [form, userStore]);

  if (!deviseMappings) { return null; }

  return (
    <div>
      <BaseNavigation />
      <Container className="mt-5">
        {Object.keys(errors).length >= 1 && (
          <Alert variant="warning">
            {
              Object.entries(errors).map(([key, value]) => (
                  <>
                    {capitalizeWords(key)} {value.join(', ')}
                    <br />
                  </>
                ))
            }
          </Alert>
        )}

        <h3 className="mb-3">Change your password</h3>
        <Form className="mb-3" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label column="lg">New Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              autoComplete="off"
              value={form.password}
              onChange={setForm}
            />
            {deviseMappings.validatable && minimumPasswordLength && errors?.password && (
              <Form.Text>
                {`(${minimumPasswordLength} characters minimum)`}
              </Form.Text>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label column="lg">Confirm new password</Form.Label>
            <Form.Control
              type="password"
              name="password_confirmation"
              autoComplete="off"
              value={form.password_confirmation}
              onChange={setForm}
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="mb-3">
            Change my password
          </Button>
        </Form>
        {LinksForDeviseForm(currentRoute, extraRules, deviseMappings)}
      </Container>
    </div>
  );
};

export default observer(Password);
