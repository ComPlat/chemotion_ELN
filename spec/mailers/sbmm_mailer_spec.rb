# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SbmmMailer, type: :mailer do
  describe '.request_changes' do
    let(:admin) { create(:admin) }
    let(:user) { create(:user) }
    let(:sbmm) { create(:modified_uniprot_sbmm) }

    before do
      admin
      user
      sbmm
    end

    it "renders the body correctly" do
      sbmm.short_name = 'Hallo Welt'
      sbmm.post_translational_modification.phosphorylation_ser_details = 'Hallo Welt'

      params = serialize_sbmm_as_api_input(sbmm)
      # fix parameters. Usually the API does this,
      # but we use the change request without the API parameter processing here
      params[:systematic_name] = params.delete(:full_name)
      params.delete(:splitted_sequence)
      params.delete(:sequence_length)

      mail = Usecases::Sbmm::ChangeRequest.new(user).for(params)
      binding.pry
    end
  end
end
