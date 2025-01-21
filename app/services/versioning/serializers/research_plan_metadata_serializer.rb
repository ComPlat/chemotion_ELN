# frozen_string_literal: true

class Versioning::Serializers::ResearchPlanMetadataSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name)
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      doi: {
        label: 'DOI',
        revert: %i[doi],
      },
      url: {
        label: 'URL',
        revert: %i[url],
      },
      landing_page: {
        label: 'Landing Page',
        revert: %i[landing_page],
      },
      title: {
        label: 'Title',
        revert: %i[title],
      },
      subject: {
        label: 'Subject',
        revert: %i[subject],
      },
      data_cite_state: {
        label: 'State',
        revert: %i[data_cite_state],
      },
      format: {
        label: 'Format',
        revert: %i[format],
      },
      version: {
        label: 'Version',
        revert: %i[version],
      },
      alternate_identifier: {
        label: 'Alternate Identifiers',
        revert: %i[alternate_identifier],
        kind: :json,
        formatter: json_array_formatter_with_parsed_keys,
      },
      description: {
        label: 'Descriptions',
        revert: %i[description],
        kind: :json,
        formatter: json_array_formatter_with_parsed_keys,
      },
      geo_location: {
        label: 'Geolocations',
        revert: %i[geo_location],
        kind: :json,
        formatter: lambda { |key, value|
          result = default_formatter.call(key, value) || []

          result.flat_map do |json|
            json.values.map do |array|
              array.map do |k, v|
                {
                  title: k.capitalize,
                  content: v,
                  kind: :string,
                }
              end
            end
          end
        },
      },
      funding_reference: {
        label: 'Funding References',
        revert: %i[funding_reference],
        kind: :json,
        formatter: json_array_formatter_with_parsed_keys,
      },
      related_identifier: {
        label: 'Related Identifiers',
        revert: %i[related_identifier],
        kind: :json,
        formatter: json_array_formatter_with_parsed_keys,
      },
    }.with_indifferent_access
  end

  private

  def json_array_formatter_with_parsed_keys
    lambda do |key, value|
      result = default_formatter.call(key, value) || []

      result.map do |json|
        json.map do |k, v|
          {
            title: json_keys_dictionary[k],
            content: v,
            kind: :string,
          }
        end
        # json.transform_keys { |k| json_keys_dictionary[k] }
      end
    end
  end

  def json_keys_dictionary
    {
      'alternateIdentifier' => 'Alternate Identifier',
      'alternateIdentifierType' => 'Type',
      'description' => 'Description',
      'descriptionType' => 'Type',
      'funderName' => 'Funder Name',
      'funderIdentifier' => 'Funder Identifier',
      'relatedIdentifier' => 'Related Identifier',
      'relatedIdentifierType' => 'Type',
    }
  end
end
