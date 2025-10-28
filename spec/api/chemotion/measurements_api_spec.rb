# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::MeasurementsAPI do
  context 'with authorized user' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/measurements/' do
      let(:root_sample) { create(:sample, creator: user, collections: [collection]) }
      let(:child_sample) { create(:sample, creator: user, parent: root_sample, collections: [collection]) }
      let(:research_plan1) { create(:research_plan) }
      let(:research_plan2) { create(:research_plan) }
      let(:root_sample_measurement) { create(:measurement, source: research_plan1, sample: root_sample) }
      let(:child_sample_measurement) { create(:measurement, source: research_plan2, sample: child_sample) }
      let(:collection) { create(:collection, user_id: user.id) }

      context 'when requesting measurements' do
        before do
          root_sample_measurement
          child_sample_measurement
        end

        it 'requires at least a sample_id' do
          get '/api/v1/measurements/'
          body = JSON.parse(response.body)

          expect(body['error']).to eq 'sample_id is missing'
        end

        context 'when show_hierarchy is true' do
          it 'returns all measurements within the ancestry tree of the samples root sample' do
            get '/api/v1/measurements', params: { sample_id: child_sample.id }
            body = JSON.parse(response.body)

            expect(body['measurements'].size).to eq 2
            expect(body['measurements'][0]['id']).to eq root_sample.id
            expect(body['measurements'][1]['id']).to eq child_sample.id
          end
        end

        context 'when show_hierarchy is false' do
          it 'returns only the measurements for the current sample' do
            get '/api/v1/measurements', params: { sample_id: child_sample.id, show_hierarchy: false }
            body = JSON.parse(response.body)

            expect(body['measurements'].size).to eq 1
            expect(body['measurements'][0]['id']).to eq child_sample.id
          end
        end

        context 'when source parameters are present' do
          it 'returns only measurements origining from the given source' do
            get '/api/v1/measurements', params: {
              sample_id: child_sample.id, source_type: 'research_plan', source_id: research_plan1.id
            }
            body = JSON.parse(response.body)

            expect(body['measurements'].size).to eq 1
            expect(body['measurements'][0]['id']).to eq root_sample.id
          end
        end
      end
    end

    describe 'POST /api/v1/measurements/bulk_create_from_raw_data' do
      let(:collection) { create(:collection, user_id: user.id) }
      let(:sample) { create(:sample, creator: user, collections: [collection]) }
      let(:wellplate) { create(:wellplate, :with_random_wells, number_of_readouts: 3, sample: sample, collections: [collection]) }
      let(:raw_data) do
        wellplate.wells.map do |well|
          well.readouts.map.with_index do |readout, readout_index|
            {
              uuid: SecureRandom.uuid,
              description: wellplate.readout_titles[readout_index],
              sample_identifier: well.sample.short_label,
              unit: readout['unit'],
              value: readout['value']
            }.with_indifferent_access
          end
        end.flatten
      end
      let(:research_plan) { create(:research_plan, collections: [collection]) }
      let(:params) do
        { raw_data: raw_data, source_type: 'research_plan', source_id: research_plan.id }
      end
      let(:parsed_response) { JSON.parse(response.body) }
      let(:execute_request) { post "/api/v1/measurements/bulk_create_from_raw_data", params: params, as: :json }

      before do
        research_plan
        wellplate
        sample
      end

      it 'creates measurements from the given well' do
        expect { execute_request }.to change(Measurement, :count).by(96*3)

        measurements = Measurement.last(96*3)
        well = wellplate.wells.first

        (0..2).each do |i|
          expect(measurements[i].description).to eq wellplate.readout_titles[i]
          expect(measurements[i].sample_id).to eq well.sample_id
          expect(measurements[i].unit).to eq well.readouts[i]['unit']
          expect(measurements[i].value.to_f).to eq well.readouts[i]['value']
        end
      end

      it 'returns the data in the right format' do
        execute_request

        expect(parsed_response).to have_key('measurements')

        all_results_match_expected_structure = parsed_response['measurements'].all? do |measurement|
          measurement.key?('errors') &&
            measurement.key?('uuid') &&
            measurement.key?('sample_identifier') &&
            measurement.key?('unit') &&
            measurement.key?('value') &&
            measurement.key?('source_type') &&
            measurement.key?('source_id')
        end
      end
    end

    describe 'DELETE /api/v1/measurements/MEASUREMENT_ID' do
      let(:root_sample) { create(:sample, creator: user, collections: [create(:collection, user: user)]) }
      let(:research_plan) { create(:research_plan) }
      let(:root_sample_measurement) { create(:measurement, source: research_plan, sample: root_sample) }

      before do
        root_sample_measurement
        delete "/api/v1/measurements/#{root_sample_measurement.id}"
        root_sample_measurement.reload
      end

      it 'deletes the measurement' do
        expect(root_sample_measurement.deleted_at).not_to be nil
      end
    end
  end
end
