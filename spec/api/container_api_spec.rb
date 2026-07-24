# frozen_string_literal: true

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/NestedGroups

require 'rails_helper'

describe Chemotion::ContainerAPI do
  # login user's inbox
  let!(:cont_login_root) { create(:inbox_container_root) }
  let!(:login) { create(:person, first_name: 'Person', last_name: 'Test', container: cont_login_root) }
  let!(:cont_login_inbox) { create(:inbox_container_with_attachments, number_of_attachments: 2) }

  # hacker's inbox
  let!(:cont_hacker_root) { create(:inbox_container_root) }
  let!(:hacker) { create(:person, first_name: 'Hacker', last_name: 'You', container: cont_hacker_root) }
  let!(:cont_hacker_inbox) { create(:inbox_container_with_attachments, number_of_attachments: 2) }

  let!(:cont_analyses) { create(:container, container_type: 'analyses') }
  let!(:cont_analysis) { create(:analysis_container) }
  let!(:cont_dataset) { create(:container, container_type: 'dataset') }

  let!(:cont_hacker_analyses) { create(:container, container_type: 'analyses') }
  let!(:cont_hacker_analysis) { create(:analysis_container) }
  let!(:cont_hacker_dataset) { create(:container, container_type: 'dataset') }

  context 'authorized user logged in' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user)
        .and_return(login)
      cont_login_root.children << cont_analyses
      cont_login_root.save!
      cont_analyses.children << cont_analysis
      cont_analyses.save!
      cont_analysis.children << cont_dataset
      cont_analysis.save!
      cont_dataset.children << cont_login_inbox
      cont_dataset.save!
    end

    after(:all) do
      `rm -rf #{Rails.root.join('tmp/test')}`
      puts "delete tmp folder #{Rails.root.join('tmp/test')} "
    end

    describe 'check if the current user is the container owner before removing the linkage between container and attachments' do
      it 'the current user is the container owner, returns 200 status code' do
        params = { container_id: cont_login_inbox.id, attachments: cont_login_inbox.attachments }
        patch('/api/v1/containers',
              params: params.to_json,
              headers: { 'CONTENT_TYPE' => 'application/json' })
        expect(response.status).to eq 200
      end

      it 'the current user is NOT the container owner, returns 401 status code' do
        cont_hacker_root.children << cont_hacker_analyses
        cont_hacker_root.save!
        cont_hacker_analyses.children << cont_hacker_analysis
        cont_hacker_analyses.save!
        cont_hacker_analysis.children << cont_hacker_dataset
        cont_hacker_analysis.save!
        cont_hacker_dataset.children << cont_hacker_inbox
        cont_hacker_dataset.save!

        params = { container_id: cont_hacker_inbox.id, attachments: cont_hacker_inbox.attachments }
        patch('/api/v1/containers',
              params: params.to_json,
              headers: { 'CONTENT_TYPE' => 'application/json' })
        expect(response.status).to eq 401
      end
    end
  end

  describe 'PUT /api/v1/containers/container' do
    include_context 'api request authorization context'

    let(:collection) { create(:collection, user: user) }
    let(:reaction) { create(:reaction, creator: user, collections: [collection]) }
    let(:root_container) { reaction.container }
    let(:analyses_container) { root_container.children.find_by(container_type: 'analyses') }
    let(:analysis_container) { analyses_container.children.first }

    let(:container_params) do
      {
        container: {
          id: root_container.id,
          container_type: 'root',
          description: root_container.description,
          extended_metadata: {},
          children: [],
        },
      }
    end

    context 'when the root element is a Reaction' do
      before do
        reaction.update!(
          variations: {
            'uuid-1' => { 'id' => '1', 'metadata' => { 'analyses' => [], 'notes' => '' } },
          },
        )
      end

      it 'includes container and variations in the response' do
        put('/api/v1/containers/container',
            params: container_params.to_json,
            headers: { 'CONTENT_TYPE' => 'application/json' })

        expect(response.status).to eq 200
        json = JSON.parse(response.body)
        expect(json).to have_key('container')
        expect(json).to have_key('variations')
      end

      it 'returns the current variations array' do
        put('/api/v1/containers/container',
            params: container_params.to_json,
            headers: { 'CONTENT_TYPE' => 'application/json' })

        json = JSON.parse(response.body)
        expect(json['variations']).to be_an(Array)
        expect(json['variations'].first['id']).to eq('1')
      end

      context 'when an attachment with a variation filename is saved' do
        let(:dataset_container) { create(:container, container_type: 'dataset', parent: analysis_container) }
        let(:container_params_with_attachment) do
          {
            container: {
              id: root_container.id,
              container_type: 'root',
              description: '',
              extended_metadata: {},
              children: [{
                id: analyses_container.id,
                container_type: 'analyses',
                description: '',
                extended_metadata: {},
                children: [{
                  id: analysis_container.id,
                  container_type: 'analysis',
                  name: analysis_container.name,
                  description: analysis_container.description,
                  extended_metadata: analysis_container.extended_metadata,
                  children: [{
                    id: dataset_container.id,
                    container_type: 'dataset',
                    name: dataset_container.name,
                    description: dataset_container.description,
                    extended_metadata: {},
                    attachments: [{
                      id: attachment_key,
                      is_new: true,
                      is_deleted: false,
                      filename: 'spectrum-v1.pdf',
                    }],
                  }],
                }],
              }],
            },
          }
        end
        let(:attachment_key) { SecureRandom.uuid }

        before do
          create(:attachment,
                 key: attachment_key,
                 filename: 'spectrum-v1.pdf',
                 attachable: nil,
                 created_by: user.id)
        end

        it 'returns variations with the analysis container ID linked to the matching variation' do
          put('/api/v1/containers/container',
              params: container_params_with_attachment.to_json,
              headers: { 'CONTENT_TYPE' => 'application/json' })

          expect(response.status).to eq 200
          json = JSON.parse(response.body)
          variation = json['variations'].find { |v| v['id'] == '1' }
          expect(variation['metadata']['analyses']).to include(analysis_container.id)
        end
      end

      context 'when a new attachment has a nil filename' do
        let(:dataset_container) { create(:container, container_type: 'dataset', parent: analysis_container) }
        let(:attachment_key) { SecureRandom.uuid }
        let(:container_params_with_nil_filename) do
          {
            container: {
              id: root_container.id,
              container_type: 'root',
              description: '',
              extended_metadata: {},
              children: [{
                id: analyses_container.id,
                container_type: 'analyses',
                description: '',
                extended_metadata: {},
                children: [{
                  id: analysis_container.id,
                  container_type: 'analysis',
                  name: analysis_container.name,
                  description: analysis_container.description,
                  extended_metadata: analysis_container.extended_metadata,
                  children: [{
                    id: dataset_container.id,
                    container_type: 'dataset',
                    name: dataset_container.name,
                    description: dataset_container.description,
                    extended_metadata: {},
                    attachments: [{
                      id: attachment_key,
                      is_new: true,
                      is_deleted: false,
                      filename: nil,
                    }],
                  }],
                }],
              }],
            },
          }
        end

        before do
          # Simulate a pre-existing attachment whose filename is nil (no NOT NULL constraint,
          # no presence validation) rather than creating one with filename: nil directly, which
          # would hit the before_create jcamp-detection callback that assumes a filename.
          attachment = create(:attachment, key: attachment_key, attachable: nil, created_by: user.id)
          attachment.update_columns(filename: nil) # rubocop:disable Rails/SkipsModelValidations
        end

        it 'saves the container without raising and leaves the variation unlinked' do
          put('/api/v1/containers/container',
              params: container_params_with_nil_filename.to_json,
              headers: { 'CONTENT_TYPE' => 'application/json' })

          expect(response.status).to eq 200
          json = JSON.parse(response.body)
          variation = json['variations'].find { |v| v['id'] == '1' }
          expect(variation['metadata']['analyses']).to be_empty
        end
      end

      context 'when a variation-suffixed attachment is saved on a non-dataset container' do
        let(:attachment_key) { SecureRandom.uuid }
        let(:container_params_with_analysis_attachment) do
          {
            container: {
              id: root_container.id,
              container_type: 'root',
              description: '',
              extended_metadata: {},
              children: [{
                id: analyses_container.id,
                container_type: 'analyses',
                description: '',
                extended_metadata: {},
                children: [{
                  id: analysis_container.id,
                  container_type: 'analysis',
                  name: analysis_container.name,
                  description: analysis_container.description,
                  extended_metadata: analysis_container.extended_metadata,
                  attachments: [{
                    id: attachment_key,
                    is_new: true,
                    is_deleted: false,
                    filename: 'protocol-v2.pdf',
                  }],
                  children: [],
                }],
              }],
            },
          }
        end

        before do
          create(:attachment,
                 key: attachment_key,
                 filename: 'protocol-v2.pdf',
                 attachable: nil,
                 created_by: user.id)
        end

        it 'does not link the attachment to any variation' do
          put('/api/v1/containers/container',
              params: container_params_with_analysis_attachment.to_json,
              headers: { 'CONTENT_TYPE' => 'application/json' })

          expect(response.status).to eq 200
          json = JSON.parse(response.body)
          variation = json['variations'].find { |v| v['id'] == '1' }
          expect(variation['metadata']['analyses']).to be_empty
        end
      end

      context 'when a second attachment resolves to an already-linked variation' do
        let(:dataset_container) { create(:container, container_type: 'dataset', parent: analysis_container) }
        let(:first_attachment_key) { SecureRandom.uuid }
        let(:second_attachment_key) { SecureRandom.uuid }

        def dataset_children_for(attachment_key)
          [{
            id: dataset_container.id,
            container_type: 'dataset',
            name: dataset_container.name,
            description: dataset_container.description,
            extended_metadata: {},
            attachments: [{
              id: attachment_key,
              is_new: true,
              is_deleted: false,
              filename: 'spectrum-v1.pdf',
            }],
          }]
        end

        def container_params_for(attachment_key)
          {
            container: {
              id: root_container.id,
              container_type: 'root',
              description: '',
              extended_metadata: {},
              children: [{
                id: analyses_container.id,
                container_type: 'analyses',
                description: '',
                extended_metadata: {},
                children: [{
                  id: analysis_container.id,
                  container_type: 'analysis',
                  name: analysis_container.name,
                  description: analysis_container.description,
                  extended_metadata: analysis_container.extended_metadata,
                  children: dataset_children_for(attachment_key),
                }],
              }],
            },
          }
        end

        before do
          create(:attachment,
                 key: first_attachment_key,
                 filename: 'spectrum-v1.pdf',
                 attachable: nil,
                 created_by: user.id)
        end

        it 'does not resave the reaction when the variation link already exists' do # rubocop:disable RSpec/MultipleExpectations
          put('/api/v1/containers/container',
              params: container_params_for(first_attachment_key).to_json,
              headers: { 'CONTENT_TYPE' => 'application/json' })
          expect(response.status).to eq 200
          updated_at_after_first_link = reaction.reload.updated_at

          create(:attachment,
                 key: second_attachment_key,
                 filename: 'spectrum-v1.pdf',
                 attachable: nil,
                 created_by: user.id)

          put('/api/v1/containers/container',
              params: container_params_for(second_attachment_key).to_json,
              headers: { 'CONTENT_TYPE' => 'application/json' })

          expect(response.status).to eq 200
          json = JSON.parse(response.body)
          variation = json['variations'].find { |v| v['id'] == '1' }
          expect(variation['metadata']['analyses']).to eq([analysis_container.id])
          expect(reaction.reload.updated_at).to eq(updated_at_after_first_link)
        end
      end
    end

    context 'when the root element is not a Reaction' do
      let(:sample_collection) { create(:collection, user: user) }
      let(:sample) { create(:sample, creator: user, collections: [sample_collection]) }
      let(:sample_root_container) { sample.container }

      it 'does not include variations in the response' do
        params = {
          container: {
            id: sample_root_container.id,
            container_type: 'root',
            description: '',
            extended_metadata: {},
            children: [],
          },
        }
        put('/api/v1/containers/container',
            params: params.to_json,
            headers: { 'CONTENT_TYPE' => 'application/json' })

        expect(response.status).to eq 200
        json = JSON.parse(response.body)
        expect(json).to have_key('container')
        expect(json).not_to have_key('variations')
      end
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/NestedGroups
