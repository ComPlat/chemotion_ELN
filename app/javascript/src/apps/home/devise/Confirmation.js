import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Container, Alert, Form, Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import { LinksForDeviseForm } from 'src/components/navigation/NavNewSession';
import { useFormValues, submitAsForm } from 'src/utilities/FormHelper';
import { aviatorNavigationToApp } from 'src/utilities/routesUtils';
import { capitalizeWords } from 'src/utilities/textHelper';

const Confirmation = () => {
  const { userStore } = useContext(StoreContext);
  const { currentRoute, extraRules, deviseMappings } = userStore;

  // A confirmation_token in the URL here means the user landed back on the "resend
  // instructions" form from a bad/expired confirmation link
  const [errors, setErrors] = useState(() => {
    const token = new URLSearchParams(location.search).get('confirmation_token');
    return token ? { confirmation_token: ['is invalid'] } : {};
  });
  const [form, setForm] = useFormValues({
    email: '',
  });

  const handleConfirmationSubmit = async ({ values, url }) => {
    const response = await submitAsForm({
      url, form: values, prefix: 'user', method: 'POST'
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
    const url = '/users/confirmation';
    const values = form;
    const confirmationResult = await handleConfirmationSubmit({ values, url });

    if (confirmationResult.status === 200) {
      userStore.setDeviseErrorMessages(confirmationResult.message);
      aviatorNavigationToApp('/sign_in');
    } else if (confirmationResult.status === 400) {
      setErrors(confirmationResult.message);
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

        <h3 className="mb-3">Resend confirmation instructions</h3>
        <Form className="mb-3" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label column="lg">
              Email
            </Form.Label>
            <Form.Control
              type="text"
              name="email"
              value={form.email}
              onChange={setForm}
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="mb-3">
            Resend confirmation instructions
          </Button>
        </Form>
        {LinksForDeviseForm(currentRoute, extraRules, deviseMappings)}
      </Container>
    </div>
  );
};

export default observer(Confirmation);
