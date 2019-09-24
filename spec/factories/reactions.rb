FactoryBot.define do
  factory :reaction do
    callback(:before_create) do |reaction|
      reaction.creator = FactoryBot.build(:user) unless reaction.creator
      # reaction.collections << FactoryBot.build(:collection) if reaction.collections.blank?
      reaction.container = FactoryBot.build(:container) unless reaction.container
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
  end
end
