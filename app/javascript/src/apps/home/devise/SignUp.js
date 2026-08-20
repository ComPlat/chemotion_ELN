import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Container, Alert, Form, Button } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import BaseNavigation from 'src/components/navigation/BaseNavigation';
import { LinksForDeviseForm } from 'src/components/navigation/NavNewSession';
import { useFormValues, submitAsForm } from 'src/utilities/FormHelper';
import { aviatorNavigationToApp } from 'src/utilities/routesUtils';
import { capitalizeWords } from 'src/utilities/textHelper';

const SignUp = () => {
  const { userStore } = useContext(StoreContext);
  const { currentRoute, extraRules, deviseMappings } = userStore;

  const [errors, setErrors] = useState({});
  const [form, setForm] = useFormValues({
    email: '',
    password: '',
    password_confirmation: '',
    first_name: '',
    last_name: '',
    name_abbreviation: '',
    provider: '',
    uid: '',
    affiliations_attributes: [{
      country: '',
      organization: '',
      department: '',
      group: '',
    }],
  });

  const passwordRequired = userStore.role !== 'Guest';
  const minimumPasswordLength = deviseMappings?.minimum_password_length || '';

  useEffect(() => {
    userStore.fetchOmniauthProviders();
    userStore.fetchDeviseMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegistrationSubmit = async ({ values, url }) => {
    const response = await submitAsForm({
      url, form: values, prefix: 'user', method: 'POST'
    });

    return {
      status: response.status,
      ...(await response.json())
    };
  };

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const url = '/users';
    const values = form;
    const registrationResult = await handleRegistrationSubmit({ values, url });

    if (registrationResult.status === 200) {
      userStore.setAuthToken(registrationResult.token);
      userStore.setRole(registrationResult.role);
      userStore.setDeviseErrorMessages('');
      aviatorNavigationToApp('/mydb/collection/all');
    } else if (registrationResult.status === 400) {
      setForm({ password: '', password_confirmation: '' });
      setErrors(registrationResult.error_messages);
    } else if (registrationResult.status === 202) {
      userStore.setDeviseErrorMessages(registrationResult.message);
      aviatorNavigationToApp('/sign_in');
    }
  }, [form, setForm, userStore]);

  const changeAffiliateValue = (key, e) => {
    const affiliations = [...form.affiliations_attributes];
    affiliations[0] = { ...affiliations[0], [key]: e.target.value };
    setForm('affiliations_attributes', affiliations);
  };

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

        {deviseMappings.omniauthable && (
          <div id="LoginOptions" className="mb-3"></div>
        )}

        <h3 className="mb-3">Sign up</h3>
        <Form className="mb-3" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label column="lg">
              Email *
            </Form.Label>
            <Form.Control
              type="text"
              name="email"
              required={true}
              disabled={passwordRequired}
              value={form.email}
              onChange={setForm}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label column="lg">Password *</Form.Label>
            <Form.Control
              type="password"
              name="password"
              required={true}
              autoComplete="off"
              disabled={passwordRequired}
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
            <Form.Label column="lg">Password confirmation *</Form.Label>
            <Form.Control
              type="password"
              name="password_confirmation"
              required={true}
              autoComplete="off"
              disabled={passwordRequired}
              value={form.password_confirmation}
              onChange={setForm}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label column="lg">First name *</Form.Label>
            <Form.Control
              type="text"
              name="first_name"
              required={true}
              disabled={passwordRequired}
              value={form.first_name}
              onChange={setForm}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label column="lg">Last name *</Form.Label>
            <Form.Control
              type="text"
              name="last_name"
              required={true}
              disabled={passwordRequired}
              value={form.last_name}
              onChange={setForm}
            />
          </Form.Group>

          <Form.Group className="mb-4">
            <Form.Label column="lg">Name Abbreviation <i>(Kürzel)</i> *</Form.Label>
            <Form.Control
              type="text"
              name="name_abbreviation"
              required={true}
              value={form.name_abbreviation}
              onChange={setForm}
            />
          </Form.Group>

          <hr />

          <Form.Group className="mb-3">
            <Form.Label column="lg">Country</Form.Label>
            <Form.Control
              type="text"
              name="country"
              value={form.affiliations_attributes[0].country}
              onChange={(e) => changeAffiliateValue('country', e)}
              id="country-select"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label column="lg">Organization *</Form.Label>
            <Form.Control
              type="text"
              name="organization"
              required={true}
              value={form.affiliations_attributes[0].organization}
              onChange={(e) => changeAffiliateValue('organization', e)}
              id="organization-select"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label column="lg">Department</Form.Label>
            <Form.Control
              type="text"
              name="department"
              value={form.affiliations_attributes[0].department}
              onChange={(e) => changeAffiliateValue('department', e)}
              id="department-select"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label column="lg">Working group</Form.Label>
            <Form.Control
              type="text"
              name="group"
              value={form.affiliations_attributes[0].group}
              onChange={(e) => changeAffiliateValue('group', e)}
              id="group-select"
            />
          </Form.Group>

          <Button variant="primary" type="submit" className="mb-3">
            Sign up
          </Button>
        </Form>
        {LinksForDeviseForm(currentRoute, extraRules, deviseMappings)}
      </Container>
    </div>
  );
};

export default observer(SignUp);
