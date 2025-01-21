# frozen_string_literal: true

class Versioning::Serializers::ReactionSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name = ['Properties'])
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      name: {
        label: 'Name',
        revert: %i[name],
      },
      status: {
        label: 'Status',
        revert: %i[status],
      },
      temperature: {
        label: 'Temperature',
        kind: :temperature,
        revert: %i[temperature],
      },
      reaction_svg_file: {
        label: 'Structural formula',
        kind: :image,
        formatter: svg_path_formatter('reactions'),
      },
      rxno: {
        label: 'Type (Name Reaction Ontology)',
        revert: %i[rxno],
        formatter: ->(key, value) { default_formatter.call(key, value).to_s.split(' | ', 2)[1] },
        revertible_value_formatter: default_formatter,
      },
      role: {
        label: 'Role',
        revert: %i[role],
      },
      dangerous_products: {
        label: 'Dangerous Products',
        revert: %i[dangerous_products],
        formatter: ->(key, value) { (default_formatter.call(key, value) || []).join(', ') },
        revertible_value_formatter: default_formatter,
      },
      rf_value: {
        label: 'Rf-Value',
        revert: %i[rf_value],
      },
      tlc_solvents: {
        label: 'Solvents (parts)',
        revert: %i[tlc_solvents],
      },
      tlc_description: {
        label: 'TLC-Description',
        revert: %i[tlc_description],
      },
      description: {
        label: 'Description',
        revert: %i[description],
        kind: :quill,
      },
      purification: {
        label: 'Purification',
        revert: %i[purification],
      },
      observation: {
        label: 'Additional information for publication and purification details',
        revert: %i[observation],
        kind: :quill,
      },
      duration: {
        label: 'Duration',
        revert: %i[duration],
      },
      timestamp_start: {
        label: 'Start',
        revert: %i[timestamp_start],
      },
      timestamp_stop: {
        label: 'Stop',
        revert: %i[timestamp_stop],
      },
    }.with_indifferent_access
  end
end
