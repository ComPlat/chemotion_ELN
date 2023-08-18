# frozen_string_literal: true

module Usecases
  module Search
    class AdvancedSearch
      attr_reader :collection_id, :params, :conditions, :user

      def initialize(collection_id:, user:, params: {}, conditions: [])
        @params = params
        @collection_id = collection_id
        @conditions = conditions
        @user = user

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
        @user_elements = Element.by_collection_id(@collection_id)

        @result = {}
      end

      def perform!
        scope = basic_query
        elements_by_scope(scope)
        serialization_by_elements_and_page
      end

      private

      def basic_query
        query_with_condition =
          @conditions[:value].present? ? [@conditions[:query]] + @conditions[:value] : @conditions[:query]
        group_by_model_name = %w[ResearchPlan Wellplate].include?(@conditions[:model_name].to_s)

        scope = @conditions[:model_name].by_collection_id(@collection_id.to_i)
                                        .where(query_with_condition)
                                        .joins(@conditions[:joins].join(' '))
        scope = order_by_molecule(scope) if @conditions[:model_name] == Sample
        scope = scope.group("#{@conditions[:model_name].table_name}.id") if group_by_model_name
        scope.pluck(:id)
      end

      def order_by_molecule(scope)
        scope.includes(:molecule)
             .joins(:molecule)
             .order(Arel.sql("LENGTH(SUBSTRING(molecules.sum_formular, 'C\\d+'))"))
             .order('molecules.sum_formular')
      end

      def elements_by_scope(scope)
        return if scope.blank?

        @elements["#{@conditions[:model_name].model_name.singular}_ids".to_sym] = scope
        send("#{@conditions[:model_name].to_s.downcase}_relations_element_ids")
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

      def element_relations_element_ids
        sample_ids = ElementsSample.where(element_id: @elements[:element_ids]).pluck(:sample_id)
        @elements[:sample_ids] = @user_samples.where(id: sample_ids).uniq.pluck(:id)
      end
      # rubocop:enable Metrics/AbcSize

      def serialization_by_elements_and_page
        @elements.each do |element|
          if element.first == :element_ids
            serialize_generic_elements(element)
          else
            paginated_ids = Kaminari.paginate_array(element.last).page(@params[:page]).per(@params[:per_page])
            @result[element.first.to_s.gsub('_ids', '').pluralize] = {
              elements: serialized_elements(element, paginated_ids),
              ids: element.last,
              page: @params[:page],
              perPage: @params[:per_page],
              pages: pages(element.last.size),
              totalElements: element.last.size,
            }
          end
        end
        @result
      end

      def serialized_elements(element, paginated_ids)
        if element.first == :sample_ids
          serialize_sample(paginated_ids)
        else
          serialize_by_element(element, paginated_ids)
        end
      end

      def serialize_sample(paginated_ids)
        serialized_sample_array = []
        Sample.includes_for_list_display
              .where(id: paginated_ids)
              .order(Arel.sql("position(','||id::text||',' in ',#{paginated_ids.join(',')},')"))
              .each do |sample|
                detail_levels = ElementDetailLevelCalculator.new(user: @user, element: sample).detail_levels
                serialized_sample = Entities::SampleEntity.represent(
                  sample,
                  detail_levels: detail_levels,
                  displayed_in_list: true,
                ).serializable_hash
                serialized_sample_array.push(serialized_sample)
              end
        serialized_sample_array
      end

      def serialize_generic_elements(element)
        klasses = ElementKlass.where(is_active: true, is_generic: true)
        klasses.each do |klass|
          element_ids_for_klass = Element.where(id: element.last, element_klass_id: klass.id).pluck(:id)
          paginated_element_ids = Kaminari.paginate_array(element_ids_for_klass)
                                          .page(@params[:page]).per(@params[:per_page])
          serialized_elements = Element.find(paginated_element_ids).map do |generic_element|
            Entities::ElementEntity.represent(generic_element, displayed_in_list: true).serializable_hash
          end

          @result["#{klass.name}s"] = {
            elements: serialized_elements,
            ids: element_ids_for_klass,
            page: @params[:page],
            perPage: @params[:per_page],
            pages: pages(element_ids_for_klass.size),
            totalElements: element_ids_for_klass.size,
          }
        end
      end

      def serialize_by_element(element, paginated_ids)
        model_name = element.first.to_s.gsub('_ids', '').camelize
        entities = "Entities::#{model_name}Entity".constantize

        model_name.constantize.find(paginated_ids).map do |model|
          entities.represent(model, displayed_in_list: true).serializable_hash
        end
      end

      def pages(total_elements)
        total_elements.fdiv(@params[:per_page]).ceil
      end
    end
  end
end
