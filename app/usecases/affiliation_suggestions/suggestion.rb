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
            department: suggestion.department,
            group: suggestion.group,
            country: suggestion.country,
          )
          UserAffiliation.find_or_create_by!(user_id: suggestion.user_id, affiliation_id: affiliation.id)
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

      private

      def pending_suggestion(id)
        suggestion = AffiliationSuggestion.find(id)
        raise Errors::AlreadyProcessed, 'Already processed' unless suggestion.pending?

        suggestion
      end

      def ensure_no_pending_duplicate!(params)
        scope = @current_user.affiliation_suggestions.pending
        %i[organization department group].each do |col|
          val = params[col]
          scope = val.present? ? scope.where("LOWER(#{col}) = LOWER(?)", val) : scope.where(col => nil)
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
