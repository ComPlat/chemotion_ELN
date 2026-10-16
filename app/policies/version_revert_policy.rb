# frozen_string_literal: true

# Decides whether a user may apply a set of history reverts (POST /api/v1/versions/revert). Every change has to
# target a record type that has a reverter, only write fields its history serializer offers for reverting (the
# fields the History tab shows a revert checkbox for), only write values the History offers for them (previous
# values from the record's own history), and belong to elements the user may edit.
class VersionRevertPolicy
  # The elements a sub-record belongs to; records not listed here are elements themselves. A ReactionsSample
  # needs both the reaction and its sample.
  OWNING_ELEMENTS = {
    'Chemical' => ->(record) { [record.sample || record.sequence_based_macromolecule_sample] },
    'Component' => ->(record) { [record.sample] },
    'Container' => ->(record) { [VersionRevertPolicy.container_element(record)] },
    'ElementalComposition' => ->(record) { [record.sample] },
    'ReactionsSample' => ->(record) { [record.reaction, record.sample] },
    'ResearchPlanMetadata' => ->(record) { [record.research_plan] },
    'Residue' => ->(record) { [record.sample] },
    'Well' => ->(record) { [record.wellplate] },
  }.freeze

  # Revertible fields that point at another element, which the user has to be able to edit.
  REFERENCES = {
    'Well' => { 'sample_id' => Sample },
  }.freeze

  # Revertible fields whose value has to be a stored file name (or blank).
  VALUE_FORMATS = {
    'Sample' => { 'sample_svg_file' => /\A\h{128}\.svg\z/ },
  }.freeze

  # Records of a type that can only be reverted in some forms: the History shows only analysis and dataset
  # containers, never an element's root or analyses container.
  RECORD_CONDITIONS = {
    'Container' => ->(record) { %w[analysis dataset].include?(record.container_type) },
  }.freeze

  attr_reader :user, :changes

  # The element a container belongs to. Walks up by parent_id, deleted containers included: closure_tree drops a
  # deleted container's hierarchy rows, so Container#root_element is nil for the deleted analyses and datasets the
  # History offers to restore.
  def self.container_element(container)
    node = container
    4.times do # dataset -> analysis -> analyses -> root
      return node.containable if node.containable_id

      node = Container.with_deleted.find_by(id: node.parent_id)
      return if node.nil?
    end
    nil
  end

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
    record = revertible_record(klass_name, change['db_id'])
    fields = change['fields']
    return false if record.nil? || !fields.is_a?(Array) || fields.empty?

    owning_elements_editable?(klass_name, record) && fields.all? { |field| field_allowed?(klass_name, record, field) }
  end

  # The record a change targets, if its type has a reverter and the History can offer to revert it. Looked up like
  # the reverter does, so deleted records the History offers to restore are found too.
  def revertible_record(klass_name, id)
    return unless Versioning::Reverter::ALLOWED_REVERTERS.include?(klass_name)

    record = "Versioning::Reverters::#{klass_name}Reverter".constantize.scope.find_by(id: id)
    record if record && RECORD_CONDITIONS.fetch(klass_name, ->(_) { true }).call(record)
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
    revertible_fields(klass_name, record).include?(name) &&
      value_format_valid?(klass_name, name, field['value']) &&
      reference_editable?(klass_name, name, field['value']) &&
      offered_value?(klass_name, record, name, field['value'])
  end

  # Whether the History offers this value for the field, i.e. the field had it before this record's later changes.
  # Covers values that refer to other records too (e.g. a research plan body's samples, a molecule name).
  def offered_value?(klass_name, record, name, value)
    offered_values(klass_name, record).fetch(name, []).include?(json_normalized(value))
  end

  def offered_values(klass_name, record)
    @offered_values ||= {}
    @offered_values[[klass_name, record.id]] ||= begin
      logged = record.class.unscoped.with_log_data.find(record.id)
      history = "Versioning::Serializers::#{klass_name}Serializer".constantize.new(record: logged, name: []).call
      history.each_with_object(Hash.new { |values, field| values[field] = [] }) do |entry, values|
        entry[:changes].each { |field, change| collect_offered_values(values, field, change) }
      end
    end
  end

  # A change offers its field's revertible value, plus those of the columns linked to it.
  def collect_offered_values(values, field, change)
    values[field.to_s] << json_normalized(change[:revertible_value])
    change.fetch(:linked_revertible_values, {}).each { |linked, value| values[linked.to_s] << json_normalized(value) }
  end

  # Compares values the way the client sends them back: as the JSON the API rendered them to.
  def json_normalized(value)
    JSON.parse({ value: value }.to_json)['value']
  end

  def value_format_valid?(klass_name, name, value)
    format = VALUE_FORMATS.dig(klass_name, name)
    format.nil? || value.blank? || (value.is_a?(String) && format.match?(value))
  end

  def reference_editable?(klass_name, name, value)
    referenced_class = REFERENCES.dig(klass_name, name)
    return true if referenced_class.nil? || value.blank?

    referenced = referenced_class.find_by(id: value)
    referenced.present? && ElementPolicy.new(user, referenced).update?
  end

  def revertible_fields(klass_name, record)
    @revertible_fields ||= {}
    @revertible_fields[[klass_name, record.id]] ||= begin
      serializer = "Versioning::Serializers::#{klass_name}Serializer".constantize.new(record: record)
      serializer.field_definitions.flat_map do |key, definitions|
        Array.wrap(definitions).flat_map { |definition| revert_names(key, definition) }
      end
    end
  end

  # A field's own name plus its revert: list, which names the columns restored together with it (e.g. a
  # structure's molfile); nothing for a field that can't be reverted.
  def revert_names(key, definition)
    return [] if definition[:revert].blank?

    [(definition[:name] || key).to_s, *definition[:revert].map(&:to_s)]
  end
end
