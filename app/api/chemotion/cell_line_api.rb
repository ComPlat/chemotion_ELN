# frozen_string_literal: true

module Chemotion
  class CellLineAPI < Grape::API
    rescue_from ActiveRecord::RecordInvalid do |exception|
      error!(exception.record.errors.full_messages.join("\n"), 400)
    end

    rescue_from ActiveRecord::RecordNotFound do
      error!('Sample not found', 400)
    end

    rescue_from Grape::Exceptions::ValidationErrors do |exception|
      error!(exception.message, 422)
    end

    resource :cell_lines do
      params do
        requires :id, type: Integer, desc: 'id of cell line sample to load'
      end

      get do
        return ''
      end
      params do
      end
      post do
      end
      put do
      end
    end
  end
end
