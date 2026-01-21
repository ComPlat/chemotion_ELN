export default {
  device_descriptions: [
    {
      value: {
        column: 'name',
        label: 'Name',
        type: 'text',
        table: 'device_descriptions',
        advanced: true,
      },
      label: 'Name'
    },
    {
      value: {
        column: 'short_label',
        label: 'Short label',
        type: 'text',
        table: 'device_descriptions',
        advanced: true,
      },
      label: 'Short label'
    },
    {
      value: {
        type: 'spacer',
        label: '',
      },
      label: '',
    },
    {
      value: {
        type: 'spacer',
        label: '',
      },
      label: '',
    },
    {
      value: {
        column: 'device_class',
        label: 'Device class',
        type: 'select',
        option_layers: "device_class",
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Device class'
    },
    {
      value: {
        column: 'device_class_detail',
        label: 'Device class detail',
        type: 'select',
        option_layers: "device_class_detail",
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Device class detail'
    },
    {
      value: {
        column: 'operation_mode',
        label: 'Operation mode',
        type: 'select',
        option_layers: "operation_mode",
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Operation mode'
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Device type',
      },
      label: 'Device type',
    },
    {
      value: {
        column: 'device_type_name',
        label: 'Device type name',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Device type name'
    },
    {
      value: {
        column: 'device_type_id',
        label: 'Device type ID',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Device type ID'
    },
    {
      value: {
        column: 'device_type_id_type',
        label: 'ID type',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'ID type'
    },
    {
      value: {
        type: 'headline',
        label: 'General Description',
      },
      label: 'General Description',
    },
    {
      value: {
        type: 'segment-headline',
        label: 'General information on the device from the manufacturer',
      },
      label: 'General information on the device from the manufacturer',
    },
    {
      value: {
        column: 'vendor_device_name',
        label: 'Model name',
        type: 'text',
        table: 'device_descriptions',
        advanced: true,
      },
      label: 'Model name'
    },
    {
      value: {
        column: 'vendor_device_id',
        label: 'Model ID',
        type: 'text',
        table: 'device_descriptions',
        advanced: true,
      },
      label: 'Model ID'
    },
    {
      value: {
        column: 'serial_number',
        label: "Serial no",
        type: 'text',
        table: 'device_descriptions',
        advanced: true,
      },
      label: "Serial no"
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Details describing the manufacturer of the device',
      },
      label: 'Details describing the manufacturer of the device',
    },
    {
      value: {
        column: 'vendor_company_name',
        label: 'Manufacturer name',
        type: 'text',
        table: 'device_descriptions',
        advanced: true,
      },
      label: 'Manufacturer name'
    },
    {
      value: {
        column: 'vendor_id',
        label: 'Manufacturer ID',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Manufacturer ID'
    },
    {
      value: {
        column: 'vendor_id_type',
        label: 'ID type',
        type: 'select',
        option_layers: 'vendor_id_type',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'ID type'
    },
    {
      value: {
        column: 'general_tags',
        label: 'Tags',
        type: 'select',
        option_layers: "device_tags",
        table: 'device_descriptions',
        advanced: true,
      },
      label: 'Tags'
    },
    {
      value: {
        type: 'headline',
        label: 'Version specific information',
      },
      label: 'Version specific information',
    },
    {
      value: {
        column: 'version_number',
        label: 'Version',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Version'
    },
    {
      value: {
        column: 'version_installation_start_date',
        label: 'Started: Installation date',
        type: 'datetime',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Started: Installation date'
    },
    {
      value: {
        column: 'version_installation_end_date',
        label: 'End date',
        type: 'datetime',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'End date'
    },
    {
      value: {
        type: 'spacer',
        label: '',
      },
      label: '',
    },
    {
      value: {
        column: 'version_doi',
        label: 'Persistent identifier',
        type: 'textWithAddOnSelect',
        addon: 'version_identifier_type',
        option_layers: 'version_identifier_types',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Persistent identifier'
    },
    {
      value: {
        column: 'version_doi_url',
        label: 'Link',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Link'
    },
    {
      value: {
        type: 'headline',
        label: 'Device operators and location',
      },
      label: 'Device operators and location',
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Operators',
      },
      label: 'Operators',
    },
    {
      value: {
        column: 'operators',
        opt: 'name',
        label: 'Name',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Name'
    },
    {
      value: {
        column: 'operators',
        opt: 'phone',
        label: 'phone',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'phone'
    },
    {
      value: {
        column: 'operators',
        opt: 'email',
        label: 'eMail',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'eMail'
    },
    {
      value: {
        column: 'operators',
        opt: 'type',
        label: 'Type',
        type: 'select',
        option_layers: 'operator_type',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Type'
    },
    {
      value: {
        column: 'operators',
        opt: 'comment',
        label: 'Comment',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Comment'
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Owner',
      },
      label: 'Owner',
    },
    {
      value: {
        column: 'owner_institution',
        label: 'Institution',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Institution'
    },
    {
      value: {
        column: 'owner_email',
        label: 'eMail',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'eMail'
    },
    {
      value: {
        column: 'owner_id',
        label: 'ID',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'ID'
    },
    {
      value: {
        column: 'owner_id_type',
        label: 'ID type',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'ID type'
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Location',
      },
      label: 'Location',
    },
    {
      value: {
        column: 'university_campus',
        label: 'Institution',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Institution'
    },
    {
      value: {
        column: 'institute',
        label: 'Institute',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Institute'
    },
    {
      value: {
        column: 'building',
        label: 'Building',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Building'
    },
    {
      value: {
        column: 'room',
        label: 'Room',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Room'
    },
    {
      value: {
        column: 'inventory_id',
        label: 'Inventory ID',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Inventory ID'
    },
    {
      value: {
        column: 'alternative_identifier',
        label: 'Alternative Identifier / Label',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Alternative Identifier / Label'
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Access options',
      },
      label: 'Access options',
    },
    {
      value: {
        column: 'infrastructure_assignment',
        label: 'Infrastructure Assignment',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Infrastructure Assignment'
    },
    {
      value: {
        column: 'access_options',
        label: 'Access options',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Access options'
    },
    {
      value: {
        column: 'access_comments',
        label: 'Comments',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Comments'
    },
    {
      value: {
        type: 'headline',
        label: 'Setup description',
      },
      label: 'Setup description',
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Component of - setup',
      },
      label: 'Component of - setup',
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'component',
        opt: 'vendor_device_name',
        label: 'Component of setup name',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Component of setup name'
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'component',
        opt: 'vendor_device_id',
        label: 'Setup ID',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Setup ID'
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'component',
        opt: 'version_doi',
        label: 'Setup Identifier (DOI)',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Setup Identifier (DOI)'
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'component',
        opt: 'version_doi_url',
        label: 'Setup Identifier (DOI) link',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Setup Identifier (DOI) link'
    },
    {
      value: {
        type: 'segment-headline',
        label: 'Component',
      },
      label: 'Component',
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'setup',
        opt: 'vendor_device_id',
        label: 'No',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'No'
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'setup',
        opt: 'vendor_device_name',
        label: 'Name',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Name'
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'setup',
        opt: 'details',
        label: 'Details',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Details'
    },
    {
      value: {
        column: 'setup_descriptions',
        opt_type: 'setup',
        opt: 'version_doi',
        label: 'Identifier (DOI)',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Identifier (DOI)'
    },
    {
      value: {
        type: 'headline',
        label: 'Software and interfaces',
      },
      label: 'Software and interfaces',
    },
    {
      value: {
        column: 'application_name',
        label: 'Application name',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Application name'
    },
    {
      value: {
        column: 'application_version',
        label: 'Application version',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Application version'
    },
    {
      value: {
        column: 'vendor_url',
        label: 'Vendor URL',
        type: 'text',
        table: 'device_descriptions',
        advanced: false,
      },
      label: 'Vendor URL'
    },
    {
      value: {
        type: 'headline',
        label: 'Ontology',
      },
      label: 'Ontology',
    },
    {
      value: {
        column: 'ontologies',
        opt: 'label',
        label: 'Name',
        type: 'text',
        table: 'device_descriptions',
        advanced: true,
      },
      label: 'Ontology Name'
    },
  ],
}
