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

    trait :with_transient_wells do
      after(:create) do |wellplate|
        (1..wellplate.height).each do |pos_y|
          (1..wellplate.width).each do |pos_x|
            wellplate.wells << FactoryBot.build(:well, wellplate: wellplate, position_x: pos_x, position_y: pos_y)
          end
        end
      end
    end

    trait :with_random_wells do
      transient do
        number_of_readouts { 1 }
        sample { } # allows to pass in a custom sample to prevent the well factory from creating one sample per well
      end

      wells do
        (1..8).map do |pos_y|
          (1..12).map do |pos_x|
            well_attributes = {
              position_x: pos_x,
              position_y: pos_y,
              number_of_readouts: number_of_readouts
            }
            well_attributes[:sample] = sample if sample

            build(:well, :with_random_readouts, well_attributes)
          end
        end.flatten
      end

      after(:build) do |wellplate, evaluator|
        wellplate.readout_titles = (1..evaluator.number_of_readouts).map { |index| "Readout #{index}" }
      end
    end
  end
end
