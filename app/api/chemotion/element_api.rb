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
        elsif (@collection = Collection.own_collections_for(current_user).find_by(id: collection_id))
          # empty block body to keep rubocop happy
        elsif (collection = Collection.accessible_for(current_user).find_by(id: collection_id))
          # We only reach here when the user is not an owner. DELETE in this namespace withdraws the
          # selection from the user's *own* collections and destroys only records left orphaned
          # (Usecases::Collections::WithdrawElements); a pure sharee has no own-collection membership
          # to withdraw here, so a shared-collection view still 403s — they use Remove-from-current
          # (Usecases::Collections::RemoveElements) instead. The only other route here, POST
          # load_report, just reads.
          error!('403 Forbidden', 403) if request.delete?

          # A user can hold several shares on one collection — their own plus one per group — and they
          # may disagree. The effective level is their maximum, so the outcome no longer depends on
          # which share row the database happened to return first.
          effective_level = collection.detail_levels_for_user(current_user)[:permission_level]
          error!('403 Forbidden', 403) unless
            effective_level >= CollectionShare.permission_level(:read_elements)

          @collection = collection
        end
        error!('404 Record Not Found', 404) unless @collection
      end

      desc 'Withdraw the ui-state selection from all of the user\'s collections (destroying orphans)'
      delete do
        usecase = Usecases::Collections::WithdrawElements.new(current_user)
        removed = usecase.perform!(
          source_collection: @collection,
          ui_state: params,
          options: params[:options] || {},
        )

        result = { selecteds: params[:selecteds].reject { |sel| removed.fetch(sel['type'], []).include?(sel['id']) } }
        # Samples kept back because they belong to a reaction still in the user's
        # collections: report them so the UI can explain why nothing was deleted.
        result[:locked_sample_ids] = usecase.locked_sample_ids if usecase.locked_sample_ids.present?
        result
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
