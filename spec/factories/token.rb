FactoryBot.define do
  factory :token do
    user_id { 1 }
    client_name { 'Test app' }
    client_id { '123' }
    token { JsonWebToken.encode(client_id: '123', current_user_id: 1, exp: 1.hours.from_now) }
    refresh_token { JsonWebToken.encode(client_id: '123', current_user_id: 1, exp: 1.weeks.from_now) }
  end
end
