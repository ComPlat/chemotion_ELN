# frozen_string_literal: true

module Usecases
  module Sbmm
    class Samples
      def list(params)
        scope = base_list_scope(params)
        scope = with_time_filter(scope, params)
        scope = scope.in_sbmm_order

        scope
      end

      private

      def base_list_scope(params, current_user:)
        if params[:collection_id]
          Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
                    .find(params[:collection_id])
                    .sequence_based_macromolecule_samples
        elsif params[:sync_collection_id]
          current_user.all_sync_in_collections_users
                      .find(params[:sync_collection_id])
                      .collection
                      .sequence_based_macromolecule_samples
        else
          SequenceBasedMacromoleculeSample.for_user(current_user.id).distinct
        end
      rescue ActiveRecord::RecordNotFound
        SequenceBasedMacromoleculeSample.none
      end

      def with_time_filter(scope, params)
        return scope unless params[:filter]
        return scope unless params[:filter][:timestamp_field]
        return scope unless params[:filter][:after_timestamp] || params[:filter][:before_timestamp]

        from = params[:filter][:after_timestamp]
        to = params[:filter][:before_timestamp]

        if params[:filter][:timestamp_field] == 'created_at'
          scope = scope.created_time_from(Time.zone.at(from)) if from
          scope = scope.created_time_to(Time.zone.at(to) + 1.day) if to
        elsif params[:filter][:timestamp_field] == 'updated_at'
          scope = scope.updated_time_from(Time.zone.at(from)) if from
          scope = scope.updated_time_to(Time.zone.at(to) + 1.day) if to
        end

        scope
      end
    end
  end
end
