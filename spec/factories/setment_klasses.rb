# frozen_string_literal: true

FactoryBot.define do
  factory :segment_klass, class: 'Labimotion::SegmentKlass' do
    label { 'segment' }
    element_klass { FactoryBot.build(:element_klass) }
  end
end
