# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::Constants::Conditions do
  it 'defines GLOBAL_DEFAULTS' do
    expect(Entities::ReactionProcessEditor::Constants::Conditions::GLOBAL_DEFAULTS).to be_present
  end
end
