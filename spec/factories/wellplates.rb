# frozen_string_literal: true

FactoryBot.define do
  factory :wellplate do
    sequence(:name) { |i| "Wellplate #{i}" }
    description { { 'ops' => [{ 'insert' => 'I am description' }] } }

    readout_titles do
      [
        'Activity',
        'Compound Concentration'
      ]
    end

    trait :with_wells do
      after(:create) do |wellplate|
        (1..8).each do |pos_y|
          (1..12).each do |pos_x|
            FactoryBot.create(:well, wellplate: wellplate, position_x: pos_x, position_y: pos_y)
          end
        end
      end
    end

    trait :with_random_wells do
      transient do
        number_of_readouts { 1 }
      end

      wells do
        (1..8).map do |pos_y|
          (1..12).map do |pos_x|
            build(
              :well, :with_random_readouts,
              position_x: pos_x,
              position_y: pos_y,
              number_of_readouts: number_of_readouts
            )
          end
        end.flatten
      end

      after(:build) do |wellplate, evaluator|
        wellplate.readout_titles = (1..evaluator.number_of_readouts).map { |index| "Readout #{index}" }
      end
    end
  end
end
