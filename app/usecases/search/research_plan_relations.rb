# frozen_string_literal: true

module Usecases
  module Search
    class ResearchPlanRelations
      # @param scope [CollectionScope] the collections the search runs over
      def self.plan_ids_for_wellplates(wellplate_ids:, scope:)
        plan_ids = ResearchPlansWellplate.get_research_plans(wellplate_ids)
        scope.relation_for(ResearchPlan).where(id: plan_ids).pluck(:id).uniq
      end

      # @param scope [CollectionScope] the collections the search runs over
      def self.call(plan_ids:, scope:)
        sample_ids = ResearchPlan.sample_ids_by_research_plan_ids(plan_ids).map { |row| row.sample_id.to_i }
        reaction_ids = ResearchPlan.reaction_ids_by_research_plan_ids(plan_ids).map { |row| row.reaction_id.to_i }
        wellplate_ids = ResearchPlansWellplate.get_wellplates(plan_ids)

        {
          sample_ids: scope.relation_for(Sample).where(id: sample_ids).pluck(:id).uniq,
          reaction_ids: scope.relation_for(Reaction).where(id: reaction_ids)
                             .order(created_at: :desc).pluck(:id).uniq,
          wellplate_ids: scope.relation_for(Wellplate).where(id: wellplate_ids).pluck(:id).uniq,
        }
      end
    end
  end
end
