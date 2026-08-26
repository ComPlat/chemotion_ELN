# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PublicAPI do
  describe 'GET /api/v1/public/ping' do
    before { get('/api/v1/public/ping', params: '', headers: { 'AUTHORIZATION' => 'Bearer qwerty' }) }

    it 'responds 204' do
      expect(response).to have_http_status :no_content
    end
  end

  describe 'POST /api/v1/public/token' do
    subject(:execute_request) { post('/api/v1/public/token', params: params) }

    let(:build_user) { create(:person) }
    let(:params) do
      {
        username: build_user.name_abbreviation,
        password: 'testtest',
      }
    end

    context 'when use case returns a token' do
      before do
        allow(JsonWebToken).to receive(:encode).and_return('my-token')
        execute_request
      end

      it 'responds 201' do
        expect(response).to have_http_status :created
      end

      it 'responds a hash with a token' do
        expect(parsed_json_response).to eq({ 'token' => 'my-token' })
      end
    end

    context 'when use case returns nil' do
      before do
        allow(Usecases::Public::BuildToken).to receive(:execute!).and_return(nil)
        execute_request
      end

      it 'responds an error' do
        expect(response).to have_http_status :unauthorized
      end
    end
  end

  describe 'GET /api/v1/public/workshop_guide/available' do
    subject(:execute_request) { get('/api/v1/public/workshop_guide/available') }

    let(:home_md) { Rails.public_path.join('workshop', 'home.md') }
    let(:home_md_backup) { Rails.root.join('tmp/home_md_backup.md') }

    around do |example|
      had_home_md = home_md.exist?
      FileUtils.mv(home_md, home_md_backup) if had_home_md
      begin
        example.run
      ensure
        FileUtils.rm_f(home_md)
        FileUtils.mv(home_md_backup, home_md) if had_home_md
      end
    end

    context 'when workshop content has not been synced' do
      before do
        FileUtils.rm_f(home_md)
        execute_request
      end

      it 'responds 200 with available: false' do
        expect(response).to have_http_status :ok
        expect(parsed_json_response).to eq({ 'available' => false })
      end
    end

    context 'when workshop content has been synced' do
      before do
        FileUtils.mkdir_p(home_md.dirname)
        FileUtils.touch(home_md)
        execute_request
      end

      after { FileUtils.rm_f(home_md) }

      it 'responds 200 with available: true' do
        expect(response).to have_http_status :ok
        expect(parsed_json_response).to eq({ 'available' => true })
      end
    end
  end

  describe 'GET /api/v1/public/logo/alternate' do
    subject(:execute_request) { get('/api/v1/public/logo/alternate') }

    let(:logos_dir) { Rails.public_path.join('logos') }
    let(:candidates) { Chemotion::PublicAPI::ALTERNATE_LOGO_FILES.map { |name| logos_dir.join(name) } }

    # public/logos also holds committed assets, so every candidate is moved aside for the
    # duration of the example and put back afterwards -- never simply deleted.
    around do |example|
      backups = candidates.select(&:exist?).to_h { |path| [path, Rails.root.join("tmp/#{path.basename}.bak")] }
      backups.each { |path, backup| FileUtils.mv(path, backup) }
      begin
        example.run
      ensure
        candidates.each { |path| FileUtils.rm_f(path) }
        backups.each { |path, backup| FileUtils.mv(backup, path) }
      end
    end

    def write_logo(name)
      FileUtils.mkdir_p(logos_dir)
      FileUtils.touch(logos_dir.join(name))
    end

    context 'when no alternate logo is present' do
      before { execute_request }

      # 200 with a null src, not a 404: the client must be able to ask without the browser
      # logging a failed resource load on every stock instance.
      it 'responds 200 with a null src' do
        expect(response).to have_http_status :ok
        expect(parsed_json_response).to eq({ 'src' => nil })
      end
    end

    context 'when a PNG alternate logo is present' do
      before do
        write_logo('chemotion-alternate.png')
        execute_request
      end

      it 'responds 200 with the public path of the file' do
        expect(response).to have_http_status :ok
        expect(parsed_json_response).to eq({ 'src' => '/logos/chemotion-alternate.png' })
      end
    end

    context 'when both an SVG and a PNG are present' do
      before do
        write_logo('chemotion-alternate.svg')
        write_logo('chemotion-alternate.png')
        execute_request
      end

      it 'prefers the SVG' do
        expect(parsed_json_response).to eq({ 'src' => '/logos/chemotion-alternate.svg' })
      end
    end
  end
end
