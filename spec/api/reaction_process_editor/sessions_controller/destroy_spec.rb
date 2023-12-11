# frozen_string_literal: true

require 'rails_helper'

describe ReactionProcessEditor::SessionsController, '.destroy' do
  include RequestSpecHelper

  subject(:api_call) do
    delete('/api/v1/reaction_process_editor/sign_out',
           headers: authorization_header)
  end

  let(:user) { create(:person, password: 'correct_password', password_confirmation: 'correct_password') }
  let(:authorization_header) { authorized_header(user) }

  it_behaves_like 'authenticated API call'
end
