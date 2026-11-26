# frozen_string_literal: true

module Usecases
  module Search
    class StructureSearch
      require_relative 'shared_methods'
      attr_reader :scope, :params, :user

      # @param scope [CollectionScope] the collections the search runs over
      def initialize(scope:, user:, params: {})
        @params = params
        @scope = scope
        @user = user
        @shared_methods = SharedMethods.new(params: @params, user: @user, scope: @scope)

        @elements = {
          sample_ids: [],
          reaction_ids: [],
          wellplate_ids: [],
          screen_ids: [],
          research_plan_ids: [],
          element_ids: [],
        }
        @user_samples = @scope.relation_for(Sample)
        @user_reactions = @scope.relation_for(Reaction)
        @user_wellplates = @scope.relation_for(Wellplate)
        @user_screens = @scope.relation_for(Screen)
        @user_research_plans = @scope.relation_for(ResearchPlan)
        @user_elements = @scope.relation_for(Labimotion::Element)
        @structure_svg = ''
      end

      def perform!
        scope = basic_scope
        elements_by_scope(scope)
        @elements = @shared_methods.filter_by_list_filters(@elements)

        results = @shared_methods.serialization_by_elements_and_page(@elements, '')
        results[:structure_svg] = @structure_svg

        results['cell_lines'] =
          { elements: [], ids: [], page: 1, perPage: params['per_page'], pages: 0, totalElements: 0, error: '' }
        results['sequence_based_macromolecule_samples'] =
          { elements: [], ids: [], page: 1, perPage: params['per_page'], pages: 0, totalElements: 0, error: '' }
        results
      end

      private

      # TODO: DRY : see search_api.rb helper method sample_structure_search
      def basic_scope
        molfile = Fingerprint.standardized_molfile(@params[:selection][:molfile])
        threshold = @params[:selection][:tanimoto_threshold]
        generate_svg_by_molfile(molfile)

        # TODO: implement this: http://pubs.acs.org/doi/abs/10.1021/ci600358f
        # Structures are sample data: only search collections that show it (sample detail level above 0).
        samples = @scope.at_least(:sample_detail_level, 1).relation_for(Sample)
        scope =
          if @params[:selection][:search_type] == 'similar'
            samples.search_by_fingerprint_sim(molfile, threshold)
          else
            samples.search_by_fingerprint_sub(molfile)
          end
        scope = @shared_methods.order_by_molecule(scope)
        scope.pluck(:id)
      end

      def generate_svg_by_molfile(molfile)
        processed_svg = Chemotion::SvgRenderer.render_svg_from_molfile(molfile)
        return if processed_svg.blank?

        @structure_svg = processed_svg
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
