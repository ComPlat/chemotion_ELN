import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AsyncSelect } from 'src/components/common/Select';
import UserSettingsFetcher from 'src/fetchers/UserSettingsFetcher';

function OrganizationSelect({
  value, onChange, isInvalid, country,
}) {
  const [localOrgs, setLocalOrgs] = useState([]);

  useEffect(() => {
    UserSettingsFetcher.getLocalOrganizations().then((orgs) => setLocalOrgs(orgs));
  }, []);

  const loadOptions = (inputValue) => {
    if (!inputValue || inputValue.length < 2) return Promise.resolve([]);

    return UserSettingsFetcher.searchRorOrganizations(inputValue, country).then((results) => {
      const rorResults = results.filter((r) => r.label);
      const rorNames = new Set(rorResults.map((r) => r.label.toLowerCase()));

      const localMatches = localOrgs
        .filter((org) => org.toLowerCase().includes(inputValue.toLowerCase()) && !rorNames.has(org.toLowerCase()))
        .map((org) => ({ value: org, label: org }));

      const groups = [];
      if (rorResults.length > 0) groups.push({ label: 'ROR', options: rorResults });
      if (localMatches.length > 0) groups.push({ label: 'From registry', options: localMatches });
      return groups.length > 0 ? groups : [];
    });
  };

  return (
    <>
      <AsyncSelect
        isClearable
        placeholder="Search organization..."
        loadOptions={loadOptions}
        value={value}
        onChange={onChange}
        className={isInvalid ? 'is-invalid' : ''}
        noOptionsMessage={({ inputValue }) => (
          inputValue.length < 2 ? 'Type at least 2 characters' : 'No organizations found'
        )}
        styles={{ menu: (base) => ({ ...base, width: '100%', minWidth: 'unset' }) }}
      />
      {isInvalid && <div className="invalid-feedback">Organization is required</div>}
    </>
  );
}

OrganizationSelect.propTypes = {
  value: PropTypes.shape({ value: PropTypes.string, label: PropTypes.string }),
  onChange: PropTypes.func.isRequired,
  isInvalid: PropTypes.bool,
  country: PropTypes.string,
};

OrganizationSelect.defaultProps = {
  value: null,
  isInvalid: false,
  country: '',
};

export default OrganizationSelect;
