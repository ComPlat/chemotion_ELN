# frozen_string_literal: true

module Chemotion
  class ResearchPlanMetadataAPI < Grape::API
    include Grape::Kaminari

    helpers do
      def load_research_plan!
        ResearchPlan.find(params[:research_plan_id])
      rescue ActiveRecord::RecordNotFound
        error!('404 Not Found', 404)
      end
    end

    namespace :research_plan_metadata do
      desc 'Get researchPlanMetadata by researchPlan id'
      params do
        requires :research_plan_id, type: Integer, desc: 'research plan id'
      end
      route_param :research_plan_id do
        get do
          research_plan = load_research_plan!
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, research_plan).read?

          present(
            ResearchPlanMetadata.find_by(research_plan_id: research_plan.id),
            with: Entities::ResearchPlanMetadataEntity,
            root: 'research_plan_metadata',
          )
        end
      end

      desc 'create/update research plan metadata'
      params do
        requires :research_plan_id, type: Integer, desc: 'research plan id'

        optional :title, type: String, desc: 'research plan title'
        optional :subject, type: String, desc: 'research plan subject'
        optional :alternate_identifier, desc: 'research plan alternate identifier'
        optional :related_identifier, desc: 'research plan related identifier'
        optional :description, desc: 'research plan description'

        optional :format, type: String, desc: 'research plan format'
        optional :version, type: String, desc: 'research plan version'
        optional :geo_location, desc: 'research plan geo-location'
        optional :funding_reference, desc: 'research plan funding reference'

        optional :url, type: String, desc: 'research plan url'
        optional :landing_page, type: String, desc: 'research plan landing_page'
        optional :type, type: String, desc: 'research plan type'
      end
      post do
        research_plan = load_research_plan!
        error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, research_plan).update?

        attributes = declared(params, include_missing: false)
        metadata = ResearchPlanMetadata.find_or_initialize_by(research_plan_id: research_plan.id)
        metadata.update!(attributes)
        present metadata.reload, with: Entities::ResearchPlanMetadataEntity, root: 'research_plan_metadata'
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end
    end
  end
end
