# frozen_string_literal: true

module Usecases
  module AffiliationSuggestions
    # User submission plus admin approval/rejection of affiliation suggestions.
    # Admin actions are reachable only through the admin API namespace.
    class Suggestion
      def initialize(current_user)
        @current_user = current_user
      end

      def create(params)
        params = params.compact_blank
        ensure_no_pending_duplicate!(params)
        ensure_not_in_registry!(params)

        suggestion = AffiliationSuggestion.create!(params.merge(user_id: @current_user.id))
        AffiliationMailer.suggestion_submitted(suggestion).deliver_later
        suggestion
      end

      def approve(id)
        suggestion = pending_suggestion(id)
        # An affiliation row needs an organization; a name-only suggestion
        # (department or working group) is just approved without one.
        if suggestion.organization.present?
          affiliation = Affiliation.find_or_create_by(
            organization: suggestion.organization,
            department: Affiliation.canonical(:department, suggestion.department),
            group: Affiliation.canonical(:group, suggestion.group),
            country: suggestion.country,
            ror_id: suggestion.ror_id,
          )
          apply_affiliation(suggestion, affiliation)
          suggestion.update!(status: :approved, affiliation_id: affiliation.id)
        else
          suggestion.update!(status: :approved)
        end
        AffiliationMailer.suggestion_approved(suggestion).deliver_later
        suggestion
      end

      def reject(id)
        suggestion = pending_suggestion(id)
        suggestion.update!(status: :rejected)
        AffiliationMailer.suggestion_rejected(suggestion).deliver_later
        suggestion
      end

      def withdraw(id)
        @current_user.affiliation_suggestions.pending.find(id).destroy!
      end

      private

      def pending_suggestion(id)
        suggestion = AffiliationSuggestion.find(id)
        raise Errors::AlreadyProcessed, 'Already processed' unless suggestion.pending?

        suggestion
      end

      # Repoint the edited UserAffiliation when the suggestion targets one the
      # submitter actually owns, otherwise add a new UserAffiliation. Scoping to
      # the submitter blocks a forged target_user_affiliation_id from repointing
      # someone else's affiliation on approval.
      def apply_affiliation(suggestion, affiliation)
        target = suggestion.user.user_affiliations.find_by(id: suggestion.target_user_affiliation_id)
        if target
          repoint(target, affiliation)
        else
          UserAffiliation.find_or_create_by!(user_id: suggestion.user_id, affiliation_id: affiliation.id)
        end
      end

      def repoint(user_affiliation, affiliation)
        old_affiliation_id = user_affiliation.affiliation_id
        ActiveRecord::Base.transaction do
          user_affiliation.update!(affiliation_id: affiliation.id)
          if old_affiliation_id != affiliation.id
            old = Affiliation.lock.find_by(id: old_affiliation_id)
            old&.destroy! if UserAffiliation.where(affiliation_id: old_affiliation_id).empty?
          end
        end
      end

      def ensure_no_pending_duplicate!(params)
        scope = @current_user.affiliation_suggestions.pending
        %i[organization department group].each do |col|
          val = params[col]
          scope = val.present? ? scope.where(%(LOWER("#{col}") = LOWER(?)), val) : scope.where(col => nil)
        end
        return unless scope.exists?

        raise Errors::DuplicateSuggestion, 'You already have a pending suggestion with these details.'
      end

      def ensure_not_in_registry!(params)
        scope = Affiliation.all
        scope = scope.where('LOWER(organization) = LOWER(?)', params[:organization]) if params[:organization].present?
        scope = scope.where('LOWER(department) = LOWER(?)', params[:department]) if params[:department].present?
        scope = scope.where('LOWER("group") = LOWER(?)', params[:group]) if params[:group].present?
        return unless scope.exists?

        raise Errors::DuplicateSuggestion, 'This already exists in the affiliation registry.'
      end
    end
  end
end
