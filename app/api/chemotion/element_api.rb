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
        requires :currentCollection, type: Hash do
          requires :id, type: Integer
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
        requires :selecteds, type: Array do
          optional :type, type: String
          optional :id, type: Integer
        end
      end

      after_validation do
        if params[:currentCollection][:is_sync_to_me]
          @collection = SyncCollectionsUser.where(
            'id = ? and user_id in (?) and permission_level > 2',
            params[:currentCollection][:id],
            user_ids
          ).first
        else
          @collection = Collection.where(
            'id = ? AND ((user_id in (?) AND (is_shared IS NOT TRUE OR permission_level > 2)) OR shared_by_id = ?)',
            params[:currentCollection][:id],
            user_ids,
            current_user.id
          ).first
        end
        error!('401 Unauthorized', 401) unless @collection
      end

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
    end
  end
end
