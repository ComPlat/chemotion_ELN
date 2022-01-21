# frozen_string_literal: true

FactoryBot.define do
  factory :well do
    position_x { 0 }
    position_y { 0 }
    wellplate
    readouts do
      [
        {
          value: '98.34',
          unit: '%'
        },
        {
          value: '50',
          unit: 'µM'
        }
      ]
    end

    trait :with_random_readouts do
      transient do
        value_range { (0.0)..(100.0) }
        units { %w[s h nM µM m g kg] }
        number_of_readouts { 1 }
      end

      after(:build) do |well, evaluator|
        well.readouts = []
        evaluator.number_of_readouts.times do
          well.readouts << {
            value: Kernel.rand(evaluator.value_range).round(2),
            unit: evaluator.units.sample
          }.with_indifferent_access # Rails serializer uses strings, so at least in specs I want both to work
        end
      end
    end
  end
end
