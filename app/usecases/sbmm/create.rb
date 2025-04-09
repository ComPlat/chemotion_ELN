# frozen_string_literal: true

module Usecases
  module Sbmm
    class Create
      def find_or_create_by(params)
        if params[:uniprot_derivation] == 'uniprot'
          find_or_create_uniprot_protein(params)
        elsif params[:uniprot_derivation] == 'uniprot_modified' 
          find_or_create_modified_protein(params)
        else
          find_or_create_unknown_protein(params)
        end
      end

      private

      # raise ArgumentError if primary_accession is not a valid accession code
      def find_or_create_uniprot_protein(params)
        primary_accession = params[:primary_accession]
        raise ArgumentError.new("'#{primary_accession}' is not a valid Uniprot accession") unless valid_accession?(primary_accession)

        sbmm = SequenceBasedMacromolecule.find_by(uniprot_derivation: 'uniprot', primary_accession: primary_accession)
        if sbmm.nil?
          sbmm = Usecases::Sbmm::Finder.new.find_in_uniprot(primary_accession: primary_accession)
          sbmm.sbmm_type = params[:sbmm_type]
          sbmm.sbmm_subtype = params[:sbmm_subtype]
          sbmm.uniprot_derivation = 'uniprot'
        end
        sbmm.save
        sbmm
      end

      def find_or_create_modified_protein(params)
        if valid_accession?(params[:parent_identifier]) # parent is a uniprot sbmm
          parent = find_or_create_uniprot_protein({
            primary_accession: params[:parent_identifier],
            sbmm_type: params[:sbmm_type],
            sbmm_subtype: params[:sbmm_subtype]
          })
        else
          id = params[:parent_identifier].to_i # TODO: remove .to_i if we ever change our IDs to UUIDs
          parent = SequenceBasedMacromolecule.find(id)
        end

        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params.except(:parent_identifier).merge(parent_id: parent.id, uniprot_derivation: 'uniprot_modified'))
        if sbmm.nil?
          sbmm = SequenceBasedMacromolecule.new(params.except(:parent_identifier, :protein_sequence_modification_attributes, :post_translational_modification_attributes))

          sbmm.parent = parent
          # TODO: Was passiert wenn es zwar ein gültiger Accession Code wäre, aber kein SBMM gefunden wurde?
          sbmm.protein_sequence_modification = ProteinSequenceModification.find_or_initialize_by(params[:protein_sequence_modification_attributes])
          sbmm.post_translational_modification = PostTranslationalModification.find_or_initialize_by(params[:post_translational_modification_attributes])
        end
        sbmm.save
        sbmm
      end

      def find_or_create_unknown_protein(params)
        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params.except(:parent_identifier).merge(uniprot_derivation: 'uniprot_unknown'))
        sbmm ||= SequenceBasedMacromolecule.create(params)
        sbmm.protein_sequence_modification = ProteinSequenceModification.find_or_initialize_by(params[:protein_sequence_modification_attributes])
        sbmm.post_translational_modification = PostTranslationalModification.find_or_initialize_by(params[:post_translational_modification_attributes])
        sbmm
      end

      def valid_accession?(accession)
        accession.match?(SequenceBasedMacromolecule::ACCESSION_FORMAT)
      end
    end
  end
end
