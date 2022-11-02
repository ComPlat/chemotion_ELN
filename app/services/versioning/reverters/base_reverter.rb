# frozen_string_literal: true

class Versioning::Reverters::BaseReverter
  include ActiveModel::Model

  attr_accessor :record, :fields

  class << self
    def call(change)
      new(
        record: scope.find(change['db_id']),
        fields: change['fields'],
      ).call
    end
  end

  def call
    attributes = { updated_at: Time.current }

    fields.each do |field|
      name = field['name']
      value = field['value']

      field_definition = field_definitions[name]

      if field_definition
        attributes[name] = field_definition.call(value)
      elsif name.include?('.')
        name, key = name.split('.')

        attributes[name] ||= record[name]
        attributes[name][key] = value
      else
        attributes[name] = value
      end
    end
    record.update_columns(attributes) # rubocop:disable Rails/SkipsModelValidations
  end

  def field_definitions
    {}
  end
end
