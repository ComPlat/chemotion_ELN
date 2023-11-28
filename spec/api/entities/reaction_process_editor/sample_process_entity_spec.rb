# frozen_string_literal: true

require 'rails_helper'

describe Entities::ReactionProcessEditor::SampleProcessEntity do
  it { expect(described_class).to be < Entities::ReactionProcessEditor::ReactionProcessEntity }
end
