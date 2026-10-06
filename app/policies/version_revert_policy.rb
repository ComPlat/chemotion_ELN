# frozen_string_literal: true

# Decides whether a user may apply a set of history reverts (POST /api/v1/versions/revert). Every change has to
# target a record type that has a reverter, only write fields its history serializer offers for reverting (the
# fields the History tab shows a revert checkbox for), and belong to elements the user may edit.
class VersionRevertPolicy
  # The elements a sub-record belongs to; records not listed here are elements themselves. A ReactionsSample
  # needs both: reverting it can also restore its sample.
  OWNING_ELEMENTS = {
    'Attachment' => ->(record) { [record.root_element] },
    'Chemical' => ->(record) { [record.sample || record.sequence_based_macromolecule_sample] },
    'Component' => ->(record) { [record.sample] },
    'Container' => ->(record) { [record.root_element] },
    'ElementalComposition' => ->(record) { [record.sample] },
    'ReactionsSample' => ->(record) { [record.reaction, record.sample] },
    'ResearchPlanMetadata' => ->(record) { [record.research_plan] },
    'Residue' => ->(record) { [record.sample] },
    'Well' => ->(record) { [record.wellplate] },
  }.freeze

  # Revertible fields that point at another element, which the user has to be able to read.
  REFERENCES = {
    'Well' => { 'sample_id' => Sample },
  }.freeze

  attr_reader :user, :changes

  def initialize(user, changes)
    @user = user
    @changes = changes
  end

  def allowed?
    changes.is_a?(Array) && changes.any? && changes.all? { |change| change_allowed?(change) }
  end

  private

  def change_allowed?(change)
    return false unless change.is_a?(Hash)

    klass_name = change['klass_name']
    return false unless Versioning::Reverter::ALLOWED_REVERTERS.include?(klass_name)

    record = klass_name.constantize.find_by(id: change['db_id'])
    return false if record.nil?

    owning_elements_editable?(klass_name, record) &&
      Array.wrap(change['fields']).all? { |field| field_allowed?(klass_name, record, field) }
  end

  def owning_elements_editable?(klass_name, record)
    elements = OWNING_ELEMENTS.key?(klass_name) ? OWNING_ELEMENTS[klass_name].call(record) : [record]
    elements.all? do |element|
      API::ELEMENT_CLASS.value?(element.class) && ElementPolicy.new(user, element).update?
    end
  end

  def field_allowed?(klass_name, record, field)
    return false unless field.is_a?(Hash)

    name = field['name'].to_s
    revertible_fields(klass_name, record).include?(name) && reference_readable?(klass_name, name, field['value'])
  end

  def reference_readable?(klass_name, name, value)
    referenced_class = REFERENCES.dig(klass_name, name)
    return true if referenced_class.nil? || value.blank?

    referenced = referenced_class.find_by(id: value)
    referenced.present? && ElementPolicy.new(user, referenced).read?
  end

  def revertible_fields(klass_name, record)
    @revertible_fields ||= {}
    @revertible_fields[[klass_name, record.id]] ||= begin
      serializer = "Versioning::Serializers::#{klass_name}Serializer".constantize.new(record: record)
      serializer.field_definitions.flat_map do |key, definitions|
        revertible = Array.wrap(definitions).select { |definition| definition[:revert].present? }
        revertible.map { |definition| (definition[:name] || key).to_s }
      end
    end
  end
end
