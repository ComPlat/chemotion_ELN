import SequenceBasedMacromoleculeSampleData from "./SequenceBasedMacromoleculeSampleData";
import DeviceDescriptionData from "./DeviceDescriptionData";

const basicElnElements = {
  fields: {
    samples: [
      {
        value: {
          column: 'iupac_name',
          label: 'Molecule',
          type: 'text',
          advanced: false,
          table: 'molecules',
        },
        label: 'Molecule'
      },
      {
        value: {
          column: 'stereo',
          opt: 'abs',
          label: 'Stereo Abs',
          type: 'select',
          option_layers: "stereoAbsOptions",
          advanced: false,
        },
        label: 'Stereo Abs'
      },
      {
        value: {
          column: 'stereo',
          opt: 'rel',
          label: 'Stereo Rel',
          type: 'select',
          option_layers: "stereoRelOptions",
          advanced: false,
        },
        label: 'Stereo Rel'
      },
      {
        value: {
          column: 'decoupled',
          label: 'Decoupled',
          type: 'checkbox',
          advanced: false,
        },
        label: 'Decoupled'
      },
      {
        value: {
          column: 'name',
          label: 'Sample name',
          type: 'text',
          advanced: true,
        },
        label: 'Sample name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
      {
        value: {
          column: 'external_label',
          label: 'External Label',
          type: 'text',
          advanced: true,
        },
        label: 'External Label'
      },
      {
        value: {
          column: 'xref',
          opt: 'inventory_label',
          label: 'Inventory Label',
          type: 'text',
          advanced: true,
        },
        label: 'Inventory Label'
      },
      {
        value: {
          column: 'target_amount_value',
          label: 'Amount',
          type: 'system-defined',
          option_layers: 'amount',
          info: 'Works only with the correct unit. Only numbers are allowed',
          advanced: false,
        },
        label: 'Amount'
      },
      {
        value: {
          column: 'density',
          label: 'Density',
          type: 'textWithAddOn',
          addon: 'g/ml',
          info: 'Only numbers are allowed',
          advanced: false,
        },
        label: 'Density'
      },
      {
        value: {
          column: 'molarity_value',
          label: 'Molarity',
          type: 'textWithAddOn',
          addon: 'M',
          info: 'Only numbers are allowed',
          advanced: false,
        },
        label: 'Molarity'
      },
      {
        value: {
          column: 'purity',
          label: 'Purity / Concentration',
          type: 'text',
          info: 'Only numbers are allowed',
          advanced: false,
        },
        label: 'Purity / Concentration'
      },
      {
        value: {
          column: 'inventory_sample',
          label: 'Inventory',
          type: 'checkbox',
          advanced: false,
        },
        label: 'Inventory'
      },
      {
        value: {
          column: 'xref',
          opt: 'cas',
          label: 'CAS',
          type: 'text',
          advanced: true,
        },
        label: 'CAS'
      },
      {
        value: {
          column: 'molecular_mass',
          label: 'Molecular mass',
          type: 'textWithAddOn',
          addon: 'g/mol',
          advanced: false,
        },
        label: 'Molecular mass'
      },
      {
        value: {
          column: 'sum_formula',
          label: 'Sum formula',
          type: 'text',
          advanced: false,
        },
        label: 'Sum formula'
      },
      {
        value: {
          type: 'headline',
          label: 'Properties',
        },
        label: 'Properties',
      },
      {
        value: {
          column: 'melting_point',
          label: 'Melting point',
          type: 'textWithAddOn',
          addon: '°C',
          info: 'Numbers within a range: input of 2 numbers, e.g. 100 - 200. Only numbers are allowed',
          advanced: false,
        },
        label: 'Melting point'
      },
      {
        value: {
          column: 'boiling_point',
          label: 'Boiling point',
          type: 'textWithAddOn',
          addon: '°C',
          info: 'Numbers within a range: input of 2 numbers, e.g. 100 - 200. Only numbers are allowed',
          advanced: false,
        },
        label: 'Boiling point'
      },
      {
        value: {
          column: 'xref',
          opt: 'flash_point',
          label: 'Flash Point',
          type: 'system-defined',
          option_layers: 'temperature',
          info: 'Works only with the correct temperature unit. Only numbers are allowed',
          advanced: false,
        },
        label: 'Flash Point'
      },
      {
        value: {
          column: 'xref',
          opt: 'refractive_index',
          label: 'Refractive Index',
          type: 'text',
          advanced: false,
        },
        label: 'Refractive Index'
      },
      {
        value: {
          column: 'xref',
          opt: 'form',
          label: 'Form',
          type: 'text',
          advanced: false,
        },
        label: 'Form'
      },
      {
        value: {
          column: 'xref',
          opt: 'color',
          label: 'Color',
          type: 'text',
          advanced: false,
        },
        label: 'Color'
      },
      {
        value: {
          column: 'xref',
          opt: 'solubility',
          label: 'Solubility',
          type: 'text',
          advanced: false,
        },
        label: 'Solubility'
      },
      {
        value: {
          type: 'headline',
          label: 'Solvents',
        },
        label: 'Solvents',
      },
      {
        value: {
          column: 'dry_solvent',
          label: 'Dry solvent',
          type: 'checkbox',
          advanced: false,
        },
        label: 'Dry solvent'
      },
      {
        value: {
          column: 'solvent',
          opt: 'smiles',
          label: 'Label',
          type: 'solventSelect',
          option_layers: 'ionic_liquids',
          advanced: false,
        },
        label: 'Label'
      },
      {
        value: {
          column: 'solvent',
          opt: 'ratio',
          label: 'Ratio',
          type: 'text',
          info: 'Only numbers are allowed',
          advanced: false,
        },
        label: 'Ratio'
      },
      {
        value: {
          type: 'spacer',
        },
        label: '',
      },
      {
        value: {
          type: 'hr',
        },
        label: '',
      },
      {
        value: {
          column: 'description',
          label: 'Description',
          type: 'text',
          advanced: false,
        },
        label: 'Description'
      },
      {
        value: {
          column: 'location',
          label: 'Location',
          type: 'text',
          advanced: false,
        },
        label: 'Location'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    reactions: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
      {
        value: {
          column: 'status',
          label: 'Status',
          type: 'select',
          option_layers: 'statusOptions',
          advanced: true,
        },
        label: 'Status'
      },
      {
        value: {
          column: 'conditions',
          label: 'Conditions',
          type: 'text',
          advanced: true,
        },
        label: 'Conditions'
      },
      {
        value: {
          column: 'temperature',
          label: 'Temperature',
          type: 'system-defined',
          option_layers: 'temperature',
          info: 'Only numbers are allowed',
          advanced: true,
        },
        label: 'Temperature'
      },
      {
        value: {
          column: 'duration',
          label: 'Duration',
          type: 'system-defined',
          option_layers: 'duration',
          info: 'Only numbers are allowed',
          advanced: true,
        },
        label: 'Duration'
      },
      {
        value: {
          column: 'rxno',
          label: 'Type',
          type: 'rxnos',
          advanced: true,
        },
        label: 'Type'
      },
      {
        value: {
          column: 'role',
          label: 'Role',
          type: 'select',
          option_layers: 'rolesOptions',
          advanced: false,
        },
        label: 'Role'
      },
      {
        value: {
          column: 'plain_text_description',
          label: 'Description',
          type: 'text',
          advanced: true,
        },
        label: 'Description'
      },
      {
        value: {
          column: 'purification',
          label: 'Purification',
          type: 'select',
          option_layers: 'purificationOptions',
          advanced: false,
        },
        label: 'Purification'
      },
      {
        value: {
          column: 'plain_text_observation',
          label: 'Additional Information',
          type: 'text',
          advanced: true,
        },
        label: 'Additional Information'
      },
      {
        value: {
          column: 'dangerous_products',
          label: 'Dangerous Products',
          type: 'select',
          option_layers: 'dangerousProductsOptions',
          advanced: false,
        },
        label: 'Dangerous Products'
      },
      {
        value: {
          column: 'tlc_solvents',
          label: 'TLC Solvents (parts)',
          type: 'text',
          advanced: false,
        },
        label: 'TLC Solvents (parts)'
      },
      {
        value: {
          column: 'rf_value',
          label: 'Rf-Value',
          type: 'text',
          advanced: false,
        },
        label: 'Rf-Value'
      },
      {
        value: {
          column: 'tlc_description',
          label: 'TLC-Description',
          type: 'text',
          advanced: false,
        },
        label: 'TLC-Description'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    wellplates: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
      {
        value: {
          column: 'readout_titles',
          label: 'Readout Titles',
          type: 'text',
          advanced: true,
        },
        label: 'Readout Titles'
      },
      {
        value: {
          column: 'plain_text_description',
          label: 'Description',
          type: 'text',
          advanced: true,
        },
        label: 'Description'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    screens: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'collaborator',
          label: 'Collaborator',
          type: 'text',
          advanced: true,
        },
        label: 'Collaborator'
      },
      {
        value: {
          column: 'requirements',
          label: 'Requirements',
          type: 'text',
          advanced: true,
        },
        label: 'Requirements'
      },
      {
        value: {
          column: 'conditions',
          label: 'Conditions',
          type: 'text',
          advanced: true,
        },
        label: 'Conditions'
      },
      {
        value: {
          column: 'result',
          label: 'Result',
          type: 'text',
          advanced: true,
        },
        label: 'Result'
      },
      {
        value: {
          column: 'plain_text_description',
          label: 'Description',
          type: 'text',
          advanced: true,
        },
        label: 'Description'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    research_plans: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'body',
          opt: 'ops',
          label: 'Text',
          type: 'text',
          advanced: true,
        },
        label: 'Text'
      },
      {
        value: {
          column: 'body',
          opt: 'rows',
          label: 'Table',
          type: 'text',
          advanced: true,
        },
        label: 'Table'
      },
      {
        value: {
          column: 'content',
          label: 'Private Note',
          type: 'text',
          advanced: true,
        },
        label: 'Private Note'
      },
    ],
    elements: [
      {
        value: {
          column: 'name',
          label: 'Name',
          type: 'text',
          advanced: true,
        },
        label: 'Name'
      },
      {
        value: {
          column: 'short_label',
          label: 'Short Label',
          type: 'text',
          advanced: true,
        },
        label: 'Short Label'
      },
    ],
  }
}

export default Object.assign({}, basicElnElements, SequenceBasedMacromoleculeSampleData, DeviceDescriptionData);
