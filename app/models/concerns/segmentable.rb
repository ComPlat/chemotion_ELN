
module Segmentable
  extend ActiveSupport::Concern
  included do
    has_many :segments, as: :element
  end

  def save_segments(**args)
    return if args[:segments].nil?
    args[:segments].each do |seg|
      segment = Segment.find_by(element_type: self.class.name, element_id: self.id, segment_klass_id: seg["segment_klass_id"])
      if segment.present?
        segment.update!(properties: seg["properties"])
      else
        Segment.create!(segment_klass_id: seg["segment_klass_id"], element_type: self.class.name, element_id: self.id,
          properties: seg["properties"], created_by: args[:current_user_id])
      end
    end
  end
end