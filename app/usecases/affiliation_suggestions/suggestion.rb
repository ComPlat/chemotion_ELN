# frozen_string_literal: true

module Usecases
  module AffiliationSuggestions
    # User submission plus admin approval/rejection of affiliation suggestions.
    # Admin actions are reachable only through the admin API namespace.
    class Suggestion
      NAME_COLUMNS = %i[organization department group].freeze

      def initialize(current_user)
        @current_user = current_user
      end

      def create(params)
        params = params.compact_blank
        ensure_no_pending_duplicate!(params)
        ensure_not_in_registry!(params)

        suggestion = AffiliationSuggestion.create!(params.merge(user_id: @current_user.id))
        AffiliationMailer.suggestion_submitted(suggestion)&.deliver_later
        suggestion
      end

      def approve(id, edits = {})
        suggestion = with_pending(id) do |s|
          s.assign_attributes(
            edits.slice(:organization, :department, :group, :country, :ror_id).transform_values(&:presence),
          )
          # A name-only suggestion (department/working group) is approved without an affiliation.
          if s.organization.present?
            affiliation = registry_row_for(s)
            apply_affiliation(s, affiliation)
            s.update!(status: :approved, affiliation_id: affiliation.id)
          else
            s.update!(status: :approved)
          end
        end
        AffiliationMailer.suggestion_approved(suggestion).deliver_later
        suggestion
      end

      def reject(id)
        suggestion = with_pending(id) { |s| s.update!(status: :rejected) }
        AffiliationMailer.suggestion_rejected(suggestion).deliver_later
        suggestion
      end

      def withdraw(id)
        @current_user.affiliation_suggestions.pending.find(id).destroy!
      end

      private

      # Lock the row so two admins (or a double-click) can't both process it.
      def with_pending(id)
        suggestion = AffiliationSuggestion.find(id)
        suggestion.with_lock do
          unless suggestion.pending?
            raise Usecases::AffiliationSuggestions::Errors::AlreadyProcessed, 'Already processed'
          end

          yield suggestion
        end
        suggestion
      end

      # Same ROR org can live in the registry under another display name; match by
      # ror_id first so approval reuses that row instead of minting a duplicate.
      def registry_row_for(suggestion)
        organization = Affiliation.canonical(:organization, suggestion.organization)
        department = Affiliation.canonical(:department, suggestion.department)
        group = Affiliation.canonical(:group, suggestion.group)
        if suggestion.ror_id.present?
          existing = Affiliation.find_by(ror_id: suggestion.ror_id, department: department, group: group)
          return existing if existing
        end
        Affiliation.find_or_create_by!(
          organization: organization,
          department: department,
          group: group,
          country: suggestion.country,
          ror_id: suggestion.ror_id,
        )
      end

      # Repoint the edited UserAffiliation when the suggestion targets one the
      # submitter actually owns, otherwise add a new UserAffiliation. Scoping to
      # the submitter blocks a forged target_user_affiliation_id from repointing
      # someone else's affiliation on approval.
      def apply_affiliation(suggestion, affiliation)
        dates = { from: suggestion.from, to: suggestion.to }.compact
        target = suggestion.user.user_affiliations.find_by(id: suggestion.target_user_affiliation_id)
        if target
          repoint(target, affiliation, dates)
        else
          link = UserAffiliation.find_or_create_by!(user_id: suggestion.user_id, affiliation_id: affiliation.id)
          link.update!(dates) if dates.any?
        end
      end

      # When the user already holds the target affiliation through another row,
      # drop the edited row instead of repointing it — one affiliation, one record.
      def repoint(user_affiliation, affiliation, dates = {})
        duplicate = UserAffiliation.where(user_id: user_affiliation.user_id, affiliation_id: affiliation.id)
                                   .where.not(id: user_affiliation.id).exists?
        old_affiliation_id = user_affiliation.affiliation_id
        ActiveRecord::Base.transaction do
          duplicate ? user_affiliation.destroy! : user_affiliation.update!(affiliation_id: affiliation.id, **dates)
          Affiliation.destroy_if_orphaned!(old_affiliation_id) if old_affiliation_id != affiliation.id
        end
      end

      # Case/accent-insensitive comparison via Affiliation.normalize_key, done in
      # Ruby over small sets (a user's pending suggestions, the curated registry).
      def same_value?(stored, submitted)
        Affiliation.normalize_key(stored) == Affiliation.normalize_key(submitted)
      end

      def ensure_no_pending_duplicate!(params)
        duplicate = @current_user.affiliation_suggestions.pending.any? do |s|
          NAME_COLUMNS.all? { |col| same_value?(s[col], params[col]) }
        end
        return unless duplicate

        raise Usecases::AffiliationSuggestions::Errors::DuplicateSuggestion,
              'You already have a pending suggestion with these details.'
      end

      # The organization also counts as matching when the ROR ids are identical,
      # so a known org under another display name is not treated as new.
      def organization_match?(params, org, ror)
        params[:organization].blank? || same_value?(org, params[:organization]) ||
          (params[:ror_id].present? && ror == params[:ror_id])
      end

      def registry_match?(params, org, dept, group, ror)
        organization_match?(params, org, ror) &&
          (params[:department].blank? || same_value?(dept, params[:department])) &&
          (params[:group].blank? || same_value?(group, params[:group]))
      end

      def ensure_not_in_registry!(params)
        exists = Affiliation.in_batches(of: 1_000).any? do |batch|
          batch.pluck(:organization, :department, :group, :ror_id)
               .any? { |org, dept, group, ror| registry_match?(params, org, dept, group, ror) }
        end
        return unless exists

        raise Usecases::AffiliationSuggestions::Errors::DuplicateSuggestion,
              'This already exists in the affiliation registry.'
      end
    end
  end
end
