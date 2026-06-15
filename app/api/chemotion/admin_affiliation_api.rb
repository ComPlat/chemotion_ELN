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
          suggestion = AffiliationSuggestion.find(params[:id])
          error!({ error: 'Already processed' }, 422) unless suggestion.pending?

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
          { ok: true }
        end

        desc 'Reject a suggestion'
        put ':id/reject' do
          suggestion = AffiliationSuggestion.find(params[:id])
          error!({ error: 'Already processed' }, 422) unless suggestion.pending?

          suggestion.update!(status: :rejected)
          AffiliationMailer.suggestion_rejected(suggestion).deliver_later
          { ok: true }
        end
      end
    end
  end
end
