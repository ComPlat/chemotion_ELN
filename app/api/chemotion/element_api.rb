# frozen_string_literal: true

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
        optional :currentCollection, default: {}, type: Hash do
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
        optional :cell_line, type: Hash do
          use :ui_state_params
        end
        optional :device_description, type: Hash do
          use :ui_state_params
        end
        optional :vessel, type: Hash do
          use :ui_state_params
        end
        optional :sequence_based_macromolecule_sample, type: Hash do
          use :ui_state_params
        end
        optional :selecteds, desc: 'Elements currently opened in detail tabs', type: Array do
          optional :type, type: String
          optional :id, type: Integer
        end
      end

      after_validation do
        collection_id = params.fetch(:currentCollection, {}).fetch(:id, 0)
        if collection_id.zero? # no or malformed collection id was given
          @collection = Collection.get_all_collection_for_user(current_user)
        elsif (@collection = current_user.collections.find_by(id: collection_id))
          # empty block body to keep rubocop happy
        elsif (collection_share = CollectionShare.find_by(collection_id: collection_id, shared_with_id: user_ids))
          permission_level = case request.request_method
                             when 'POST' then -1
                             when 'DELETE' then 2
                             else 5
                             end
          error!('403 Forbidden', 403) unless collection_share.permission_level >= permission_level
          @collection = collection_share.collection
        end
        error!('404 Record Not Found', 404) unless @collection
      end

      desc 'delete element from ui state selection.'
      delete do
        deleted = { 'sample' => [] }
        API::ELEMENTS.each do |element|
          next unless params[element]
          next unless params[element][:checkedAll] || params[element][:checkedIds].present?

          element_model = API::ELEMENT_CLASS[element].model_name
          deleted[element_model.param_key] =
            @collection.send(element_model.route_key).by_ui_state(params[element]).destroy_all.map(&:id)
        end

        # explicit inner join on reactions_samples to get soft deleted reactions_samples entries

        sql_join = 'inner join reactions_samples on reactions_samples.sample_id = samples.id'
        unless params[:options][:deleteSubsamples]
          sql_join += " and reactions_samples.type in ('ReactionsSolventSample','ReactionsReactantSample')"
        end
        deleted['sample'] += Sample.joins(sql_join).joins(:collections)
                                   .where(
                                     collections: { id: @collection.id },
                                     reactions_samples: { reaction_id: deleted['reaction'] },
                                   )
                                   .destroy_all.map(&:id)
        Labimotion::ElementKlass.find_each do |klass|
          klass_name = params[klass.name]
          next unless klass_name.present? && (klass_name[:checkedAll] || klass_name[:checkedIds].present?)

          deleted[klass.name] = @collection.send(:elements).by_ui_state(params[klass.name]).destroy_all.map(&:id)
        end

        { selecteds: params[:selecteds].reject { |sel| deleted.fetch(sel['type'], []).include?(sel['id']) } }
      end

      namespace :load_report do
        desc 'return samples & reactions for a report'
        params do
          optional :currentCollection, default: {}, type: Hash do
            optional :id, type: Integer
          end
          optional :sample, type: Hash do
            use :ui_state_params
          end
          optional :reaction, type: Hash do
            use :ui_state_params
          end
          optional :loadType, type: String
          optional :selectedTags, default: {}, type: Hash do
            optional :sampleIds, type: [Integer]
            optional :reactionIds, type: [Integer]
          end
        end
        post do
          result = { 'samples' => [], 'reactions' => [] }
          selected_tags = params['selectedTags']
          samples = @collection.samples.by_ui_state(params[:sample])
          reactions = @collection.reactions.by_ui_state(params[:reaction])

          if params[:loadType] == 'lists'
            sample_tags = selected_tags['sampleIds']
            reaction_tags = selected_tags['reactionIds']
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
          else
            samples = samples.includes(:container, :elemental_compositions, :molecule, :residues, :segments, :tag)
            reactions = reactions.includes(
              :container, :products, :purification_solvents, :reactants, :segments, :solvents, :starting_materials, :tag
            )
            result['samples'] = samples.map do |sample|
              detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: sample).detail_levels
              serialized_element = Entities::SampleEntity.represent(
                sample,
                detail_levels: detail_levels,
              ).serializable_hash
              serialized_element[:literatures] = citation_for_elements(sample.id, 'Sample')
              serialized_element
            end
            result['reactions'] = reactions.map do |reaction|
              detail_levels = ElementDetailLevelCalculator.new(user: current_user, element: reaction).detail_levels
              serialized_element = Entities::ReactionEntity.represent(
                reaction,
                detail_levels: detail_levels,
              ).serializable_hash
              serialized_element[:literatures] = citation_for_elements(reaction.id, 'Reaction')
              serialized_element
            end
          end

          result
        end
      end
    end
  end
end
