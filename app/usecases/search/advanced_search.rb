# frozen_string_literal: true

module Usecases
  module Search
    class AdvancedSearch
      require_relative 'shared_methods'
      attr_reader :collection_id, :params, :conditions, :user

      def initialize(collection_id:, user:, params: {}, conditions: [])
        @params = params
        @collection_id = collection_id
        @conditions = conditions
        @user = user
        @shared_methods = SharedMethods.new(params: @params, user: @user)

        @elements = {
          sample_ids: [],
          reaction_ids: [],
          wellplate_ids: [],
          screen_ids: [],
          research_plan_ids: [],
          element_ids: [],
          sequence_based_macromolecule_sample_ids: [],
          device_description_ids: [],
          cell_line_ids: [],
        }
        @user_samples = Sample.by_collection_id(@collection_id)
        @user_reactions = Reaction.by_collection_id(@collection_id)
        @user_wellplates = Wellplate.by_collection_id(@collection_id)
        @user_screens = Screen.by_collection_id(@collection_id)
        @user_research_plans = ResearchPlan.by_collection_id(@collection_id)
        @user_elements = Labimotion::Element.by_collection_id(@collection_id)
        @user_sequence_based_macromolecule_samples = SequenceBasedMacromoleculeSample.by_collection_id(@collection_id)
        @user_device_descriptions = DeviceDescription.by_collection_id(@collection_id)
        @user_cell_lines = CelllineSample.by_collection_id(@collection_id)
      end

      def perform!
        scope = @conditions[:model_name] == Literature ? basic_literature_scope : basic_scope
        elements_by_scope(scope)
        @shared_methods.serialization_by_elements_and_page(@elements, @conditions[:error])
      end

      private

      def basic_scope
        return '' if @conditions[:error] != ''

        group_by_model_name = %w[ResearchPlan Wellplate].include?(@conditions[:model_name].to_s)
        is_sbmm_sample_model = @conditions[:model_name] == SequenceBasedMacromoleculeSample

        scope = @conditions[:model_name].by_collection_id(@collection_id.to_i)
                                        .where(query_with_condition)
                                        .joins(@conditions[:joins].join(' '))
        scope = @shared_methods.order_by_molecule(scope) if @conditions[:model_name] == Sample
        scope = scope.group("#{@conditions[:model_name].table_name}.id") if group_by_model_name
        scope = scope.group('samples.id, molecules.sum_formular') if @conditions[:model_name] == Sample
        scope = @shared_methods.order_and_group_for_sequence_based_macromolecule(scope) if is_sbmm_sample_model
        scope.pluck(:id)
      end

      def basic_literature_scope
        return '' if @conditions[:error] != ''

        @conditions[:model_name].where(query_with_condition)
                                .joins(@conditions[:joins].join(' '))
                                .pluck(:id)
      end

      def query_with_condition
        filtered_query = @conditions[:query].gsub(/\A\ AND \s*/, '')
        @conditions[:value].present? ? [filtered_query] + @conditions[:value] : filtered_query
      end

      def elements_by_scope(scope)
        return if scope.blank?

        if @conditions[:model_name] == Labimotion::Element
          @elements[:element_ids] = scope
          element_relations_element_ids
        else
          @elements[:"#{@conditions[:model_name].model_name.singular}_ids"] = scope
          send(:"#{@conditions[:model_name].to_s.downcase}_relations_element_ids")
        end
      end

      # rubocop:disable Metrics/AbcSize

      def sample_relations_element_ids
        @elements[:reaction_ids] = @user_reactions.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
        @elements[:wellplate_ids] = @user_wellplates.by_sample_ids(@elements[:sample_ids]).uniq.pluck(:id)
        @elements[:screen_ids] = @user_screens.by_wellplate_ids(@elements[:wellplate_ids]).pluck(:id).uniq
        @elements[:research_plan_ids] = @user_research_plans.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
        @elements[:element_ids] = @user_elements.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
      end

      def reaction_relations_element_ids
        @elements[:sample_ids] = @user_samples.by_reaction_ids(@elements[:reaction_ids]).pluck(:id).uniq
        @elements[:wellplate_ids] = @user_wellplates.by_sample_ids(@elements[:sample_ids]).uniq.pluck(:id)
        @elements[:screen_ids] = @user_screens.by_wellplate_ids(@elements[:wellplate_ids]).pluck(:id).uniq
        @elements[:research_plan_ids] = @user_research_plans.by_reaction_ids(@elements[:reaction_ids]).pluck(:id).uniq
      end

      def wellplate_relations_element_ids
        @elements[:screen_ids] = @user_screens.by_wellplate_ids(@elements[:wellplate_ids]).uniq.pluck(:id)
        @elements[:sample_ids] = @user_samples.by_wellplate_ids(@elements[:wellplate_ids]).uniq.pluck(:id)
        @elements[:reaction_ids] = @user_reactions.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
        @elements[:research_plan_ids] = ResearchPlansWellplate.get_research_plans(@elements[:wellplate_ids]).uniq
      end

      def screen_relations_element_ids
        @elements[:wellplate_ids] = @user_wellplates.by_screen_ids(@elements[:screen_ids]).uniq.pluck(:id)
        @elements[:sample_ids] = @user_samples.by_wellplate_ids(@elements[:wellplate_ids]).uniq.pluck(:id)

        return if @elements[:sample_ids].blank?

        @elements[:reaction_ids] = @user_reactions.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
        @elements[:research_plan_ids] = @user_research_plans.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
        @elements[:element_ids] = @user_elements.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
      end

      def researchplan_relations_element_ids
        sample_ids = ResearchPlan.sample_ids_by_research_plan_ids(@elements[:research_plan_ids])
        reaction_ids = ResearchPlan.reaction_ids_by_research_plan_ids(@elements[:research_plan_ids])
        @elements[:sample_ids] = sample_ids.map(&:sample_id).uniq
        @elements[:reaction_ids] = reaction_ids.map(&:reaction_id).uniq
        @elements[:wellplate_ids] = ResearchPlansWellplate.get_wellplates(@elements[:research_plan_ids]).uniq
        @elements[:screen_ids] = @user_screens.by_wellplate_ids(@elements[:wellplate_ids]).pluck(:id).uniq
        @elements[:element_ids] = @user_elements.by_sample_ids(@elements[:sample_ids]).pluck(:id).uniq
      end

      def literature_relations_element_ids
        @elements[:sample_ids] = @user_samples.by_literature_ids(@elements[:literature_ids]).pluck(:id).uniq
        @elements[:reaction_ids] = @user_reactions.by_literature_ids(@elements[:literature_ids]).uniq.pluck(:id)
        @elements[:research_plan_ids] =
          @user_research_plans.by_literature_ids(@elements[:literature_ids]).pluck(:id).uniq
      end

      def element_relations_element_ids
        sample_ids = Labimotion::ElementsSample.where(element_id: @elements[:element_ids]).pluck(:sample_id)
        @elements[:sample_ids] = @user_samples.where(id: sample_ids).uniq.pluck(:id)
      end

      def sequencebasedmacromoleculesample_relations_element_ids; end
      def devicedescription_relations_element_ids; end
      def celllinesample_relations_element_ids; end
      # rubocop:enable Metrics/AbcSize
    end
  end
end
