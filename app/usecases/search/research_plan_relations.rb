# frozen_string_literal: true

module Usecases
  module Search
    class ResearchPlanRelations
      def self.call(plan_ids:, collection_id:)
        sample_ids = ResearchPlan.sample_ids_by_research_plan_ids(plan_ids).map { |row| row.sample_id.to_i }
        reaction_ids = ResearchPlan.reaction_ids_by_research_plan_ids(plan_ids).map { |row| row.reaction_id.to_i }
        wellplate_ids = ResearchPlansWellplate.get_wellplates(plan_ids)

        {
          sample_ids: Sample.by_collection_id(collection_id).where(id: sample_ids).pluck(:id).uniq,
          reaction_ids: Reaction.by_collection_id(collection_id).where(id: reaction_ids)
                                .order(created_at: :desc).pluck(:id).uniq,
          wellplate_ids: Wellplate.by_collection_id(collection_id).where(id: wellplate_ids).pluck(:id).uniq,
        }
      end
    end
  end
end
