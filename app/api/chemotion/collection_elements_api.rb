# frozen_string_literal: true

module Chemotion
  class CollectionElementsAPI < Grape::API
    helpers ParamsHelpers

    rescue_from ActiveRecord::RecordNotFound do
      error!('Collection not found', 404)
    end
    rescue_from Usecases::Collections::Errors::InsufficientPermissionError do |error|
      error!(error.message, 403)
    end

    resource :collection_elements do
      params do
        requires :collection_id, type: Integer, desc: 'ID of target collection'
        requires :ui_state, type: Hash, desc: 'Selected elements from the UI' do
          use :main_ui_state_params
        end
      end

      desc 'Adds elements to a collection'
      post do
        Usecases::Collections::AddElements.new(current_user).perform!(
          collection_id: params[:collection_id],
          ui_state: params[:ui_state].except(:currentCollection),
          origin_collection_id: params[:ui_state][:currentCollection]&.dig(:id),
        )
        { status: 204 }
      end

      desc 'Removes elements from a collection'
      delete '/:collection_id' do
        result = Usecases::Collections::RemoveElements.new(current_user).perform!(
          collection_id: params[:collection_id],
          ui_state: params[:ui_state].except(:currentCollection),
        )

        # Some samples cannot be unshared on their own because they belong to a
        # reaction that is still in the collection. Report them so the UI can
        # explain why nothing happened; otherwise reply 204 No Content.
        if result[:locked_sample_ids].present?
          status 200
          { locked_sample_ids: result[:locked_sample_ids] }
        else
          status 204
          body false
        end
      end
    end
  end
end
