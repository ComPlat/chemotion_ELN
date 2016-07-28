FactoryGirl.define do
  factory :reaction do
    sequence(:name) { |i| "Reaction #{i}" }
    callback(:before_create) do |reaction|
      #reaction.collections << FactoryGirl.build(:collection) if reaction.collections.blank?
    end
  end
end
