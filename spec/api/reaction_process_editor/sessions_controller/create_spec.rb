# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::SessionsController, '.create' do
  include RequestSpecHelper

  subject(:api_call) do
    post('/api/v1/reaction_process_editor/sign_in',
         headers: content_type_header,
         params: { user: { login: user.email, password: password } }.to_json)
  end

  let(:correct_password) { 'my_shiny_password' }
  let(:user) { create(:person, password: correct_password, password_confirmation: correct_password) }

  describe 'with correct credentials' do
    let(:password) { correct_password }

    it 'returns 200' do
      api_call
      expect(response).to have_http_status :ok
    end
  end

  describe 'wrong credentials' do
    let(:password) { 'wrong_password' }

    it 'returns 401' do
      api_call
      expect(response).to have_http_status :unauthorized
    end
  end
end
