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

  # Saves through the model, so a revert runs the same callbacks as a normal edit (e.g. the plain-text copies of
  # Quill fields, SVG files, sanitizing) and the validations of the attributes it changes.
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
    save_record!
  end

  def field_definitions
    {}
  end

  private

  # Validates only the attributes the revert changes, so a record that is invalid for another reason (e.g. a value
  # stored before a validation existed) can still be reverted. Callbacks run as for a normal save.
  def save_record!
    record.validate
    (record.errors.attribute_names - record.changed.map(&:to_sym)).each { |attribute| record.errors.delete(attribute) }
    raise ActiveRecord::RecordInvalid, record if record.errors.any?

    record.save!(validate: false)
  end
end
