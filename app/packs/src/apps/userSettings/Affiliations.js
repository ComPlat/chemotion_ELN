import React, { useState, useEffect } from 'react';
import { CreatableSelect } from 'src/components/common/Select';
import { Button, Modal, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import moment from 'moment';

import UserSettingsFetcher from 'src/fetchers/UserSettingsFetcher';

function Affiliations({ show, onHide }) {
  const [affiliations, setAffiliations] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [inputError, setInputError] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  const currentEntries = affiliations.filter((entry) => entry.current);

  const getAllAffiliations = () => {
    UserSettingsFetcher.getAllAffiliations()
      .then((data) => {
        setAffiliations(data.map((item) => (
          {
            ...item,
            disabled: true,
            current: item.from !== null && item.to === null
          }
        )));
      });
    setErrorMsg('');
    setInputError({});
  };

  useEffect(() => {
    UserSettingsFetcher.getAutoCompleteSuggestions('countries')
      .then((data) => {
        data.map((item) => {
          if (!countryOptions.map((option) => option.value).includes(item)) {
            setCountryOptions((prevItems) => [...prevItems, { value: item, label: item }]);
          }
        });
        setInputError({});
      });

    UserSettingsFetcher.getAutoCompleteSuggestions('organizations')
      .then((data) => {
        data.map((item) => {
          if (!orgOptions.map((option) => option.value).includes(item)) {
            setOrgOptions((prevItems) => [...prevItems, { value: item, label: item }]);
          }
        });
      });

    UserSettingsFetcher.getAutoCompleteSuggestions('departments')
      .then((data) => {
        data.map((item) => {
          if (!deptOptions.map((option) => option.value).includes(item)) {
            setDeptOptions((prevItems) => [...prevItems, { value: item, label: item }]);
          }
        });
      });

    UserSettingsFetcher.getAutoCompleteSuggestions('groups')
      .then((data) => {
        data.map((item) => {
          if (!groupOptions.map((option) => option.value).includes(item)) {
            setGroupOptions((prevItems) => [...prevItems, { value: item, label: item }]);
          }
        });
      });
    getAllAffiliations();
  }, []);

  const handleCreateOrUpdateAffiliation = (index) => {
    const params = affiliations[index];
    const callFunction = params.id ? UserSettingsFetcher.updateAffiliation : UserSettingsFetcher.createAffiliation;

    callFunction(params)
      .then(() => getAllAffiliations())
      .catch((error) => {
        console.error(error);
      });
  };

  const handleDeleteAffiliation = (index) => {
    const { id } = affiliations[index];
    if (id) {
      UserSettingsFetcher.deleteAffiliation(id)
        .then((result) => {
          if (result.error) {
            console.error(result.error);
            return false;
          }
          getAllAffiliations();
        });
    }
  };

  const onChangeHandler = (index, field, value) => {
    const updatedAffiliations = [...affiliations];
    updatedAffiliations[index][field] = value;
    const newInputErrors = { ...inputError };
    if (field === 'from' && (updatedAffiliations[index].from === null || updatedAffiliations[index].from === '')) {
      newInputErrors[index] = { ...newInputErrors[index], from: true };
      setErrorMsg('From date is Required');
    } else if (field === 'to' && updatedAffiliations[index].from > value) {
      newInputErrors[index] = { ...newInputErrors[index], to: true };
      setErrorMsg('Invalid date');
    } else if (field === 'organization' && !value) {
      newInputErrors[index] = { ...newInputErrors[index], organization: true };
      setErrorMsg('Organization is required');
    } else if (newInputErrors[index]) {
      delete newInputErrors[index][field];
      if (Object.keys(newInputErrors[index]).length === 0) {
        delete newInputErrors[index];
      }
    }
    setInputError(newInputErrors);
    setAffiliations(updatedAffiliations);
  };

  const handleSaveButtonClick = (index) => {
    const updatedAffiliations = [...affiliations];
    const newInputErrors = { ...inputError };

    if (!updatedAffiliations[index].organization) {
      newInputErrors[index] = { ...newInputErrors[index], organization: true };
      setInputError(newInputErrors);
      setErrorMsg('Organization is required');
      return;
    }
    if (!updatedAffiliations[index].from) {
      newInputErrors[index] = { ...newInputErrors[index], from: true };
      setInputError(newInputErrors);
      setErrorMsg('From date is required');
      return;
    }

    if (!newInputErrors[index] || !Object.keys(newInputErrors[index]).length) {
      updatedAffiliations[index].disabled = true;
      setAffiliations(updatedAffiliations);
      handleCreateOrUpdateAffiliation(index);
    }
  };

  return (
    <Modal
      fullscreen
      show={show}
      onHide={onHide}
      backdrop="static"
      centered
    >
      <Modal.Header closeButton onHide={onHide}>
        <Modal.Title>
          <h3>My affiliations </h3>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div>
          <h4 className="fs-5 mb-3"> Current affiliations</h4>
          <div className="d-flex flex-wrap gap-2">
            {currentEntries.map((entry) => (
              <div
                key={entry.id}
                className="border border-gray-300 rounded-2 p-2 shadow-sm mw-40 flex-grow-1"
                style={{ minWidth: '200px', maxWidth: '350px' }}
              >
                <p>
                  <strong className="me-1">Country:</strong>
                  {entry.country}
                </p>
                <p>
                  <strong className="me-1">Organization:</strong>
                  {entry.organization}
                </p>
                <p>
                  <strong className="me-1">Department:</strong>
                  {entry.department}
                </p>
                <p>
                  <strong className="me-1">Group:</strong>
                  {entry.group}
                </p>
                <p>
                  <strong className="me-1">From:</strong>
                  {entry.from}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="d-flex justify-content-end my-1">
          <Button
            variant="primary"
            onClick={() => {
              setAffiliations((prev) => [...prev, {
                country: '',
                organization: '',
                department: '',
                group: '',
                from: '',
                to: '',
                disabled: false,
              }]);
            }}
          >
            Add affiliation
            <i className="fa fa-plus ms-1" />
          </Button>
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Country</th>
              <th>
                Organization
                <span className="text-danger ms-1">*</span>
              </th>
              <th>Department</th>
              <th>Working Group</th>
              <th>
                From
                <span className="text-danger ms-1">*</span>
              </th>
              <th>To</th>
              <th />
            </tr>
          </thead>
          <tbody>

            {affiliations.map((item, index) => (
              <tr key={item.id}>
                <td>
                  {item.disabled ? item.country
                    : (
                      <CreatableSelect
                        isCreatable
                        disabled={item.disabled}
                        placeholder="Select or enter a new option"
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        options={countryOptions}
                        value={item.country || ''}
                        isSearchable
                        isClearable
                        onChange={(choice) => onChangeHandler(index, 'country', !choice ? '' : choice.value)}
                      />
                    )}
                </td>
                <td>
                  {item.disabled ? item.organization
                    : (
                      <>
                        <CreatableSelect
                          required
                          components={{ DropdownIndicator: () => null }}
                          disabled={item.disabled}
                          placeholder="Select or enter a new option"
                          className={inputError[index] && inputError[index].organization ? 'is-invalid' : ''}
                          isCreatable
                          options={orgOptions}
                          value={item.organization}
                          isClearable
                          onChange={(choice) => onChangeHandler(index, 'organization', !choice ? '' : choice.value)}
                        />
                        {inputError[index] && inputError[index].organization && (
                          <div className="invalid-feedback">Organization is required</div>
                        )}
                      </>
                    )}
                </td>
                <td>
                  {item.disabled ? item.department
                    : (
                      <CreatableSelect
                        isCreatable
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        disabled={item.disabled}
                        placeholder="Select or enter a new option"
                        options={deptOptions}
                        value={item.department}
                        isSearchable
                        clearable
                        onChange={(choice) => onChangeHandler(index, 'department', !choice ? '' : choice.value)}
                      />
                    )}
                </td>
                <td>
                  {item.disabled ? item.group
                    : (
                      <CreatableSelect
                        isCreatable
                        placeholder="Select or enter a new option"
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        disabled={item.disabled}
                        allowCreate
                        options={groupOptions}
                        value={item.group}
                        isSearchable
                        closeMenuOnSelect
                        isClearable
                        onChange={(choice) => onChangeHandler(index, 'group', !choice ? '' : choice.value)}
                      />
                    )}
                </td>
                <td>
                  {item.disabled ? item.from
                    : (
                      <>
                        <DatePicker
                          // eslint-disable-next-line no-nested-ternary
                          placeholderText={inputError[index] ? inputError[index].from ? errorMsg : '' : 'Required'}
                          isClearable
                          clearButtonTitle="Clear"
                          // eslint-disable-next-line max-len
                          className={`Select-control ${inputError[index] && inputError[index].from ? 'border-danger' : ''}`}
                          showPopperArrow={false}
                          disabled={item.disabled}
                          showMonthYearPicker
                          dateFormat="yyyy-MM"
                          selected={item.from}
                          onChange={(date) => {
                            onChangeHandler(index, 'from', date ? moment(date).format('YYYY-MM') : null);
                          }}
                        />
                        {inputError[index] && inputError[index].from && (
                          <div className="invalid-feedback">From is required</div>
                        )}
                      </>
                    )}
                </td>
                <td>
                  {item.disabled ? item.to
                    : (
                      <DatePicker
                        placeholderText={inputError[index] && inputError[index].to ? errorMsg : ''}
                        isClearable
                        clearButtonTitle="Clear"
                        className={`Select-control ${inputError[index] && inputError[index].to ? 'border-danger' : ''}`}
                        showPopperArrow={false}
                        disabled={item.disabled}
                        showMonthYearPicker
                        dateFormat="yyyy-MM"
                        selected={inputError[index] && inputError[index].to ? null : item.to}
                        onChange={(date) => onChangeHandler(index, 'to', date ? moment(date).format('YYYY-MM') : date)}
                      />
                    )}
                </td>
                <td>
                  <div className="d-flex justify-content-end">
                    {item.disabled
                      ? (
                        <OverlayTrigger
                          placement="top"
                          overlay={(
                            <Tooltip id="affiliation_edit_tooltip">
                              Edit affiliation
                            </Tooltip>
                          )}
                        >
                          <Button
                            size="sm"
                            variant="primary"
                            className="ms-auto"
                            onClick={() => {
                              const updatedAffiliations = [...affiliations];
                              updatedAffiliations[index].disabled = false;
                              setAffiliations(updatedAffiliations);
                            }}
                          >
                            <i className="fa fa-edit" />
                          </Button>

                        </OverlayTrigger>
                      )
                      : (
                        <OverlayTrigger
                          placement="top"
                          overlay={(
                            <Tooltip id="affiliation_save_tooltip">
                              Save changes
                            </Tooltip>
                          )}
                        >
                          <Button
                            size="sm"
                            variant="warning"
                            className="ms-auto"
                            onClick={() => handleSaveButtonClick(index)}
                          >
                            <i className="fa fa-save" />
                          </Button>
                        </OverlayTrigger>
                      )}
                    <OverlayTrigger
                      placement="top"
                      overlay={(
                        <Tooltip id="affiliation_delete_tooltip">
                          Delete affiliation
                        </Tooltip>
                      )}
                    >
                      <Button
                        className="ms-1"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteAffiliation(index)}
                      >
                        <i className="fa fa-trash-o" />
                      </Button>
                    </OverlayTrigger>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
}

export default Affiliations;
