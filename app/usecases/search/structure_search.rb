# frozen_string_literal: true

module Usecases
  module Search
    class StructureSearch
      require_relative 'shared_methods'
      attr_reader :collection_id, :params, :user, :detail_levels

      def initialize(collection_id:, user:, params: {}, detail_levels: {})
        @params = params
        @collection_id = collection_id
        @user = user
        @detail_levels = detail_levels
        @shared_methods = SharedMethods.new(params: @params, user: @user)

        @elements = {
          sample_ids: [],
          reaction_ids: [],
          wellplate_ids: [],
          screen_ids: [],
          research_plan_ids: [],
          element_ids: [],
        }
        @user_samples = Sample.by_collection_id(@collection_id)
        @user_reactions = Reaction.by_collection_id(@collection_id)
        @user_wellplates = Wellplate.by_collection_id(@collection_id)
        @user_screens = Screen.by_collection_id(@collection_id)
        @user_research_plans = ResearchPlan.by_collection_id(@collection_id)
        @user_elements = Labimotion::Element.by_collection_id(@collection_id)
      end

      def perform!
        scope = basic_scope
        elements_by_scope(scope)
        @shared_methods.serialization_by_elements_and_page(@elements, '')

        results = @shared_methods.serialization_by_elements_and_page(@elements, '')
        results['cell_lines'] =
          { elements: [], ids: [], page: 1, perPage: params['per_page'], pages: 0, totalElements: 0, error: '' }
        results['sequence_based_macromolecule_samples'] =
          { elements: [], ids: [], page: 1, perPage: params['per_page'], pages: 0, totalElements: 0, error: '' }
        results
      end

      private

      # TODO: DRY : see search_api.rb helper method sample_structure_search
      def basic_scope
        not_permitted = @dl_s && @dl_s < 1
        return Sample.none if not_permitted

        molfile = Fingerprint.standardized_molfile(@params[:selection][:molfile])
        threshold = @params[:selection][:tanimoto_threshold]

        # TODO: implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
        scope =
          if @params[:selection][:search_type] == 'similar'
            Sample.by_collection_id(@collection_id).search_by_fingerprint_sim(molfile, threshold)
          else
            Sample.by_collection_id(@collection_id).search_by_fingerprint_sub(molfile)
          end
        scope = @shared_methods.order_by_molecule(scope)
        scope.pluck(:id)
      end

      def elements_by_scope(scope)
        return if scope.blank?

        @elements[:sample_ids] = scope
        sample_relations_element_ids
      end

      # rubocop:disable Metrics/AbcSize

      def sample_relations_element_ids
        @elements[:reaction_ids] = @user_reactions.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
        @elements[:wellplate_ids] = @user_wellplates.by_sample_ids(@elements[:sample_ids]).uniq.pluck(:id)
        @elements[:screen_ids] = @user_screens.by_wellplate_ids(@elements[:wellplate_ids]).pluck(:id).uniq
        @elements[:research_plan_ids] = @user_research_plans.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
        @elements[:element_ids] = @user_elements.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
      end
      # rubocop:enable Metrics/AbcSize
    end
  end
end
