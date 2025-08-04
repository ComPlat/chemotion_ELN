# frozen_string_literal: true

# == Schema Information
#
# Table name: reaction_process_vessels
#
#  id                  :uuid             not null, primary key
#  deleted_at          :datetime
#  preparations        :string           default([]), is an Array
#  vesselable_type     :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  reaction_process_id :uuid
#  vesselable_id       :uuid
#
require 'rails_helper'

RSpec.describe ReactionProcessEditor::ReactionProcessVessel do
  it_behaves_like 'acts_as_paranoid soft-deletable model', :reaction_process_vessel

  it { is_expected.to belong_to(:reaction_process) }
  it { is_expected.to belong_to(:vesselable) }

  it { is_expected.to have_many(:reaction_process_steps).dependent(:nullify) }
  it { is_expected.to delegate_method(:creator).to(:reaction_process) }
end
