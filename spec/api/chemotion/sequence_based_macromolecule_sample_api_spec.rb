# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SequenceBasedMacromoleculeSampleAPI do
  include_context 'api request authorization context'

  describe 'INDEX /api/v1/sequence_based_macromolecule_samples' do
    let(:collection) { create(:collection, user_id: logged_in_user.id) }
    # rubocop:disable RSpec/IndexedLet
    let(:sbmm_sample1) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:uniprot_sbmm, systematic_name: 'Zoological Phenomenon Protein'),
        user: logged_in_user,
      )
    end
    let(:sbmm_sample2) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(
          :modified_uniprot_sbmm,
          systematic_name: 'Foobar',
          parent: sbmm_sample1.sequence_based_macromolecule,
        ),
        user: logged_in_user,
      )
    end
    let(:sbmm_sample3) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:non_uniprot_sbmm, systematic_name: 'Alphanumeric Ape Protein'),
        user: logged_in_user,
      )
    end
    # rubocop:enable RSpec/IndexedLet

    before do
      sbmm_sample1
      sbmm_sample2
      sbmm_sample3
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample1,
                                                          collection: collection)
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample2,
                                                          collection: collection)
      CollectionsSequenceBasedMacromoleculeSample.create!(sequence_based_macromolecule_sample: sbmm_sample3,
                                                          collection: collection)
    end

    it 'returns a list view of all SBMM-Samples' do
      get '/api/v1/sequence_based_macromolecule_samples', params: { collection_id: collection.id }

      expect(response.status).to be 200
      list = parsed_json_response['sequence_based_macromolecule_samples']
      expect(list.size).to eq 3
      ids = list.pluck('id')
      expected_ids = [sbmm_sample3.id, sbmm_sample2.id, sbmm_sample1.id]
      expect(ids).to eq expected_ids
    end
  end

  describe 'GET /api/v1/sequence_based_macromolecule_samples/:id' do
    let(:sample) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:modified_uniprot_sbmm),
        user: logged_in_user, # from context above
      )
    end
    let(:collection) { create(:collection, user_id: user.id) }
    let(:collections_sbmm_sample) do
      CollectionsSequenceBasedMacromoleculeSample.create!(
        sequence_based_macromolecule_sample: sample,
        collection: collection,
      )
    end

    before do
      collections_sbmm_sample
    end

    it 'returns the given SBMM-Sample' do
      get "/api/v1/sequence_based_macromolecule_samples/#{sample.id}"
      expect(response.status).to eq 200

      result = parsed_json_response['sequence_based_macromolecule_sample']
      expect(result['id']).to eq sample.id
    end

    it 'returns the SBMM as part of the sample data' do
      get "/api/v1/sequence_based_macromolecule_samples/#{sample.id}"

      expect(response.status).to eq 200
      result = parsed_json_response['sequence_based_macromolecule_sample']
      sbmm = result['sequence_based_macromolecule']

      expect(sbmm['uniprot_derivation']).to eq 'uniprot_modified'
    end

    it "returns the parent of the sample's SBMM if present" do
      get "/api/v1/sequence_based_macromolecule_samples/#{sample.id}"

      expect(response.status).to eq 200
      result = parsed_json_response['sequence_based_macromolecule_sample']
      sbmm = result['sequence_based_macromolecule']
      parent_sbmm = sbmm['parent']

      expect(sbmm['uniprot_derivation']).to eq 'uniprot_modified'
      expect(parent_sbmm['uniprot_derivation']).to eq 'uniprot'
    end
  end

  describe 'POST /api/v1/sequence_based_macromolecule_samples' do
    before do
      stub_request(:get, 'https://rest.uniprot.org/uniprotkb/P12345')
        .to_return(status: 200,
                   body: file_fixture('uniprot/P12345.json').read,
                   headers: { 'Content-Type' => 'application/json' })
    end

    context 'when creating a sample for a Uniprot SBMM' do
      let(:post_for_uniprot_sbmm) do
        {
          name: 'Testsample',
          external_label: 'Testlabel',
          function_or_application: 'Testing',
          concentration_value: '0.5',
          container: {
            is_new: true,
            containable_type: 'root',
            extended_metadata: {
              report: true,
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
                report: true,
              },
            }],
          },
          sequence_based_macromolecule_attributes: {
            sbmm_type: 'protein',
            sbmm_subtype: 'unmodified',
            uniprot_derivation: 'uniprot',
            primary_accession: 'P12345',
          },
        }
      end

      it 'creates a SBMM-Sample record' do
        expect do
          post '/api/v1/sequence_based_macromolecule_samples', params: post_for_uniprot_sbmm, as: :json
        end.to change(SequenceBasedMacromoleculeSample, :count).by(1)
      end

      it 'creates the SBMM record if necessary' do
        expect do
          post '/api/v1/sequence_based_macromolecule_samples', params: post_for_uniprot_sbmm, as: :json
        end.to change(SequenceBasedMacromolecule, :count).by(1)
      end

      it 'uses existing SBMM records if possible' do
        expect do
          post '/api/v1/sequence_based_macromolecule_samples', params: post_for_uniprot_sbmm, as: :json
        end.to change(SequenceBasedMacromolecule, :count).by(1)
                                                         .and change(SequenceBasedMacromoleculeSample, :count).by(1)

        expect do
          post '/api/v1/sequence_based_macromolecule_samples', params: post_for_uniprot_sbmm, as: :json
        end.to not_change(SequenceBasedMacromolecule, :count)
           .and change(SequenceBasedMacromoleculeSample, :count).by(1)
      end
    end

    context 'when creating a modified SBMM based on a uniprot SBMM' do
      let(:post_for_modified_sbmm) do
        {
          name: 'Testsample',
          external_label: 'Testlabel',
          function_or_application: 'Testing',
          concentration_value: '0.5',
          container: {
            is_new: true,
            containable_type: 'root',
            extended_metadata: {
              report: true,
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
                report: true,
              },
            }],
          },
          sequence_based_macromolecule_attributes: {
            sbmm_type: 'protein',
            sbmm_subtype: 'unmodified',
            uniprot_derivation: 'uniprot_modified',
            molecular_weight: 123,
            parent_identifier: 'P12345',
            sequence: 'MODIFIEDSEQUENCE',
            short_name: 'FooBar',
            protein_sequence_modification_attributes: {
              modification_n_terminal: true,
              modification_n_terminal_details: 'Some details',
            },
            post_translational_modification_attributes: {
              phosphorylation_enabled: true,
              phosphorylation_ser_enabled: true,
            },
          },
        }
      end

      context 'when the uniprot SBMM is not in ELN' do
        before do
          stub_request(:get, 'https://rest.uniprot.org/uniprotkb/P12345')
            .to_return(status: 200,
                       body: file_fixture('uniprot/P12345.json').read,
                       headers: { 'Content-Type' => 'application/json' })
        end

        it 'fetches the uniprot SBMM and creates a record for it' do
          expect(SequenceBasedMacromolecule.find_by(primary_accession: 'P12345')).to be_nil
          expect do
            post '/api/v1/sequence_based_macromolecule_samples', params: post_for_modified_sbmm, as: :json
          end.to change(SequenceBasedMacromolecule, :count).by(2)
             .and change(SequenceBasedMacromoleculeSample, :count).by(1)

          expect(SequenceBasedMacromolecule.find_by(primary_accession: 'P12345')).not_to be_nil
        end
      end

      it 'creates a new SBMM with reference to the parent SBMM' do
        create(:uniprot_sbmm)

        post '/api/v1/sequence_based_macromolecule_samples', params: post_for_modified_sbmm, as: :json
        expect(response.status).to eq 201

        result = parsed_json_response['sequence_based_macromolecule_sample']

        expect(result['sequence_based_macromolecule']['sequence']).to eq 'MODIFIEDSEQUENCE'
        expect(result['sequence_based_macromolecule']['parent']['primary_accession']).to eq 'P12345'
      end

      it 'creates a new sample under the new SBMM' do
        create(:uniprot_sbmm)
        expect do
          post '/api/v1/sequence_based_macromolecule_samples', params: post_for_modified_sbmm, as: :json
        end.to change(SequenceBasedMacromolecule, :count).by(1)
           .and change(SequenceBasedMacromoleculeSample, :count).by(1)
      end
    end

    context 'when creating a modified SBMM based on a non-uniprot SBMM' do
      let(:non_uniprot_sbmm) { create(:non_uniprot_sbmm) }
      let(:post_for_child_of_non_uniprot_sbmm) do
        {
          name: 'Testsample',
          external_label: 'Testlabel',
          function_or_application: 'Testing',
          concentration_value: '0.5',
          container: {
            is_new: true,
            containable_type: 'root',
            extended_metadata: {
              report: true,
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
                report: true,
              },
            }],
          },
          sequence_based_macromolecule_attributes: {
            sbmm_type: 'protein',
            sbmm_subtype: 'unmodified',
            uniprot_derivation: 'uniprot_modified',
            molecular_weight: 123,
            parent_identifier: non_uniprot_sbmm.id,
            sequence: 'MODIFIEDSEQUENCE',
            short_name: 'FooBar',
            protein_sequence_modification_attributes: {
              modification_n_terminal: true,
              modification_n_terminal_details: 'Some details',
            },
            post_translational_modification_attributes: {
              phosphorylation_enabled: true,
              phosphorylation_ser_enabled: true,
            },
          },
        }
      end

      it 'creates a new SBMM with the provided data' do
        non_uniprot_sbmm # create this before, so it does not mess up our count
        expect do
          post '/api/v1/sequence_based_macromolecule_samples', params: post_for_child_of_non_uniprot_sbmm, as: :json
        end.to change(SequenceBasedMacromolecule, :count).by(1)
                                                         .and change(SequenceBasedMacromoleculeSample, :count).by(1)

        sample = parsed_json_response['sequence_based_macromolecule_sample']
        sbmm = sample['sequence_based_macromolecule']
        parent_sbmm = sbmm['parent']

        expect(sbmm['uniprot_derivation']).to eq 'uniprot_modified'
        expect(parent_sbmm['uniprot_derivation']).to eq 'uniprot_unknown'
      end
    end
  end

  describe 'PUT /api/v1/sequence_based_macromolecule_samples/:id' do
    let(:logger) do
      ActiveRecord::Base.logger = Logger.new($stdout)
    end
    let(:log_red) do
      # ->(message) { logger.debug ActiveSupport::LogSubscriber.new.send(:color, message, :red) }
      ->(message) {} # do nothing
    end
    # before do
    #   logger
    # end

    let(:collection) do
      log_red.call('=== Creating Collection ===')
      collection = create(:collection, user_id: logged_in_user.id)
      log_red.call("=== created collection with id #{collection.id}")
      collection
    end
    let(:sbmm) do
      log_red.call('=== Creating SBMM ===')
      sbmm = create(:modified_uniprot_sbmm)
      log_red.call("=== created SBMM with id #{sbmm.id}")
      sbmm
    end
    let(:sbmm_sample) do
      log_red.call('=== Creating SBMM Sample ===')
      sample = create(
        :sequence_based_macromolecule_sample,
        amount_as_used_mass_value: 123,
        amount_as_used_mass_unit: 'mg',
        sequence_based_macromolecule: sbmm,
        user: logged_in_user,
      )
      sample.collections << collection
      log_red.call("=== created SBMM sample with id #{sample.id}")
      sample
    end

    context 'when updating only the sample' do
      let(:put_data) do
        {
          amount_as_used_mass_value: 12_345,
          name: sbmm_sample.name,
          sequence_based_macromolecule_attributes: {
            sbmm_type: sbmm.sbmm_type,
            sbmm_subtype: sbmm.sbmm_subtype,
            uniprot_derivation: sbmm.uniprot_derivation,
            parent_identifier: sbmm.parent_id,
            molecular_weight: sbmm.molecular_weight,
            sequence: sbmm.sequence,
            short_name: sbmm.short_name,
            # the following parameters are only there so grape's format validation does not complain about missing
            # ptm/psm attributes
            protein_sequence_modification_attributes: {
              modification_n_terminal: false,
            },
            post_translational_modification_attributes: {
              phosphorylation_enabled: false,
            },
          },
        }
      end

      before do
        sbmm_sample
      end

      it 'returns a 200 success' do
        log_red.call('=== STARTING PUT ===')
        put "/api/v1/sequence_based_macromolecule_samples/#{sbmm_sample.id}", params: put_data, as: :json
        expect(response.status).to eq 200
      end

      it 'does not touch the SBMM' do
        expect do
          log_red.call('=== STARTING PUT ===')
          put "/api/v1/sequence_based_macromolecule_samples/#{sbmm_sample.id}", params: put_data, as: :json
          sbmm_sample.reload
        end.to change(sbmm_sample, :amount_as_used_mass_value).from(123).to(12_345)
           .and not_change(sbmm, :updated_at)
      end
    end

    context 'when updating SBMM data as well' do
      context 'when a SBMM with the updated data already exists' do
        # sbmm and other_sbmm should only be different on sequence
        let(:other_sbmm) do
          create(
            :modified_uniprot_sbmm,
            sequence: 'FooBar',
            parent: sbmm.parent,
            protein_sequence_modification: sbmm.protein_sequence_modification,
            post_translational_modification: sbmm.post_translational_modification,
          )
        end
        let(:sbmm_sample_serialized_for_use_as_put_data) do
          data = Entities::SequenceBasedMacromoleculeSampleEntity.represent(sbmm_sample).serializable_hash
          data[:sequence_based_macromolecule].transform_keys! do |key|
            case key
            when :protein_sequence_modifications
              :protein_sequence_modification_attributes
            when :post_translational_modifications
              :post_translational_modification_attributes
            else
              key
            end
          end
          data.transform_keys! do |key|
            key == :sequence_based_macromolecule ? :sequence_based_macromolecule_attributes : key
          end
          parent_identifier = data[:sequence_based_macromolecule_attributes][:parent][:id]
          data[:sequence_based_macromolecule_attributes][:parent_identifier] = parent_identifier
          data[:sequence_based_macromolecule_attributes].delete(:parent)
          data
        end
        let(:put_data) do
          put_data = sbmm_sample_serialized_for_use_as_put_data
          put_data[:sequence_based_macromolecule_attributes][:sequence] = other_sbmm.sequence
          put_data[:amount_as_used_mass_value] = 12_345 # some changes to the sbmm-sample
          put_data[:sequence_based_macromolecule_attributes][:short_name] = other_sbmm.short_name # this sucks!!!
          put_data
        end

        before do
          # this has to exist before the test or it will be created in the expect block and thus mislead the counter
          other_sbmm
        end

        it 'returns a 400 error' do
          put "/api/v1/sequence_based_macromolecule_samples/#{sbmm_sample.id}", params: put_data, as: :json
          expect(response.status).to eq 400
        end

        it 'returns a machine-readable datastructure containing the error' do
          expect do
            put "/api/v1/sequence_based_macromolecule_samples/#{sbmm_sample.id}", params: put_data, as: :json
          end.not_to change(sbmm_sample, :updated_at) # TODO: find less brittle way of finding out if any data was changed

          body = parsed_json_response
          expected_response = {
            "message" => "Could not update SBMM #{sbmm_sample.sequence_based_macromolecule.id} as it conflicts with SBMM #{other_sbmm.id}",
            "sbmm_id" => sbmm_sample.sequence_based_macromolecule.id,
            "conflicting_sbmm_id" => other_sbmm.id
          }

          expect(body).to eq expected_response
        end
      end

      # context 'when no SBMM with the updated data exists' do
      #   it 'updates the existing SBMM' do
      #   end
      # end
    end
  end

  describe 'POST /api/v1/sequence_based_macromolecule_samples/sub_sequence_based_macromolecule_samples' do
    let(:sample) do
      create(
        :sequence_based_macromolecule_sample,
        sequence_based_macromolecule: build(:modified_uniprot_sbmm),
        user: logged_in_user, # from context above
      )
    end
    let(:collection) { create(:collection, user_id: user.id) }
    let(:collections_sbmm_sample) do
      CollectionsSequenceBasedMacromoleculeSample.create!(
        sequence_based_macromolecule_sample: sample,
        collection: collection,
      )
    end

    before do
      collections_sbmm_sample
    end

    context 'when creating a split of a SBMM Sample' do
      let(:post_for_split) do
        {
          ui_state: {
            sequence_based_macromolecule_sample: {
              all: false,
              included_ids: [sample.id],
              excluded_ids: [],
            },
            currentCollectionId: collection.id,
            isSync: false,
          },
        }
      end

      it 'creates a SBMM Sample with a sub short label' do
        expect do
          post '/api/v1/sequence_based_macromolecule_samples/sub_sequence_based_macromolecule_samples',
               params: post_for_split, as: :json
        end.to change(SequenceBasedMacromoleculeSample, :count).by(1)

        sbmm_sample = SequenceBasedMacromoleculeSample.last
        expect(sbmm_sample['short_label']).to eq "#{sample.short_label}-1"
      end
    end
  end
end
