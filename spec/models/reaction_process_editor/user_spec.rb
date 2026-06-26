# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  let(:user) { build(:user) }

  it '#jti_auth_token' do
    user.save!
    expect(
      JWT.decode(user.jti_auth_token, Rails.application.secrets.secret_key_base),
    ).to eq(
      [{ 'jti' => user.jti, 'sub' => user.id }, { 'alg' => 'HS256' }],
    )
  end
end
