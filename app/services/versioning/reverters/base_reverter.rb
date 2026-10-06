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

  # Saves through the model, so a revert runs the same validations and callbacks as a normal edit (e.g. the
  # plain-text copies of Quill fields, SVG files, sanitizing).
  def call
    fields.each do |field|
      name = field['name']
      value = field['value']

      field_definition = field_definitions[name]

      if field_definition
        record[name] = field_definition.call(value)
      elsif name.include?('.')
        column, key = name.split('.')
        # A changed copy rather than an in-place edit, so the change is tracked.
        record[column] = (record[column] || {}).merge(key => value)
      else
        record[name] = value
      end
    end
    record.save!
  end

  def field_definitions
    {}
  end
end
