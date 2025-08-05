# frozen_string_literal: true

module Usecases
  module Sbmm
    class ChangeRequest
      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
      end

      def for(params)
        sbmm = Finder.new.find_or_initialize_by(params.dup)

        effective_changes = {}
        effective_changes.merge!(sbmm.changes.except("created_at", "updated_at"))
        if sbmm&.post_translational_modification&.changed?
          ptm_changes = sbmm.post_translational_modification.changes.except("created_at", "updated_at")
          effective_changes.merge!(post_translational_modification: ptm_changes)
        end
        if sbmm&.protein_sequence_modification&.changed?
          psm_changes = sbmm.protein_sequence_modification.changes.except("created_at", "updated_at")
          effective_changes.merge!(protein_sequence_modification: psm_changes)
        end
        if !sbmm.parent.persisted?
          effective_changes[:parent] = "Uniprot Protein #{sbmm.parent.primary_accession}"
        end

        SbmmMailer.request_changes(
          sbmm.id,
          requested_changes: params,
          effective_changes: effective_changes,
          user: current_user
        )
      end
    end
  end
end
