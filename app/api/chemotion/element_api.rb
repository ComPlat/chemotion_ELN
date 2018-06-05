require 'open-uri'
# require './helpers'

module Chemotion
  class ElementAPI < Grape::API
    include Grape::Kaminari

    helpers ParamsHelpers
    helpers CollectionHelpers

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
        requires :optional, desc: 'Elements currently opened in detail tabs', type: Array do
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
            @collection = SyncCollectionsUser.where(
              'id = ? and user_id in (?) and permission_level > ?',
              params[:currentCollection][:id],
              user_ids,
              pl
            ).first
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
        sql_join += "and reactions_samples.type ('ReactionsSolventSample','ReactionsReactantSample')" unless params[:options][:deleteSubsamples]
        deleted['sample'] += Sample.joins(sql_join).joins(:collections)
          .where(collections: { id: @collection.id }, reactions_samples: { reaction_id: deleted['reaction'] })
          .destroy_all.map(&:id)

        { selecteds: params[:selecteds].select { |sel| !deleted.fetch(sel['type'], []).include?(sel['id']) } }
      end

      desc "return selected elements from the list. (only samples an reactions)"
      post do
        selected = { 'samples' => [], 'reactions' => [] }
        %w[sample reaction].each do |element|
          next unless params[element][:checkedAll] || params[element][:checkedIds].present?
          selected[element + 's'] = @collection.send(element + 's').by_ui_state(params[element]).map do |e|
            ElementPermissionProxy.new(current_user, e, user_ids).serialized
          end
        end
        # TODO: fallback if sample are not in owned collection and currentCollection is missing
        # (case when cloning report)
        selected
      end
    end
  end
end
