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

    klass = DatasetKlass.find_by(id: args[:dataset_klass_id])
    uuid = SecureRandom.uuid
    props = args[:properties]
    props['eln'] = Chemotion::Application.config.version if props['eln'] != Chemotion::Application.config.version
    ds = Dataset.find_by(element_type: self.class.name, element_id: id)
    if ds.present? && (ds.klass_uuid != props['klass_uuid'] || ds.properties != props)
      props['uuid'] = uuid
      props['eln'] = Chemotion::Application.config.version
      props['klass'] = 'Dataset'
      ds.update!(uuid: uuid, dataset_klass_id: args[:dataset_klass_id], properties: props, klass_uuid: props['klass_uuid'])
    end
    return if ds.present?

    props['uuid'] = uuid
    props['klass_uuid'] = klass.uuid
    props['eln'] = Chemotion::Application.config.version
    props['klass'] = 'Dataset'
    Dataset.create!(uuid: uuid, dataset_klass_id: args[:dataset_klass_id], element_type: self.class.name, element_id: id, properties: props, klass_uuid: klass.uuid)
  end

  def destroy_datasetable
    return if not_dataset?

    Dataset.where(element_type: self.class.name, element_id: id).destroy_all
  end
end
