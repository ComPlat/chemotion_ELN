# frozen_string_literal: true

# Entity module
module Entities
  # Dataset entity
  class DatasetEntity < Grape::Entity
    expose :id, :dataset_klass_id, :properties, :element_id, :element_type, :klass_ols, :klass_label
    def klass_ols
      object&.dataset_klass&.ols_term_id
    end
    def klass_label
      object&.dataset_klass&.label
    end
  end
end
