FactoryBot.define do
  factory :reaction do
    callback(:before_create) do |reaction|
      reaction.creator = FactoryBot.build(:user) unless reaction.creator
      reaction.container = FactoryBot.create(:container, :with_analysis) unless reaction.container
    end

    sequence(:name) { |i| "Reaction #{i}" }
    status { 'Successful' }
    solvent { 'Aceton' }
    description { { 'ops' => [{ 'insert' => 'I am description' }] } }
    purification { '{TLC,Distillation}' }
    rf_value { 0.99 }
    tlc_solvents { 'D2O' }
    tlc_description { 'I am tlc_description' }
    observation { { 'ops' => [{ 'insert' => 'I am observation' }] } }

    factory :valid_reaction do
      after(:build) do |reaction|
        creator = FactoryBot.create(:user)
        collection = FactoryBot.create(:collection, user_id: creator.id)
        reaction.creator = creator unless reaction.creator
        reaction.collections << collection if reaction.collections.blank?
        reaction.container = FactoryBot.build(:container) unless reaction.container
      end
    end

    # Variations are a list of diffs against the reaction they belong to: see
    # db/schemas/reaction_variations.schema.json. Each row here changes the reaction's temperature
    # and the amount of its first starting material, which is enough to exercise both the
    # reaction-level and the material-level half of a diff.
    factory :reaction_with_variations do
      after(:build) do |reaction|
        reaction.variations = Array.new(2) do |i|
          {
            'id' => SecureRandom.uuid,
            'idx' => i,
            'group' => [i + 1, 0],
            'analyses' => [],
            'notes' => "I am variation #{i}",
            'data' => {
              'id' => SecureRandom.uuid,
              # Underscore prefixed, as the client's diff of its accessor backed attributes is.
              '_temperature' => {
                'valueUnit' => '°C',
                'userText' => (42 + i).to_s,
                'data' => [],
              },
              '_starting_materials' => reaction.starting_materials.map.with_index do |sample, index|
                # Only the material this row changes is present; the others stay as the holes that
                # a positional diff leaves behind.
                next nil unless index.zero?

                {
                  'id' => sample.id,
                  '_target_amount_value' => 42 + i,
                  '_target_amount_unit' => 'g',
                }
              end,
            },
          }
        end
      end
    end
  end
end
