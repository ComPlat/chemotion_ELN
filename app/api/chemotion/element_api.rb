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
          optional :is_sync_to_me, type: Boolean, default: false
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
          pl =  case request.request_method
          when 'POST' then -1
                when 'DELETE' then 2
                else 5
                end
          if params[:currentCollection][:is_sync_to_me]
            @s_collection = SyncCollectionsUser.where(
              'id = ? and user_id in (?) and permission_level > ?',
              params[:currentCollection][:id],
              user_ids,
              pl
            ).first
            @collection = Collection.find(@s_collection.collection_id)
          else
            @collection = Collection.where(
              'id = ? AND ((user_id in (?) AND (is_shared IS NOT TRUE OR permission_level > ?)) OR shared_by_id = ?)',
              params[:currentCollection][:id],
              user_ids,
              pl,
              current_user.id
            ).first
          end
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

        # TODO: optimize includes for performance
        if params['sample'][:checkedAll] || params['sample'][:checkedIds].any?
          result['samples'] = Entities::SampleEntity.represent(@collection.samples.by_ui_state(params['sample']))
        end
        if params['reaction'][:checkedAll] || params['reaction'][:checkedIds].any?
          result['reactions'] = Entities::ReactionEntity.represent(@collection.reactions.by_ui_state(params['reaction']))
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
            optional :is_sync_to_me, type: Boolean, default: false
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

          collection_samples = @collection.samples.by_ui_state(params[:sample])
          collection_reactions = @collection.reactions.by_ui_State(params[:reaction])
          # TODO: Check permissions. User might not have access to the samples/reactions which he/she supplied ids for
          checked_samples = Sample.where(id: params[:sample][:checkedIds] || [])
          checked_reactions = Reaction.where(id: params[:reaction][:checkedIds] || [])
          samples = collection_samples.union(checked_samples).distinct
          reactions = collection_reactions.union(checked_reactions).distinct

          if params[:loadType] != 'lists'
            samples = samples.includes(:analyses, :code_log, :container, :elemental_compositions, :molecule, :residues, :segments, :tag)
            reactions = reactions.includes(
              :code_log, :container, :products, :purification_solvents, :reactants, :segments, :solvents, :starting_materials, :tag
            )
            result['samples'] = samples.map do |sample|
              serialized_element = Entities::SampleEntity.represent(sample).serializable_hash
              serialized_element[:literatures] = citation_for_elements(sample.id, 'Sample')
            end
            result['reactions'] = reactions.map do |reaction|
              serialized_element = Entities::ReactionEntity.represent(reaction).serializable_hash
              serialized_element[:literatures] = citation_for_elements(reaction.id, 'Reaction')
            end
          else
            sample_tags = selectedTags['sampleIds']
            reaction_tags = selectedTags['reactionIds']
            result['samples'] = samples.includes_for_list_display.map do |sample|
              if sample_tags && sample.id.in?(sample_tags)
                { id: sample.id, in_browser_memory: true }
              else
                Entities::SampleEntity.represent(sample, displayed_in_list: true)
              end
            end
            result['reactions'] = reactions.includes_for_list_display.map do |reaction|
              if reaction_tags && reaction_id.in?(reaction_tags)
                { id: reaction.id, in_browser_memory: true }
              else
                Entities::ReactionEntity.represent(reaction, displayed_in_list: true)
              end
            end
          end

          result
        end
      end
    end
  end
end
