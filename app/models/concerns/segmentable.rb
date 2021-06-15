# frozen_string_literal: true

# Segmentable concern
module Segmentable
  extend ActiveSupport::Concern
  included do
    has_many :segments, as: :element, dependent: :destroy
  end

  def save_segments(**args)
    return if args[:segments].nil?

    args[:segments].each do |seg|
      klass = SegmentKlass.find_by(id: seg['segment_klass_id'])
      uuid = SecureRandom.uuid
      props = seg['properties']
      props['eln'] = Chemotion::Application.config.version if props['eln'] != Chemotion::Application.config.version
      segment = Segment.find_by(element_type: self.class.name, element_id: self.id, segment_klass_id: seg['segment_klass_id'])
      if segment.present? && (segment.klass_uuid != props['klass_uuid'] || segment.properties != props)
        props['uuid'] = uuid
        props['eln'] = Chemotion::Application.config.version
        props['klass'] = 'Segment'

        segment.update!(properties: props, uuid: uuid, klass_uuid: props['klass_uuid'])
      end
      next if segment.present?

      props['uuid'] = uuid
      props['klass_uuid'] = klass.uuid
      props['eln'] = Chemotion::Application.config.version
      props['klass'] = 'Segment'
    Segment.create!(segment_klass_id: seg['segment_klass_id'], element_type: self.class.name, element_id: self.id, properties: props, created_by: args[:current_user_id], uuid: uuid, klass_uuid: klass.uuid)
    end
  end
end
