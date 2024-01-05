# frozen_string_literal: true

module Usecases
  module Search
    class ByIds
      require_relative 'shared_methods'
      attr_reader :collection_id, :params, :user

      def initialize(collection_id:, user:, params: {})
        @params = params
        @filter_params = @params[:selection][:list_filter_params]
        @id_params = @params[:selection][:id_params]
        @collection_id = collection_id
        @user = user
        @shared_methods = SharedMethods.new(params: @params, user: @user)

        @model_name = model_name(@id_params)
        if @filter_params
          @from = @filter_params[:from_date]
          @to = @filter_params[:to_date]
          @by_created_at = @filter_params[:filter_created_at] || false
        end
        @total_elements = @id_params[:total_elements]
        @result = {}
      end

      def perform!
        scope = basic_scope
        scope = search_filter_scope(scope)
        serialize_result_by_ids(scope)
      end

      private

      def model_name(id_params)
        id_params[:model_name] == 'element' ? Labimotion::Element : id_params[:model_name].camelize.constantize
      end

      def basic_scope
        if @model_name == Sample
          search_by_ids_for_sample(ids_by_params)
        else
          search_by_ids(ids_by_params)
        end
      end

      def search_by_ids_for_sample(ids)
        scope =
          @model_name.includes_for_list_display
                     .by_collection_id(@collection_id.to_i)
                     .where(id: ids)
        scope = scope.product_only if @filter_params.present? && @filter_params[:product_only]
        order_by_samples_filter(scope, ids)
      end

      def order_by_samples_filter(scope, ids)
        scope =
          if @params[:molecule_sort]
            @shared_methods.order_by_molecule(scope)
          else
            scope.order('samples.updated_at ASC')
          end
        scope = scope.page(@params[:page]).per(@params[:page_size]) if ids.size > @params[:page_size].to_i
        scope
      end

      def search_by_ids(ids)
        scope =
          @model_name.by_collection_id(@collection_id.to_i)
                     .where(id: ids)
        scope = scope.page(@params[:page]).per(@params[:page_size]) if ids.size > @params[:page_size].to_i
        scope
      end

      def ids_by_params
        return @id_params[:ids] if !@id_params[:with_filter] || @filter_params.present? || @params[:molecule_sort]

        start_number =
          if @params[:page].to_i > @shared_methods.pages(@id_params[:total_elements], @params[:per_page].to_i)
            0
          else
            @params[:page_size].to_i * (@params[:page].to_i - 1)
          end
        @id_params[:ids][start_number, start_number + @params[:page_size].to_i]
      end

      def search_filter_scope(scope)
        return scope if @filter_params.blank? && !@from && !@to

        timezone = @from ? Time.zone.at(@from.to_time) : Time.zone.at(@to.to_time) + 1.day
        created_or_updated_at = @by_created_at ? 'created_at' : 'updated_at'
        scope = scope.where("#{@id_params[:model_name].pluralize}.#{created_or_updated_at} >= ?", timezone)
        @total_elements = scope.size

        scope
      end

      def serialize_result_by_ids(scope)
        pages = @shared_methods.pages(@total_elements, @params[:page_size].to_i)
        page = @params[:page] > pages ? 1 : @params[:page]
        scope = scope.page(page).per(@params[:page_size]) if page != @params[:page] || @filter_params.present?
        serialized_scope = serialized_scope_for_result_by_id(scope)

        @result[@id_params[:model_name].pluralize] = {
          elements: serialized_scope,
          ids: @id_params[:ids],
          page: page,
          perPage: @params[:page_size],
          pages: pages,
          totalElements: @total_elements,
        }
        @result
      end

      def serialized_scope_for_result_by_id(scope)
        serialized_scope = []
        scope.map do |s|
          serialized_scope =
            if @model_name == Sample
              serialized_result_by_id_for_sample(s, serialized_scope)
            else
              serialized_result_by_id(s, serialized_scope)
            end
        end
        serialized_scope.sort_by! { |object| @id_params['ids'].index object[:id] }
      end

      def serialized_result_by_id_for_sample(sample, serialized_scope)
        detail_levels = ElementDetailLevelCalculator.new(user: @user, element: sample).detail_levels
        serialized = Entities::SampleEntity.represent(
          sample,
          detail_levels: detail_levels,
          displayed_in_list: true,
        ).serializable_hash
        serialized_scope.push(serialized)
      end

      def serialized_result_by_id(element, serialized_scope)
        entities =
          @model_name == Labimotion::Element ? Labimotion::ElementEntity : "Entities::#{@model_name}Entity".constantize
        serialized =
          entities.represent(element, displayed_in_list: true).serializable_hash
        serialized_scope.push(serialized)
      end
    end
  end
end
