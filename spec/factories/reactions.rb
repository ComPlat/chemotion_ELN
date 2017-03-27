FactoryGirl.define do
  factory :reaction do
    callback(:before_create) do |reaction|
      #reaction.collections << FactoryGirl.build(:collection) if reaction.collections.blank?
      reaction.creator = FactoryGirl.build(:user) unless reaction.creator

      reaction.container = FactoryGirl.build(:container) unless reaction.container

    end

    sequence(:name) { |i| "Reaction #{i}" }
    status "Successful"
    solvent "Aceton"
    description {{ "ops" => [{ "insert" => "I am description" }] }}
    purification "{TLC,Distillation}"
    rf_value 0.99
    tlc_solvents "D2O"
    tlc_description "I am tlc_description"
    observation "I am observation"
  end
end
