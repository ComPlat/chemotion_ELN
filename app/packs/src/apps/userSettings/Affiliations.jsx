import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/lib/Creatable';
import { Button, Modal, Table } from 'react-bootstrap';
import DatePicker from 'react-datepicker';

import UserSettingsFetcher from '../../fetchers/UserSettingsFetcher';
import moment from 'moment';


function Affiliations({ show, onHide }) {

  const [affiliations, setAffiliations] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    UserSettingsFetcher.getAutoCompleteSuggestions('countries')
      .then((data) => {
        data.map((item) => {
          if (!countryOptions.map(option => option.value).includes(item)) {
            setCountryOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });
      });

    UserSettingsFetcher.getAutoCompleteSuggestions('organizations')
      .then((data) => {
        data.map((item) => {
          if (!orgOptions.map(option => option.value).includes(item)) {
            setOrgOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });

      });

    UserSettingsFetcher.getAutoCompleteSuggestions('departments')
      .then((data) => {
        data.map((item) => {
          if (!deptOptions.map(option => option.value).includes(item)) {
            setDeptOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });

      });

    UserSettingsFetcher.getAutoCompleteSuggestions('groups')
      .then((data) => {
        data.map((item) => {
          if (!groupOptions.map(option => option.value).includes(item)) {
            setGroupOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });

      });
    getAllAffiliations();
  }, []);

  const getAllAffiliations = () => {
    UserSettingsFetcher.getAllAffiliations()
      .then((data) => {
        setAffiliations(data.map(item => (
          {
            ...item,
            disabled: true
          }
        )));
      });
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

  const handleDeleteAffiliation = (id) => {
    UserSettingsFetcher.deleteAffiliation(id)
      .then((result) => {
        if (result.error) {
          console.error(result.error);
          return false;
        }
        setShowAlert(true);
        getAllAffiliations();
      }
      );
  };

  return (
    <Modal
      bsSize='lg'
      dialogClassName="importChemDrawModal"
      show={show}
      onHide={onHide}
      backdrop="static" >
      <Modal.Header closeButton onHide={onHide} >
        <Modal.Title>My past and current affiliations</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <Button
              bsStyle='primary'
              onClick={() => {
                setAffiliations(prev => [...prev, {
                  country: '',
                  organization: '',
                  department: '',
                  group: '',
                  from: '',
                  to: '',
                  disabled: false,
                }]);
              }} >
              Add affiliation &nbsp; <i className="fa fa-plus" />
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {affiliations.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    {item.disabled ? item.country :

                      <CreatableSelect
                        isCreatable
                        disabled={item.disabled}
                        placeholder='Select or enter a new option'
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        options={countryOptions}
                        value={item.country || ''}
                        isSearchable
                        isClearable
                        onChange={(choice) => {
                          const updatedAffiliations = [...affiliations];
                          updatedAffiliations[index].country = !choice ? '' : choice.value;
                          setAffiliations(updatedAffiliations);
                        }} />}
                  </td>
                  <td>
                    {item.disabled ? item.organization :
                      <CreatableSelect
                        components={{ DropdownIndicator: () => null }}
                        disabled={item.disabled}
                        placeholder='Select or enter a new option'
                        isCreatable
                        options={orgOptions}
                        value={item.organization}
                        isClearable
                        onChange={(choice) => {
                          const updatedAffiliations = [...affiliations];
                          updatedAffiliations[index].organization = !choice ? '' : choice.value;
                          setAffiliations(updatedAffiliations);
                        }} />}
                  </td>
                  <td>
                    {item.disabled ? item.department :
                      <CreatableSelect
                        isCreatable
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        disabled={item.disabled}
                        placeholder='Select or enter a new option'
                        options={deptOptions}
                        value={item.department}
                        isSearchable
                        clearable={true}
                        onChange={(choice) => {
                          const updatedAffiliations = [...affiliations];
                          updatedAffiliations[index].department = !choice ? '' : choice.value;
                          setAffiliations(updatedAffiliations);
                        }} />}
                  </td>
                  <td>
                    {item.disabled ? item.group :
                      <CreatableSelect
                        isCreatable
                        placeholder='Select or enter a new option'
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        disabled={item.disabled}
                        allowCreate={true}
                        options={groupOptions}
                        value={item.group}
                        isSearchable
                        closeMenuOnSelect
                        isClearable
                        onChange={(choice) => {
                          const updatedAffiliations = [...affiliations];
                          updatedAffiliations[index].group = !choice ? '' : choice.value;
                          setAffiliations(updatedAffiliations);
                        }} />}
                  </td>
                  <td>
                    <DatePicker
                      disabled={item.disabled}
                      clearIcon={null}
                      value={item.from}
                      format="YYYY-MM-DD"
                      onChange={(date) => {
                        const updatedAffiliations = [...affiliations];
                        updatedAffiliations[index].from = moment(date).format('YYYY-MM-DD');
                        setAffiliations(updatedAffiliations);
                      }}
                    />
                  </td>
                  <td>
                    <DatePicker
                      disabled={item.disabled}
                      clearIcon={null}
                      value={item.to}
                      format="YYYY-MM-DD"
                      onChange={(date) => {
                        const updatedAffiliations = [...affiliations];
                        updatedAffiliations[index].to = moment(date).format('YYYY-MM-DD');
                        setAffiliations(updatedAffiliations);
                      }}
                    />
                  </td>
                  <td>
                    {item.disabled ?
                      <Button
                        bsSize='small'
                        bsStyle='primary'
                        onClick={() => {
                          const updatedAffiliations = [...affiliations];
                          updatedAffiliations[index].disabled = false;
                          setAffiliations(updatedAffiliations);
                        }}
                      >
                        <i className="fa fa-edit" />
                      </Button>
                      :
                      <Button
                        bsSize='small'
                        bsStyle='success'
                        onClick={() => {
                          const updatedAffiliations = [...affiliations];
                          updatedAffiliations[index].disabled = true;
                          setAffiliations(updatedAffiliations);
                          handleCreateOrUpdateAffiliation(index);

                        }}
                      >
                        <i className="fa fa-save" />
                      </Button>
                    }
                    <Button
                      style={{ marginLeft: '1rem' }}
                      bsSize='small'
                      bsStyle="danger"
                      onClick={() => handleDeleteAffiliation(item.id)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

        </>
      </Modal.Body>
    </Modal >
  );

};

export default Affiliations;
