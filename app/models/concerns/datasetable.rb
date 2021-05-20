# frozen_string_literal: true

# Datasetable concern
module Datasetable
  extend ActiveSupport::Concern

  included do
    has_one :dataset, as: :element
  end

  def not_dataset?
    self.class.name == 'Container' && container_type != 'dataset'
  end

  def save_dataset(**args)
    return if not_dataset?

    ds = Dataset.find_by(element_type: self.class.name, element_id: id)
    if ds.present?
      ds.update!(dataset_klass_id: args[:dataset_klass_id], properties: args[:properties])
    else
      Dataset.create!(dataset_klass_id: args[:dataset_klass_id], element_type: self.class.name, element_id: id, properties: args[:properties])
    end
  end

  def destroy_datasetable
    return if not_dataset?

    Dataset.where(element_type: self.class.name, element_id: id).destroy_all
  end
end
