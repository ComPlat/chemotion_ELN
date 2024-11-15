# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Vessel do
  subject(:vessel) { build(:vessel) }

  it {
    expect(vessel).to have_many(:reaction_process_vessels)
      .class_name('ReactionProcessEditor::ReactionProcessVessel')
      .dependent(:destroy)
  }

  it {
    expect(vessel).to have_many(:reaction_processes)
      .class_name('ReactionProcessEditor::ReactionProcess')
      .through(:reaction_process_vessels)
  }
end
