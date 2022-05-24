# frozen_string_literal: true

module Chemscanner
  # Chemscanner::Reaction serializer
  class ReactionSerializer < ActiveModel::Serializer
    attributes :id, :file_uuid, :scheme_id, :scheme_idx, :external_id,
               :temperature, :time, :yield, :description, :is_approved,
               :details, :clone_from, :status, :extended_metadata,
               :reactant_ext_ids, :reagent_ext_ids, :solvent_ext_ids,
               :product_ext_ids

    has_many :steps

    def file_uuid
      object.scheme.file_uuid
    end

    def scheme_id
      object.scheme.id
    end

    def scheme_idx
      object.scheme.index
    end

    def reactant_ext_ids
      object.reactants.map(&:external_id).compact
    end

    def reagent_ext_ids
      object.reagents.map(&:external_id).compact
    end

    def solvent_ext_ids
      object.solvents.map(&:external_id).compact
    end

    def product_ext_ids
      object.products.map(&:external_id).compact
    end
  end
end
