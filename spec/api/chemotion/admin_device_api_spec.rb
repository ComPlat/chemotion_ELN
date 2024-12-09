# frozen_string_literal: true

RSpec.describe Chemotion::AdminDeviceAPI do
  let!(:admin1) { create(:admin) }
  let(:warden_instance) { instance_double(WardenAuthentication) }
  let(:person) { create(:person) }
  let(:device) { create(:device, people: [person]) }
  let(:device_with_sftp) { create(:device, :file_sftp) }
  let(:sftp_double) { double('sftp').as_null_object } # rubocop:disable RSpec/VerifiedDoubles

  before do
    allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
    allow(warden_instance).to receive(:current_user).and_return(admin1)
  end

  describe 'GET /api/v1/admin_devices' do
    before do
      device
    end

    context 'with no params' do
      it 'fetches all devices' do
        get '/api/v1/admin_devices'
        expect(parsed_json_response['devices'].size).to be(1)
      end
    end

    context 'with params by name' do
      it 'fetches max 5 devices by name' do
        queried_name = URI::DEFAULT_PARSER.escape device.name[-3..].downcase
        get "/api/v1/admin_devices/byname?name=#{queried_name}&limit=5"
        expect(parsed_json_response['devices'].size).to be(1)
      end
    end

    context 'with params id' do
      it 'fetches device by id' do
        get "/api/v1/admin_devices/#{device.id}"
        expect(parsed_json_response['device']['name']).to eql(device.name)
      end
    end
  end

  describe 'POST /api/v1/admin_devices' do
    let(:device_params) do
      {
        name: 'Device Two',
        name_abbreviation: 'dt',
      }
    end

    let(:expected_result) do
      {
        name: 'Device Two',
        name_abbreviation: 'dt',
      }.stringify_keys
    end

    it 'creates a device' do
      post '/api/v1/admin_devices', params: device_params
      expect(parsed_json_response['device']).to include(expected_result)
    end

    context 'when testing sftp connection' do
      let(:params) do
        {
          id: device_with_sftp.id,
          datacollector_method: device_with_sftp.datacollector_method,
          datacollector_host: device_with_sftp.datacollector_host,
          datacollector_user: device_with_sftp.datacollector_user,
          datacollector_authentication: device_with_sftp.datacollector_authentication,
          datacollector_key_name: device_with_sftp.datacollector_key_name,
        }
      end

      it 'returns a valid connection' do
        # allow(Net::SFTP).to receive(:start).with(
        #  device_with_sftp.datacollector_host,
        #  device_with_sftp.datacollector_user,
        #  key_data: [],
        #  keys: Pathname.new(device_with_sftp.datacollector_key_name),
        #  keys_only: true,
        #  non_interactive: true,
        #  timeout: 5,
        # ).and_return(sftp_double)

        post '/api/v1/admin_devices/test_sftp', params: params
        expect(parsed_json_response['status']).to include('success')
      end
    end
  end

  describe 'PUT /api/v1/admin_devices/:id' do
    context 'when updating an device' do
      let(:params) do
        {
          name: 'Device One - edit',
          name_abbreviation: 'dto',
        }
      end

      it 'returns the updated device' do
        put "/api/v1/admin_devices/#{device.id}", params: params
        expect(parsed_json_response['device']).to include(params.stringify_keys)
      end
    end

    context 'when deleting user device relation' do
      let(:params) do
        {
          id: person.id,
          device_id: device.id,
        }
      end

      it 'deletes user device relation' do
        put "/api/v1/admin_devices/delete_relation/#{person.id}", params: params
        expect(device.users_devices.size).to be(0)
      end
    end
  end

  describe 'DELETE /api/v1/admin_devices/:id' do
    it 'deletes the device' do
      delete "/api/v1/admin_devices/#{device.id}"
      expect(parsed_json_response).to include('deleted' => device.id)
    end
  end
end
