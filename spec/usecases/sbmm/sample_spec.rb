# frozen_string_literal: true

require 'rails_helper'
describe Usecases::Sbmm::Sample do
  before do
    stub_request(:get, "https://rest.uniprot.org/uniprotkb/P12345")
      .to_return(status: 200,
                 body: file_fixture("uniprot/P12345.json").read,
                 headers: { 'Content-Type' => 'application/json' })
  end

  describe '#create' do
    let(:user) { create(:user) }
    let(:params) do
      {
        name: 'Testsample',
        external_label: 'Testlabel',
        function_or_application: 'Testing',
        concentration_value: '0.5',
        concentration_unit: 'ng/L',
        container: {
          is_new: true,
          containable_type: 'root',
          extended_metadata: {
            report: true
          },
          description: '',
          is_deleted: false,
          attachments: [],
          name: 'root',
          children: [{
            name: 'new',
            containable_type: 'analyses',
            children: [],
            attachments: [],
            is_deleted: false,
            description: '',
            extended_metadata: {
              report: true
            }
          }]
        },
        sequence_based_macromolecule_attributes: {
          sbmm_type: 'protein',
          sbmm_subtype: 'unmodified',
          uniprot_derivation: 'uniprot',
          primary_accession: 'P12345',
        }
      }
    end
    it 'creates a SBMM-Sample' do
      expect {
        described_class.new(current_user: user).create(params)
      }.to change(SequenceBasedMacromolecule, :count).by(1)
       .and change(SequenceBasedMacromoleculeSample, :count).by(1)
    end
  end
end
