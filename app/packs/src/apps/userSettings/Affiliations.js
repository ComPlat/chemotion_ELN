import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/lib/Creatable';
import { Button, Modal, Table } from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import uuid from 'uuid';

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
    console.log(id);
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
      setErrorMsg('Required');
    } else if (field === 'to' && updatedAffiliations[index].from > value) {
      newInputErrors[index] = { ...newInputErrors[index], to: true };
      setErrorMsg('Invalid date');
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
    if (!updatedAffiliations[index].from) {
      newInputErrors[index] = { ...newInputErrors[index], from: true };
      setInputError(newInputErrors);
      setErrorMsg('Required');
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
      bsSize="lg"
      dialogClassName="importChemDrawModal"
      show={show}
      onHide={onHide}
      backdrop="static"
    >
      <Modal.Header closeButton onHide={onHide}>
        <Modal.Title>
          <h3>My affiliations </h3>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="current-container">
          <h4 className="align-title"> Current affiliations</h4>
          <div className="entry-container">
            {currentEntries.map((entry) => (
              <div key={uuid.v4()} className="entry-box">
                <p>
                  <strong>Country:</strong>
                  {' '}
                  {entry.country}
                </p>
                <p>
                  <strong>Organization:</strong>
                  {' '}
                  {entry.organization}
                </p>
                <p>
                  <strong>Department:</strong>
                  {' '}
                  {entry.department}
                </p>
                <p>
                  <strong>Group:</strong>
                  {' '}
                  {entry.group}
                </p>
                <p>
                  <strong>From:</strong>
                  {' '}
                  {entry.from}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '1rem'
        }}
        >
          <Button
            bsStyle="primary"
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
            Add affiliation &nbsp;
            <i className="fa fa-plus" />
          </Button>
        </div>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Country</th>
              <th>Organization</th>
              <th>Department</th>
              <th>Working Group</th>
              <th>From</th>
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
                      <CreatableSelect
                        required
                        components={{ DropdownIndicator: () => null }}
                        disabled={item.disabled}
                        placeholder="Select or enter a new option"
                        isCreatable
                        options={orgOptions}
                        value={item.organization}
                        isClearable
                        onChange={(choice) => onChangeHandler(index, 'organization', !choice ? '' : choice.value)}
                      />
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
                  <DatePicker
                    placeholderText={inputError[index] && inputError[index].from ? errorMsg : ''}
                    isClearable
                    clearButtonTitle="Clear"
                    className={inputError[index] && inputError[index].from ? 'error-control' : ''}
                    showPopperArrow={false}
                    disabled={item.disabled}
		    showMonthYearPicker
                    dateFormat="yyyy-MM"
                    value={item.from}
                    onChange={(date) => onChangeHandler(index, 'from', moment(date).format('YYYY-MM'))}
                  />
                </td>
                <td>
                  <DatePicker
                    placeholderText={inputError[index] && inputError[index].to ? errorMsg : ''}
                    isClearable
                    clearButtonTitle="Clear"
                    className={inputError[index] && inputError[index].to ? 'error-control' : ''}
                    showPopperArrow={false}
                    disabled={item.disabled}
                	    showMonthYearPicker
                    dateFormat="yyyy-MM"
                  value={item.to}
                    onChange={(date) => onChangeHandler(index, 'to', date ? moment(date).format('YYYY-MM') : date)}
                  />
                </td>
                <td>
                  <div className="pull-right">
                    {item.disabled
                      ? (
                        <Button
                          bsSize="small"
                          bsStyle="primary"
                          onClick={() => {
                            const updatedAffiliations = [...affiliations];
                            updatedAffiliations[index].disabled = false;
                            setAffiliations(updatedAffiliations);
                          }}
                        >
                          <i className="fa fa-edit" />
                        </Button>
                      )
                      : (
                        <Button
                          bsSize="small"
                          bsStyle="success"
                          onClick={() => handleSaveButtonClick(index)}
                        >
                          <i className="fa fa-save" />
                        </Button>
                      )}
                    <Button
                      style={{ marginLeft: '1rem' }}
                      bsSize="small"
                      bsStyle="danger"
                      onClick={() => handleDeleteAffiliation(index)}
                    >
                      <i className="fa fa-trash-o" />
                    </Button>
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
