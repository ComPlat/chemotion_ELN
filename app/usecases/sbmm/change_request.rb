# frozen_string_literal: true

module Usecases
  module Sbmm
    class ChangeRequest
      attr_reader :current_user

      def initialize(current_user)
        @current_user = current_user
      end

      # rubocop:disable Metrics/AbcSize
      def for(params)
        sbmm = Finder.new.find_or_initialize_by(params.deep_dup)

        effective_changes = {}
        effective_changes.merge!(sbmm.changes.except('created_at', 'updated_at'))
        if sbmm&.post_translational_modification&.changed?
          ptm_changes = sbmm.post_translational_modification.changes.except('created_at', 'updated_at')
          effective_changes[:post_translational_modification] = ptm_changes
        end
        if sbmm&.protein_sequence_modification&.changed?
          psm_changes = sbmm.protein_sequence_modification.changes.except('created_at', 'updated_at')
          effective_changes[:protein_sequence_modification] = psm_changes
        end
        effective_changes[:parent] = "Uniprot Protein #{sbmm.parent.primary_accession}" unless sbmm.parent.persisted?

        SbmmMailer.request_changes(
          sbmm.id,
          requested_changes: params,
          effective_changes: effective_changes,
          user: current_user,
        )
      end
      # rubocop:enable Metrics/AbcSize
    end
  end
end
