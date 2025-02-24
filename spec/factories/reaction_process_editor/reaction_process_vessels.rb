# frozen_string_literal: true

FactoryBot.define do
  factory :reaction_process_vessel, class: 'ReactionProcessEditor::ReactionProcessVessel' do
    vesselable { create :vessel }
    reaction_process
    preparations { [] }
  end
end
