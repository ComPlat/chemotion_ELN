# frozen_string_literal: true

FactoryBot.define do
  factory :segment, class: 'Labimotion::Segment' do
    segment_klass { FactoryBot.build(:segment_klass) }
    element { FactoryBot.build(:sample) }
  end
end
