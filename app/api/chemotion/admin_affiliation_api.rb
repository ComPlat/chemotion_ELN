# frozen_string_literal: true

module Chemotion
  class AdminAffiliationAPI < Grape::API
    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      namespace :affiliation_suggestions do
        desc 'List suggestions'
        params do
          optional :status, type: String, values: %w[pending approved rejected], default: 'pending',
                            desc: 'filter by status'
        end
        get do
          AffiliationSuggestion
            .where(status: AffiliationSuggestion.statuses[params[:status]])
            .includes(:user)
            .order(created_at: :desc)
            .as_json(
              only: %i[id organization department group country status created_at],
              include: { user: { only: %i[id name email] } },
            )
        end

        desc 'Approve a suggestion'
        put ':id/approve' do
          Usecases::AffiliationSuggestions::Suggestion.new(current_user).approve(params[:id])
          { ok: true }
        rescue Usecases::AffiliationSuggestions::Errors::AlreadyProcessed => e
          error!({ error: e.message }, 422)
        end

        desc 'Reject a suggestion'
        put ':id/reject' do
          Usecases::AffiliationSuggestions::Suggestion.new(current_user).reject(params[:id])
          { ok: true }
        rescue Usecases::AffiliationSuggestions::Errors::AlreadyProcessed => e
          error!({ error: e.message }, 422)
        end
      end
    end
  end
end
