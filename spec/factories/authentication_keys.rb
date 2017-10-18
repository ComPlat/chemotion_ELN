FactoryGirl.define do
  factory :authentication_key do
    user_id 10000
    role 'authentication'
    ip 'remote.eln.edu'
    token SecureRandom.hex
  end
end
