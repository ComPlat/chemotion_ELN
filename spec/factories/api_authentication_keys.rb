FactoryGirl.define do
  factory :authentication_key, class: API::AuthenticationKey do
    token SecureRandom.hex
  end
end
