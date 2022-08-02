# frozen_string_literal: true

FactoryBot.define do
  factory :segment_klass, class: SegmentKlass do
    label { 'segment' }
    element_klass { FactoryBot.build(:element_klass) }
  end

  factory :segment, class: Segment do
    segment_klass { FactoryBot.build(:segment_klass) }
    element { FactoryBot.build(:sample) }
  end
end
