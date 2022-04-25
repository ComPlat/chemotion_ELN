# frozen_string_literal: true

module Chemscanner
  # Chemscanner::Molecule serializer
  class MoleculeSerializer < ActiveModel::Serializer
    attributes :id, :file_uuid, :scheme_id, :scheme_idx, :external_id,
               :clone_from, :mdl, :cano_smiles, :inchistring, :inchikey,
               :label, :description, :abbreviation, :aliases, :details,
               :extended_metadata, :is_approved

    def file_uuid
      object.scheme.file_uuid
    end

    def scheme_id
      object.scheme.id
    end

    def scheme_idx
      object.scheme.index
    end
  end
end
