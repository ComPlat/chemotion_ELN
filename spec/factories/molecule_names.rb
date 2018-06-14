FactoryGirl.define do
  factory :molecule_name do
    name 'Awesome Water'
    description 'custom_name'
    user_id nil
    callback(:before_create) do |mn|
      # mn.user = FactoryGirl.build(:user) unless mn.user
      mn.molecule = FactoryGirl.build(:molecule) unless mn.molecule
    end
  end
end
