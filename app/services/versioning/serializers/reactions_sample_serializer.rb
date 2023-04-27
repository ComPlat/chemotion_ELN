# frozen_string_literal: true

class Versioning::Serializers::ReactionsSampleSerializer < Versioning::Serializers::BaseSerializer
  def self.call(record, name)
    new(record: record, name: name).call
  end

  def field_definitions
    {
      created_at: {
        label: 'Created at',
        kind: :date,
      },
      deleted_at: {
        label: 'Deleted',
        kind: :boolean,
        formatter: ->(_key, value) { value.present? },
        revert: %i[deleted_at],
        revertible_value_formatter: default_formatter,
      },
      show_label: {
        label: 'L/S',
        kind: :boolean,
        revert: %i[show_label],
      },
      position: {
        label: 'Position',
        revert: %i[position],
        formatter: ->(_key, value) { (value && (value + 1)) || '' },
        revertible_formatter: default_formatter,
      },
      coefficient: {
        label: 'Coeff',
        revert: %i[coefficient],
      },
      equivalent: {
        label: product? ? 'Yield' : 'Equiv',
        revert: %i[equivalent],
      },
      reference: {
        label: 'Ref',
        revert: %i[reference],
        kind: :boolean,
      },
      waste: {
        label: product? ? 'Waste' : 'Recyclable',
        revert: %i[waste],
        kind: :boolean,
      },
    }.with_indifferent_access
  end

  private

  def klass_name
    'ReactionsSample'
  end

  def product?
    record.type == 'ReactionsProductSample'
  end
end
