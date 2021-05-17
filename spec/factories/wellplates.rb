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
  end
end
