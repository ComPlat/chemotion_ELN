require 'rails_helper'

describe Chemotion::AdminAPI do
  context 'with authorized admin user logged in' do
    let!(:admin1) { create(:admin) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin1)
    end

    describe 'DelayedJob' do
      before(:all) do
        RefreshElementTagJob.perform_later
      end

      it 'list queued jobs' do
        get '/api/v1/admin/jobs'
        json_response = JSON.parse(response.body)
        expect(json_response).not_to be_empty
        expect(response.status).to eq 200
        expect(json_response['jobs'].size).to eq 1
      end

      # in test Delayed Jobs will not automatically recover from errors -> rescue
      xit 'let job fail' do
        TestFailureJob.perform_later
        success, failure = Delayed::Worker.new.work_off
        expect([success, failure]).to eq [1, 1]
      end

      it 'restart (failed) job' do
        put '/api/v1/admin/jobs/restart', params: { id: Delayed::Job.select(:id).where(queue: 'test') }
      rescue RuntimeError => e
        expect(response.status).to eq 200
      end
    end
  end
end
