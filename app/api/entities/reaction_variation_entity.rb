# frozen_string_literal: true

module Entities
  # One row of a reaction's Variations tab.
  #
  # A variation no longer carries a copy of the reaction. It stores only what differs from the
  # reaction it belongs to, under `data`; everything it does not mention is read from the parent
  # reaction when the row is rendered. The format is documented in
  # db/schemas/reaction_variations.schema.json.
  #
  # Variations are anonymized as a whole by Entities::ReactionEntity (`anonymize_with: []`), so
  # there is nothing left to hide per attribute here.
  class ReactionVariationEntity < ApplicationEntity
    expose(
      :id,
      :idx,
      :group,
      :analyses,
      :notes,
      :data,
    )

    # Only present on rows the conversion migration touched, and only until their values have been
    # converted into a real diff. It is exposed so that saving a reaction does not drop it: the
    # client sends back the variations it was handed, and it cannot send back what it never got.
    expose :legacy_data, if: ->(object, _options) { object[:legacy_data].present? }

    def id
      object[:id].presence || object[:uuid]
    end

    def idx
      object[:idx].to_i
    end

    # The group used to be a { group:, subgroup: } object; the conversion migration turns it into a
    # pair. This keeps a database that has not run the migration yet from serving nonsense.
    def group
      value = object[:group]
      return [value[:group], value[:subgroup]] if value.is_a?(Hash)

      Array(value)
    end

    def analyses
      Array(object[:analyses])
    end

    def notes
      object[:notes].to_s
    end

    # The diff mirrors the reaction and sample models, so it is exposed the way it is stored.
    # Filtering it against a list of known attributes would mean keeping a second copy of those
    # models here, and would silently drop whatever the scheme tab learns to edit next - a reload
    # would return the row missing exactly the change that had just been made to it. The shape is
    # described by the JSON schema, and as far as a database can express it by the CHECK constraint
    # on the column.
    def data
      object[:data] || {}
    end

    def legacy_data
      object[:legacy_data]
    end
  end
end
