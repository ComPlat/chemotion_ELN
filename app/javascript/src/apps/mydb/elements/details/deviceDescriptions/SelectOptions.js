const deviceDescriptionSelectOptions = {
  device_type: [
    {
      value: 'stand-alone',
      label: 'stand-alone'
    },
    {
      value: 'component',
      label: 'component'
    },
    {
      value: 'equipment',
      label: 'equipment'
    },
    {
      value: 'setup',
      label: 'setup'
    }
  ],
  device_type_detail: [
    {
      value: 'has variable components',
      label: 'has variable components'
    },
    {
      value: 'no variable components',
      label: 'no variable components'
    }
  ],
  operation_mode: [
    {
      value: 'manual - walk in',
      label: 'manual - walk in'
    },
    {
      value: 'manual - service',
      label: 'manual - service'
    },
    {
      value: 'integrated - automated',
      label: 'integrated - automated'
    }
  ],
  device_tags: [
    {
      value: 'manufacturing',
      label: 'manufacturing'
    },
    {
      value: 'processes',
      label: 'processes'
    },
    {
      value: 'sensors',
      label: 'sensors'
    },
    {
      value: 'analysis',
      label: 'analysis'
    },
    {
      value: 'structuring',
      label: 'structuring'
    },
    {
      value: 'others',
      label: 'others'
    },
  ],
  operator_type: [
    {
      "value": "technical",
      "label": "technical"
    },
    {
      "value": "administrative",
      "label": "administrative"
    }
  ],
  version_identifier_types: [
    { value: 'DOI', label: 'DOI', description: '- Digital Object Identifier' },
    { value: 'Handle', label: 'Handle', description: '- CNRI Handle' },
    { value: 'ARK', label: 'ARK', description: '- Archival Resource Key' },
    { value: 'EISSN', label: 'EISSN', description: '- Electronic International Standard Serial Number' },
    { value: 'IGSN', label: 'IGSN', description: '- physical samples and specimens' },
    { value: 'PURL', label: 'PURL', description: '- Persistent Uniform Resource Locator' },
    { value: 'RRID', label: 'RRID', description: '- Research Resource Identifiers' },
  ],
  maintenance_type: [
    { value: 'internal', label: 'internal' },
    { value: 'external', label: 'external' },
  ],
  maintenance_status: [
    { value: 'planned', label: 'planned' },
    { value: 'ordered', label: 'ordered' },
    { value: 'done', label: 'done' },
    { value: 'ongoing', label: 'ongoing' },
  ],
  yes_or_no: [
    { value: 'yes', label: 'yes' },
    { value: 'no', label: 'no' },
  ],
  schedules: [
    { value: 'yearly', label: 'yearly' },
    { value: 'every two years', label: 'every two years' },
    { value: 'on Request', label: 'on request' },
  ],
  consumables_needed_type: [
    { value: 'mandatory', label: 'mandatory' },
    { value: 'optional', label: 'optional' },
    { value: 'sometimes', label: 'sometimes' },
  ],
  consumables_needed_status: [
    { value: 'available', label: 'available' },
    { value: 'in parts', label: 'in parts' },
    { value: 'ordered', label: 'ordered' },
    { value: 'to be ordered', label: 'to be ordered' },
  ],
};

export { deviceDescriptionSelectOptions };
