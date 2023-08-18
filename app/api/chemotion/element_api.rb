require 'open-uri'
# require './helpers'

module Chemotion
  class ElementAPI < Grape::API
    include Grape::Kaminari

    helpers ParamsHelpers
    helpers CollectionHelpers
    helpers LiteratureHelpers

    namespace :ui_state do
      desc 'Delete elements by UI state'
      params do
        optional :currentCollection, default: Hash.new, type: Hash do
          optional :id, type: Integer
        end
        optional :options, type: Hash do
          optional :deleteSubsamples, type: Boolean, default: false
        end
        optional :sample, type: Hash do
          use :ui_state_params
        end
        optional :reaction, type: Hash do
          use :ui_state_params
        end
        optional :wellplate, type: Hash do
          use :ui_state_params
        end
        optional :screen, type: Hash do
          use :ui_state_params
        end
        optional :research_plan, type: Hash do
          use :ui_state_params
        end
        optional :selecteds, desc: 'Elements currently opened in detail tabs', type: Array do
          optional :type, type: String
          optional :id, type: Integer
        end
      end

      after_validation do
        if params.fetch(:currentCollection, {}).fetch(:id, 0).zero?
          @collection = Collection.get_all_collection_for_user(current_user)
        else
          pl = case request.request_method
               when 'POST' then -1
               when 'DELETE' then 2
               else 5
          end

          @collection = fetch_collection_w_current_user(
            params[:currentCollection][:id],
            pl,
          )
        end
        error!('401 Unauthorized', 401) unless @collection
      end

      desc "delete element from ui state selection."
      delete do

        deleted = { 'sample' => [] }
        %w[sample reaction wellplate screen research_plan].each do |element|
          next unless params[element][:checkedAll] || params[element][:checkedIds].present?
          deleted[element] = @collection.send(element + 's').by_ui_state(params[element]).destroy_all.map(&:id)
        end

        # explicit inner join on reactions_samples to get soft deleted reactions_samples entries
        sql_join = "inner join reactions_samples on reactions_samples.sample_id = samples.id"
        sql_join += " and reactions_samples.type in ('ReactionsSolventSample','ReactionsReactantSample')" unless params[:options][:deleteSubsamples]
        deleted['sample'] += Sample.joins(sql_join).joins(:collections)
          .where(collections: { id: @collection.id }, reactions_samples: { reaction_id: deleted['reaction'] })
          .destroy_all.map(&:id)
        klasses = ElementKlass.find_each do |klass|
          next unless params[klass.name].present? && (params[klass.name][:checkedAll] || params[klass.name][:checkedIds].present?)
          deleted[klass.name] = @collection.send('elements').by_ui_state(params[klass.name]).destroy_all.map(&:id)
        end

        { selecteds: params[:selecteds].select { |sel| !deleted.fetch(sel['type'], []).include?(sel['id']) } }
      end

      desc "return selected elements from the list. (only samples an reactions)"
      post do
        result = { 'samples' => [], 'reactions' => [] }

        # TODO: optimize for performance
        #       The calculator is not really a good way to check for large amounts of elements,
        #       as it will fetch all containing collections for EACH element.
        #       The more elements are selected, the more SQL queries get executed.
        if params['sample'][:checkedAll] || params['sample'][:checkedIds].any?
          result['samples'] = @collection.samples.by_ui_state(params['sample']).map do |sample|
            calculator = ElementDetailLevelCalculator.new(user: current_user, element: sample)

            Entities::SampleEntity.represent(sample, detail_levels: calculator.detail_levels)
          end
        end

        if params['reaction'][:checkedAll] || params['reaction'][:checkedIds].any?
          result['reactions'] = @collection.reactions.by_ui_state(params['reaction']).map do |reaction|
            calculator = ElementDetailLevelCalculator.new(user: current_user, element: reaction)

            Entities::ReactionEntity.represent(reaction, detail_levels: calculator.detail_levels)
          end
        end

        # TODO: fallback if sample are not in owned collection and currentCollection is missing
        # (case when cloning report)
        result
      end

      namespace :load_report do
        desc 'return samples & reactions for a report'
        params do
          optional :currentCollection, default: Hash.new, type: Hash do
            optional :id, type: Integer
          end
          optional :sample, type: Hash do
            use :ui_state_params
          end
          optional :reaction, type: Hash do
            use :ui_state_params
          end
          optional :loadType, type: String
          optional :selectedTags, default: Hash.new, type: Hash do
            optional :sampleIds, type: Array[Integer]
            optional :reactionIds, type: Array[Integer]
          end
        end
        post do
          result = { 'samples' => [], 'reactions' => [] }
          selectedTags = params['selectedTags']
          samples = @collection.samples.by_ui_state(params[:sample])
          reactions = @collection.reactions.by_ui_state(params[:reaction])

          if params[:loadType] != 'lists'
            samples = samples.includes(:container, :elemental_compositions, :molecule, :residues, :segments, :tag)
            reactions = reactions.includes(
              :container, :products, :purification_solvents, :reactants, :segments, :solvents, :starting_materials, :tag
            )
            result['samples'] = samples.map do |sample|
              detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
              serialized_element = Entities::SampleEntity.represent(
                sample,
                detail_levels: detail_levels
              ).serializable_hash
              serialized_element[:literatures] = citation_for_elements(sample.id, 'Sample')
              serialized_element
            end
            result['reactions'] = reactions.map do |reaction|
              detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels
              serialized_element = Entities::ReactionEntity.represent(
                reaction,
                detail_levels: detail_levels
              ).serializable_hash
              serialized_element[:literatures] = citation_for_elements(reaction.id, 'Reaction')
              serialized_element
            end
          else
            sample_tags = selectedTags['sampleIds']
            reaction_tags = selectedTags['reactionIds']
            result['samples'] = samples.includes_for_list_display.map do |sample|
              if sample_tags && sample.id.in?(sample_tags)
                { id: sample.id, in_browser_memory: true }
              else
                detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
                Entities::SampleEntity.represent(sample, detail_levels: detail_levels, displayed_in_list: true)
              end
            end
            result['reactions'] = reactions.includes_for_list_display.map do |reaction|
              if reaction_tags && reaction.id.in?(reaction_tags)
                { id: reaction.id, in_browser_memory: true }
              else
                detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels
                Entities::ReactionEntity.represent(reaction, detail_levels: detail_levels, displayed_in_list: true)
              end
            end
          end

          result
        end
      end
    end
  end
end
