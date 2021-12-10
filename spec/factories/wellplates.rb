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
        (1..8).each do |pos_x|
          (1..12).each do |pos_y|
            FactoryBot.create(:well, wellplate: wellplate, position_x: pos_x, position_y: pos_y)
          end
        end
      end
    end
  end
end
