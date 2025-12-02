module Chemotion
  class ResearchPlanMetadataAPI < Grape::API
    include Grape::Kaminari

    namespace :research_plan_metadata do
      desc 'Get researchPlanMetadata by researchPlan id'
      params do
        requires :research_plan_id, type: Integer, desc: 'research plan id'
      end
      route_param :research_plan_id do
        get do
          present ResearchPlanMetadata.find_by(research_plan_id: params[:research_plan_id]), with: Entities::ResearchPlanMetadataEntity, root: 'research_plan_metadata'
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
        attributes = declared(params, include_missing: false)
        metadata = ResearchPlanMetadata.find_or_initialize_by(research_plan_id: attributes[:research_plan_id])
        new_record = metadata.new_record?
        metadata.update!(attributes)
        # DataCite.find_and_create_at_chemotion!(metadata.research_plan) if new_record
        present metadata.reload, with: Entities::ResearchPlanMetadataEntity, root: 'research_plan_metadata'
      rescue ActiveRecord::RecordInvalid => e
        { error: e.message }
      end
    end
  end
end
