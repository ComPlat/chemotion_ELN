# frozen_string_literal: true

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
      `rm -rf #{File.join(Rails.root, 'tmp', 'test')}`
      puts "delete tmp folder #{File.join(Rails.root, 'tmp', 'test')} "
    end

    describe 'check if the current user is the container owner before removing the linkage between container and attachments' do
      it 'the current user is the container owner, returns 200 status code' do
        params = { container_id: cont_login_inbox.id, attachments: cont_login_inbox.attachments }
        patch(
          '/api/v1/containers', params.to_json,
          'CONTENT_TYPE' => 'application/json'
        )
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
        patch(
          '/api/v1/containers', params.to_json,
          'CONTENT_TYPE' => 'application/json'
        )
        expect(response.status).to eq 401
      end
    end
  end
end
