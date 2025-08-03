# frozen_string_literal: true

FactoryBot.define do
  factory :fraction, class: 'ReactionProcessEditor::Fraction' do
    parent_activity { create(:reaction_process_activity) }
    position { 1 }
    vials { %w[vial1 vial2] }
  end
end
