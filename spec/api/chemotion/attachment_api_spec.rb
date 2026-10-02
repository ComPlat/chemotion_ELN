# frozen_string_literal: true

# rubocop:disable RSpec/NestedGroups
# rubocop:disable RSpec/MultipleMemoizedHelpers
# rubocop:disable RSpec/AnyInstance
# rubocop:disable RSpec/BeforeAfterAll
# rubocop:disable RSpec/LetSetup
# rubocop:disable Naming/VariableNumber

require 'rails_helper'

describe Chemotion::AttachmentAPI do
  include_context 'api request authorization context'

  let(:expected_response) do
    {
      'attachment' => {
        'aasm_state' => attachment.aasm_state,
        'content_type' => attachment.content_type,
        'filename' => attachment.filename,
        'id' => attachment.id,
        'filesize' => attachment.filesize,
        'identifier' => attachment.identifier,
        'thumb' => attachment.thumb,
        # 'thumbnail' => attachment.thumb ? Base64.encode64(attachment.read_thumbnail) : nil,
        # 'created_at' => kind_of(String),
        # 'updated_at' => kind_of(String),
      },
    }
  end

  let(:attachment_id) { attachment.id }

  describe 'DELETE /api/v1/attachments/{attachment_id}' do
    let(:execute_request) { delete "/api/v1/attachments/#{attachment_id}" }

    before do |example|
      if example.metadata[:enable_usecases_attachments_delete].present?
        allow(Usecases::Attachments::Delete).to receive(:execute!)
      end

      execute_request
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when the user has no write access' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when the user has write access' do
      let(:attachment) { create(:attachment, attachable: create(:container, containable: user)) }

      it 'returns with the right http status' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns the deleted attachment' do
        response = parsed_json_response['attachment'].except('created_at', 'updated_at')
        expect(response).to include(expected_response['attachment'])
      end

      it 'deletes the attachment on database', :enable_usecases_attachments_delete do
        expect(Usecases::Attachments::Delete).to have_received(:execute!)
      end
    end
  end

  describe 'DELETE /api/v1/attachments/bulk_delete' do
    let(:attachment_one) { create(:attachment) }
    let(:attachment_two) { create(:attachment) }
    let(:ids) { [attachment_one.id, attachment_two.id] }
    let(:execute_request) do
      delete '/api/v1/attachments/bulk_delete',
             params: { ids: ids }.to_json,
             headers: { 'CONTENT_TYPE' => 'application/json' }
    end

    before do
      execute_request
    end

    context 'when the user has write access' do
      let(:attachment_one) { create(:attachment, attachable: create(:container, containable: user)) }
      let(:attachment_two) { create(:attachment, attachable: create(:container, containable: user)) }

      it 'returns with the right http status' do
        expect(response).to have_http_status(:ok)
      end

      it 'deletes exactly the requested attachments' do
        expect(Attachment.where(id: ids)).to be_empty
      end

      it 'returns the deleted attachments' do
        expect(parsed_json_response['deleted_attachments'].size).to eq(2)
      end
    end

    context 'when the user has no write access' do
      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end

      it 'does not delete any attachment' do
        expect(Attachment.where(id: ids).count).to eq(2)
      end
    end

    context 'when the ids param is missing' do
      let(:execute_request) do
        delete '/api/v1/attachments/bulk_delete',
               params: {}.to_json,
               headers: { 'CONTENT_TYPE' => 'application/json' }
      end

      it 'is rejected by the typed param instead of silently no-op deleting' do
        expect(response).to have_http_status(:bad_request)
      end
    end
  end

  describe 'DELETE /api/v1/attachments/link/{attachment_id}' do
    let(:execute_request) { delete "/api/v1/attachments/link/#{attachment_id}" }

    before do |example|
      if example.metadata[:enable_usecases_attachments_unlink].present?
        allow(Usecases::Attachments::Unlink).to receive(:execute!)
      end

      execute_request
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when the user has no write access' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when the user has write access' do
      let(:container) { create(:container, containable: user) }
      let(:attachment) { create(:attachment, attachable: container) }

      it 'returns with the right http status' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns the deleted attachment' do
        response = parsed_json_response['attachment'].except('created_at', 'updated_at')
        expect(response).to include(expected_response['attachment'])
      end

      it 'unlinks the attachment from container', :enable_usecases_attachments_unlink do
        expect(Usecases::Attachments::Unlink).to have_received(:execute!)
      end
    end
  end

  describe 'POST /api/v1/attachments/upload_chunk' do
    let(:params) do
      {
        file: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt')),
        key: '116d5a66-7188-4527-ba42-9a97edab9dfc',
        counter: 1,
      }
    end

    let(:execute_request) { post '/api/v1/attachments/upload_chunk', params: params }

    before do |example|
      if example.metadata[:enable_usecases_attachments_upload_chunk].present?
        allow(Usecases::Attachments::UploadChunk).to receive(:execute!)
      end

      if example.metadata[:disable_attachment_policy_can_upload_chunk].present?
        allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(false)
      end

      if example.metadata[:enable_attachment_policy_can_upload_chunk].present?
        allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(true)
      end

      execute_request
    end

    context 'when "AttachmentPolicy" denies upload', :disable_attachment_policy_can_upload_chunk do
      let(:expected_response) do
        { 'ok' => false, 'statusText' => 'File key is not valid' }
      end

      it 'returns with the right http status' do
        expect(response).to have_http_status(:created)
      end

      it 'returns a custom error message' do
        expect(parsed_json_response).to eq(expected_response)
      end
    end

    context 'when "AttachmentPolicy" allows upload', :enable_attachment_policy_can_upload_chunk do
      let(:expected_response) { true }

      after { FileUtils.rm_rf(Rails.root.join('tmp/uploads/chunks')) }

      it 'returns with the right http status' do
        expect(response).to have_http_status(:created)
      end

      it 'returns a simple true' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'stores the file', :enable_usecases_attachments_upload_chunk do
        expect(Usecases::Attachments::UploadChunk).to have_received(:execute!)
      end
    end
  end

  describe 'POST /api/v1/attachments/upload_chunk_complete' do
    let(:filename) { 'upload_chunks_completed.txt' }
    let(:key) { '453cc77f-e0e6-4757-b47b-656137eb7084' }
    let(:checksum) { 'adb11f193ccbcb0cfe7d28806bc43e8e' }
    let(:params) { { filename: filename, key: key, checksum: checksum } }

    let(:execute_request) { post '/api/v1/attachments/upload_chunk_complete', params: params }
    let(:chunk_file1) { Rails.root.join('tmp/uploads/chunks', "#{key}$0") }
    let(:chunk_file2) { Rails.root.join('tmp/uploads/chunks', "#{key}$1") }
    let(:simulate_upload_chunks) do
      source = Rails.root.join('spec/fixtures/upload.txt')
      FileUtils.mkdir_p(Rails.root.join('tmp/uploads/chunks'))

      FileUtils.cp(source, chunk_file1)
      FileUtils.cp(source, chunk_file2)
    end

    before do |example|
      simulate_upload_chunks

      if example.metadata[:enable_usecases_attachments_upload_chunk_complete].present?
        allow(Usecases::Attachments::UploadChunkComplete).to receive(:execute!)
      end

      if example.metadata[:disable_attachment_policy_can_upload_chunk].present?
        allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(false)
      end

      if example.metadata[:enable_attachment_policy_can_upload_chunk].present?
        allow(AttachmentPolicy).to receive(:can_upload_chunk?).and_return(true)
      end

      execute_request
    end

    after do
      FileUtils.rm_rf(Rails.root.join('tmp/uploads/full'))
      FileUtils.rm_rf(Rails.root.join('tmp/uploads/chunks'))
    end

    context 'when "AttachmentPolicy" denies upload', :disable_attachment_policy_can_upload_chunk do
      let(:expected_response) do
        { 'ok' => false, 'statusText' => 'File key is not valid' }
      end

      it 'returns with the right http status' do
        expect(response).to have_http_status(:created)
      end

      it 'returns a custom error message' do
        expect(parsed_json_response).to eq(expected_response)
      end
    end

    context 'when "AttachmentPolicy" allows upload but checksum is wrong', :enable_attachment_policy_can_upload_chunk do
      let(:checksum) { 'invalid' }
      let(:expected_response) do
        { 'ok' => false, 'statusText' => ['File upload has error. Please try again!'] }
      end

      it 'returns with the right http status' do
        expect(response).to have_http_status(:created)
      end

      it 'returns a custom error message' do
        expect(parsed_json_response).to eq(expected_response)
      end
    end

    context 'when "AttachmentPolicy" allows upload', :enable_attachment_policy_can_upload_chunk do
      let(:expected_response) do
        { 'ok' => true, 'statusText' => [] }
      end

      it 'returns with the right http status' do
        expect(response).to have_http_status(:created)
      end

      it 'returns a simple true' do
        expect(parsed_json_response).to eq(expected_response)
      end

      it 'create the attachment', :enable_usecases_attachments_upload_chunk_complete do
        expect(Usecases::Attachments::UploadChunkComplete).to have_received(:execute!)
      end
    end
  end

  describe 'POST /api/v1/attachments/upload_to_inbox' do
    let(:user) { create(:person) }
    let(:file_upload) do
      {
        file: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain'),
      }
    end

    context 'when upload works' do
      before do
        post '/api/v1/attachments/upload_to_inbox', params: file_upload
      end

      it 'expecting return code 201' do
        expect(response).to have_http_status :created
      end
    end

    context 'when upload is not allowed' do
      before do
        user.allocated_space = 1
        user.save!
        post '/api/v1/attachments/upload_to_inbox', params: file_upload
      end

      it 'expecting return code 413' do
        expect(response).to have_http_status 413
      end
    end
  end

  describe 'GET /api/v1/attachments/{attachment_id}' do
    let(:owner_user) { create(:person) }
    let(:receiving_user) { logged_in_user }
    let(:shared_collection) do
      create(:collection, user: owner_user, label: 'shared by owner_user').tap do |collection|
        create(:collection_share, collection: collection, shared_with: receiving_user)
      end
    end

    let(:attachment) { create(:attachment, :with_png_image) }

    context 'when attachment is directly linked to the research plan' do
      let(:research_plan) do
        create(:research_plan,
               creator: owner_user,
               attachments: [attachment],
               collections: [shared_collection])
      end

      before do
        research_plan
        get "/api/v1/attachments/#{attachment.id}"
      end

      it 'expecting return code 200' do
        expect(response).to have_http_status :ok
      end

      it 'expecting attachment as binary stream of correct size' do
        expect(response.body.size).to be 318_425
      end
    end

    context 'when attachment is nested in a analysis container' do
      let(:research_plan) do
        create(:research_plan,
               creator: owner_user,
               collections: [shared_collection],
               container: create(:container, :with_jpg_in_dataset))
      end
      let(:attachment) { research_plan.container.children.first.children.first.children.first.attachments.first }

      before do
        get "/api/v1/attachments/#{attachment.id}"
      end

      it 'expecting return code 200' do
        expect(response).to have_http_status :ok
      end

      it 'expecting attachment as binary stream of correct size' do
        expect(response.body.size).to be 163_233
      end
    end
  end

  describe 'GET /api/v1/attachments/zip/{container_id}' do
    let(:user) { create(:person) }
    let(:collection) { create(:collection, user: user) }
    let(:container_id) { sample.container.children[0].children[0].id }
    let(:sample) { create(:sample_with_image_in_analysis, collections: [collection]) }
    let(:execute) { get "/api/v1/attachments/zip/#{container_id}" }
    let(:file_name) { response.header['Content-Disposition'].split('=').last.tr('"', '') }
    let(:file_path) { Rails.root.join("public/zip/#{file_name}") }
    let(:download_file) do
      FileUtils.rm_f(file_path)
      response.stream.each do |e|
        File.write(file_path, e.force_encoding('UTF-8'))
      end
      response.stream.close
    end

    context 'when attachment is not available' do
      let(:other_user) { create(:person) }
      let(:collection) { create(:collection, user: other_user) }

      before do
        execute
      end

      it 'returns error' do
        expect(response).to have_http_status :unauthorized
      end
    end

    context 'when attachment is available' do
      context 'when attachment is image and not annotated' do
        before do
          execute
          download_file
        end

        it 'returns correct statuscode' do
          expect(response).to have_http_status :ok
        end

        it 'zip file contains 2 files' do
          Zip::File.open(file_path) do |entry|
            expect(entry.entries.length).to be 2
          end
        end

        it 'image has correct size' do
          Zip::File.open(file_path) do |entry|
            entry.entries.each do |inner_entry|
              expect(inner_entry.compressed_size).to be 163_143 if inner_entry.name == 'upload.jpg'
            end
          end
        end

        it 'description has correct size' do
          Zip::File.open(file_path) do |entry|
            entry.entries.each do |inner_entry|
              expect(inner_entry.compressed_size).to be 110 if inner_entry.name == 'dataset_description.txt'
            end
          end
        end
      end

      context 'when attachment is image and annotated' do
        let(:sample2) { create(:sample_with_annotated_image_in_analysis, collections: [collection]) }
        let(:execute) { get "/api/v1/attachments/zip/#{sample2.container.children[0].children[0].id}" }

        before do
          execute
          download_file
        end

        it 'returns correct statuscode' do
          expect(response).to have_http_status :ok
        end

        it 'zip file contains 3 files' do
          Zip::File.open(file_path) do |entry|
            expect(entry.entries.length).to be 3
          end
        end
      end
    end
  end

  describe 'GET /api/v1/attachments/sample_analyses/{sample_id}' do
    let(:sample) { create(:sample_with_image_in_analysis, collections: [collection]) }
    let(:execute) { get "/api/v1/attachments/sample_analyses/#{sample.id}" }

    context 'when the sample is in the current user\'s own collection' do
      let(:collection) { create(:collection, user: user) }

      before { execute }

      it 'returns the zip file of analytical attachments' do
        expect(response).to have_http_status(:ok)
        expect(response.header['Content-Type']).to include('application/zip')
      end
    end

    context 'when the sample belongs to another user' do
      let(:other_user) { create(:person) }
      let(:collection) { create(:collection, user: other_user) }

      before { execute }

      it 'is rejected as unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /api/v1/attachments/image/{attachment_id}' do
    let(:non_readable_attachment) { create(:attachment, :with_image) }
    let(:readable_attachment) { create(:attachment, :with_image, created_for: user.id, attachable_type: '') }
    let(:attachment_identifier) { 'none' }

    before do
      get "/api/v1/attachments/image/#{attachment_id}?identifier=#{attachment_identifier}"
    end

    context 'when loading is forbidden' do
      let(:attachment_id) { non_readable_attachment.id }

      it('returning error 401') do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when image not available' do
      let(:attachment_id) { -1 }

      it('returning error 401') do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when loading by id' do
      let(:attachment_id) { readable_attachment.id }

      it('returning status 200') do
        expect(response).to have_http_status(:ok)
      end
    end

    context 'when loading by identifier' do
      let(:attachment_id) { -1 }
      let(:attachment_identifier) { readable_attachment.identifier }

      it('returning status 200') do
        expect(response).to have_http_status(:ok)
      end
    end
  end

  describe 'GET /api/v1/attachments/thumbnail/{attachment_id}' do
    let(:sample) { create(:sample_with_image_in_analysis, collections: [collection]) }
    let(:attachment) { sample.container.children[0].children[0].attachments.first }

    before { get "/api/v1/attachments/thumbnail/#{attachment.id}" }

    context 'when the sample is in the current user\'s own collection' do
      let(:collection) { create(:collection, user: user) }

      it 'returns the thumbnail' do
        expect(response).to have_http_status(:ok)
        expect(response.body).to eq(attachment.thumbnail_base64.to_json)
      end
    end

    context 'when the sample belongs to another user' do
      let(:other_user) { create(:person) }
      let(:collection) { create(:collection, user: other_user) }

      it 'is rejected as unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /api/v1/attachments/thumbnails' do
    let(:collection) { create(:collection, user: user) }
    let(:own_sample) { create(:sample_with_image_in_analysis, collections: [collection]) }
    let(:own_attachment) { own_sample.container.children[0].children[0].attachments.first }

    let(:other_user) { create(:person) }
    let(:other_collection) { create(:collection, user: other_user) }
    let(:foreign_sample) { create(:sample_with_image_in_analysis, collections: [other_collection]) }
    let(:foreign_attachment) { foreign_sample.container.children[0].children[0].attachments.first }

    before do
      post '/api/v1/attachments/thumbnails', params: { ids: [own_attachment.id, foreign_attachment.id] }
    end

    it 'returns the thumbnail for the accessible attachment and nil for the inaccessible one' do
      thumbnails = parsed_json_response['thumbnails']
      expect(thumbnails.length).to eq(2)
      expect(thumbnails[0]['id']).to eq(own_attachment.id)
      expect(thumbnails[1]).to be_nil
    end
  end

  describe 'POST /api/v1/attachments/files' do
    let(:collection) { create(:collection, user: user) }
    let(:own_sample) { create(:sample_with_image_in_analysis, collections: [collection]) }
    let(:own_attachment) { own_sample.container.children[0].children[0].attachments.first }

    let(:other_user) { create(:person) }
    let(:other_collection) { create(:collection, user: other_user) }
    let(:foreign_sample) { create(:sample_with_image_in_analysis, collections: [other_collection]) }
    let(:foreign_attachment) { foreign_sample.container.children[0].children[0].attachments.first }

    context 'when at least one attachment is accessible' do
      before do
        post '/api/v1/attachments/files', params: { ids: [own_attachment.id, foreign_attachment.id] }
      end

      it 'returns the file for the accessible attachment and nil for the inaccessible one' do
        files = parsed_json_response['files']
        expect(files.length).to eq(2)
        expect(files[0]['id']).to eq(own_attachment.id)
        expect(files[1]).to be_nil
      end
    end

    context 'when no attachment is accessible' do
      before do
        post '/api/v1/attachments/files', params: { ids: [foreign_attachment.id] }
      end

      it 'is rejected as unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /api/v1/attachments/regenerate_spectrum' do
    let(:user) { create(:person) }
    let(:container) { create(:container, containable: user) }
    let(:original_attachment) { create(:attachment, :with_spectra_file_failure, attachable: container) }
    let(:generated_attachment) { create(:attachment, :with_spectra_file, attachable: container) }
    let(:spectrum_params) { { original: [], generated: [] } }

    let(:execute_request) { post '/api/v1/attachments/regenerate_spectrum', params: spectrum_params }

    context 'when regenerate without any file content' do
      before do
        execute_request
      end

      it 'returns statuscode 201' do
        expect(response).to have_http_status(:created)
      end
    end

    context 'when regenerate with file id' do
      before do
        spectrum_params[:original] = [original_attachment.id]
        spectrum_params[:generated] = [generated_attachment.id]
        execute_request
      end

      it 'returns statuscode 201' do
        expect(response).to have_http_status(:created)
      end

      it 'old files have been deleted' do
        atts = Attachment.where(filename: original_attachment.filename)
        expect(atts.length).to eq(1)
      end
    end

    context 'when a derived curve is sent as an original' do
      let(:root_attachment) { create(:attachment, filename: 'x_lcms.zip', attachable: container, aasm_state: 'done') }
      let(:derived_curve) do
        # failure is a state set_regenerating accepts, so only the root check keeps it out
        create(:attachment, filename: 'x_lcms_tic.jdx', attachable: container, aasm_state: 'failure',
                            parent: root_attachment)
      end

      before do
        spectrum_params[:original] = [derived_curve.id]
        execute_request
      end

      it 'returns statuscode 201' do
        expect(response).to have_http_status(:created)
      end

      it 'leaves the derived curve to its root instead of regenerating it' do
        expect(derived_curve.reload.aasm_state).to eq('failure')
      end
    end

    context 'when a root row cannot be regenerated' do
      let(:peaked_upload) do
        create(:attachment, filename: 'x_lcms_tic.jdx', attachable: container, aasm_state: 'peaked')
      end

      before do
        spectrum_params[:original] = [peaked_upload.id]
        execute_request
      end

      it 'skips it instead of failing the request' do
        expect(response).to have_http_status(:created)
        expect(peaked_upload.reload.aasm_state).to eq('peaked')
      end
    end
  end

  # writable? runs per attachment in the regenerate loops; its result is memoized per attachable
  # and per root element, so a batch under one element costs one policy check, not one per file.
  describe 'POST /api/v1/attachments/regenerate_spectrum with many attachments of one element' do
    let(:sample) { create(:sample, collections: [create(:collection, user: user)]) }
    let(:containers) { create_list(:container, 2, containable: sample) }
    let!(:attachments) do
      containers.flat_map { |container| create_list(:attachment, 2, :with_spectra_file, attachable: container) }
    end

    before do
      allow(ElementPolicy).to receive(:new).and_call_original
      post '/api/v1/attachments/regenerate_spectrum', params: { original: [], generated: attachments.map(&:id) }
    end

    it 'deletes every attachment' do
      expect(response).to have_http_status(:created)
      expect(Attachment.where(id: attachments.map(&:id))).to be_empty
    end

    it 'evaluates the element policy once' do
      expect(ElementPolicy).to have_received(:new).once
    end
  end

  describe 'POST /api/v1/attachments/save_spectrum' do
    let(:collection) { create(:collection, user: user) }
    let(:sample) { create(:sample, collections: [collection]) }
    let(:container) { create(:container, containable: sample) }
    let(:attachment) { create(:attachment, :with_spectra_file, attachable: container) }

    context 'when parameters are correct' do
      let(:spectrum_params) { JSON.parse(File.read('spec/fixtures/spectrum_param_chloroform_d.json')) }
      let(:execute_request) { post '/api/v1/attachments/save_spectrum', params: spectrum_params }
      let(:generated_attachment_id) { JSON.parse(body)['files'].first['id'] }

      before do
        allow(Chemotion::Jcamp::Create)
          .to receive(:spectrum)
          .and_return([Tempfile.new('test'), Tempfile.new('tmpImage'),
                       nil, nil, nil, nil])
        allow(Chemotion::Jcamp::Gen).to receive(:filename).with(%w[spectra_file jdx], 'edit',
                                                                'jdx').and_return('fakeFile.jdx')
        allow(Chemotion::Jcamp::Gen).to receive(:filename).with(%w[fakeFile jdx], 'infer',
                                                                'json').and_return('fakeFile.json')
        allow(Chemotion::Jcamp::Gen).to receive(:filename).with(%w[spectra_file jdx], 'edit',
                                                                'png').and_return('fakeFile.png')

        spectrum_params['attachment_id'] = attachment.id

        execute_request
      end

      it 'returns statuscode 201' do
        expect(response).to have_http_status(:created)
      end

      it 'new attachment was created' do
        expect(Attachment.find(generated_attachment_id)).not_to be_nil
      end
    end

    # Regression: this endpoint used to run with no authorization check at all, letting any
    # authenticated user regenerate/overwrite spectrum data for an attachment they don't own.
    context 'when the attachment belongs to another user' do
      let(:attachment) { create(:attachment, :with_spectra_file) }
      let(:spectrum_params) { { attachment_id: attachment.id } }

      before { post '/api/v1/attachments/save_spectrum', params: spectrum_params }

      it 'is rejected as unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'GET /api/v1/attachments/{attachment_id}?annotated=true' do
    let(:attachment) { create(:attachment, :with_image, created_for: user.id, attachable_type: '') }

    before do
      get "/api/v1/attachments/#{attachment_id}?annotated=true"
    end

    context 'when attachment not exists' do
      let(:attachment_id) { -1 }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when image attachment has no annotation yet' do
      let(:attachment_id) { attachment.id }

      it('returning status 200') do
        expect(response).to have_http_status(:ok)
      end

      it('expecting that size of returned data equals original file size') do
        expect(response.header['Content-Length'].to_i).to be attachment.attachment_attacher.file.size
      end
    end

    context 'when image attachment has an annotation' do
      let(:attachment) { create(:attachment, :with_annotation, created_for: user.id, attachable_type: '') }
      let(:fixture_path) { Rails.root.join('spec/fixtures/annotations/20221207_valide_annotation_edited.svg') }

      before do
        # TODO: move this to the factory: handling of fixture files for derivatives
        # should be done in the factory
        annotation_path = attachment.annotated_file_location
        FileUtils.rm_f(annotation_path)
        FileUtils.ln_s(fixture_path, annotation_path)

        get "/api/v1/attachments/#{attachment_id}?annotate=true"
      end

      it('returning status 200') do
        expect(response).to have_http_status(:ok)
      end

      it('expecting that size of returned data equals annotated file size') do
        expect(response.header['Content-Length'].to_i).to be File.size(fixture_path)
      end
    end

    context 'when attachment is no image' do
      let(:attachment) { create(:attachment, created_for: user.id, attachable_type: '') }
      let(:attachment_id) { attachment.id }

      it('returning status 200') do
        expect(response).to have_http_status(:ok)
      end

      it('ignores the annotated param and returns the original file') do
        expect(response.header['Content-Length'].to_i).to eq(attachment.attachment_attacher.file.size)
      end
    end
  end

  describe 'POST /api/v1/attachments/infer' do
    let(:attachment) { create(:attachment, :with_spectra_file, created_for: user.id, attachable_type: '') }
    let(:infer_params) { { attachment_id: attachment.id, layout: 'IR' } }

    context 'when parameters are correct' do
      let(:generated_attachment) { create(:attachment, :with_spectra_file) }

      before do
        allow_any_instance_of(Attachment).to receive(:infer_spectrum).and_return('shift' => [])
        allow_any_instance_of(Attachment).to receive(:generate_spectrum).and_return(generated_attachment)

        post '/api/v1/attachments/infer', params: infer_params
      end

      it 'returns statuscode 201' do
        expect(response).to have_http_status(:created)
      end

      it 'returns the inferred prediction and generated attachment' do
        expect(parsed_json_response['predict']).to eq('shift' => [])
        expect(parsed_json_response['files'].first['id']).to eq(generated_attachment.id)
      end
    end

    # Regression: this endpoint used to run with no authorization check at all, letting any
    # authenticated user run spectrum inference against - and read the raw file content of -
    # an attachment they don't own.
    context 'when the attachment belongs to another user' do
      let(:attachment) { create(:attachment, :with_spectra_file) }

      before { post '/api/v1/attachments/infer', params: infer_params }

      it 'is rejected as unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe 'POST /api/v1/attachments/lcms_page' do
    let(:lcms_params) do
      {
        attachment_id: attachment.id,
        retention_time: '1.23',
        polarity: 'positive',
        trigger: 'initial',
      }
    end
    let(:execute_request) do
      post '/api/v1/attachments/lcms_page', params: lcms_params, as: :json
    end

    context 'when attachment does not exist' do
      let(:attachment) { Struct.new(:id).new(-1) }

      before { execute_request }

      it 'returns 404 with structured error' do
        expect(response).to have_http_status(:not_found)
        expect(parsed_json_response['code']).to eq('attachment_not_found')
      end
    end

    context 'when no candidate mz attachment exists' do
      let(:container) { create(:container, containable: user) }
      let(:attachment) { create(:attachment, :with_spectra_file, attachable: container) }

      before do
        allow_any_instance_of(AttachmentHelpers).to receive(:read_access?).and_return(true)
        execute_request
      end

      it 'returns 422 with page_not_found code' do
        expect(response).to have_http_status(:unprocessable_entity)
        expect(parsed_json_response['code']).to eq('page_not_found')
      end
    end
  end

  # GET /api/v1/attachments/svgs (QR code SVG) has no frontend caller left, and the shared
  # `before` block above only grants can_dwnld for zip/*_analyses/plain-attachment URLs - any
  # request to /svgs falls through with can_dwnld staying false, so it unconditionally 401s.
  # Dead and already unreachable; not worth a spec pretending it works.

  describe 'POST /api/v1/attachments/:attachment_id/annotation' do
    let(:attachment) { create(:attachment, :with_image, created_for: user.id, attachable_type: '') }
    let(:annotation_params) do
      image_tag = "<image id=\"original_image\" href=\"/api/v1/attachments/image/#{attachment.id}\"/>"
      # width/height are required: rsvg-convert (used by create_annotated_flat_image) errors
      # with "The SVG has no dimensions" otherwise.
      svg_tag = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\">#{image_tag}</svg>"
      { updated_svg_string: svg_tag }
    end

    context 'when the attachment belongs to the current user' do
      before do
        # Thumbnail regeneration depends on real image-processing tooling and whether a thumbnail
        # derivative already exists; irrelevant to the authorization check under test here.
        allow_any_instance_of(Usecases::Attachments::Annotation::AnnotationUpdater).to receive(:update_thumbnail)

        post "/api/v1/attachments/#{attachment.id}/annotation", params: annotation_params
      end

      it 'returns statuscode 201' do
        expect(response).to have_http_status(:created)
      end
    end

    # Regression: the params block sat inside the route body (and said require, not requires), so
    # it declared nothing and a missing updated_svg_string reached the annotation updater.
    context 'when updated_svg_string is missing' do
      before do
        allow(Usecases::Attachments::Annotation::AnnotationUpdater).to receive(:new).and_call_original
        post "/api/v1/attachments/#{attachment.id}/annotation", params: {}
      end

      it 'is rejected by param validation before touching the annotation' do
        expect(response).to have_http_status(:bad_request)
        expect(Usecases::Attachments::Annotation::AnnotationUpdater).not_to have_received(:new)
      end
    end

    # Regression: this endpoint used to run with no authorization check at all, letting any
    # authenticated user overwrite the annotation SVG of an attachment they don't own.
    context 'when the attachment belongs to another user' do
      let(:attachment) { create(:attachment, :with_image) }

      before { post "/api/v1/attachments/#{attachment.id}/annotation", params: annotation_params }

      it 'is rejected as unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # Regression: unsorted inbox files have attachable_type 'Container' but no attachable_id, so
  # Attachment#root_element is nil and write_access? denies everyone - including the owner, who
  # could no longer delete their own inbox files. No write_access? stub here on purpose.
  describe 'deleting an unsorted inbox file' do
    let(:inbox_attachment) do
      post '/api/v1/attachments/upload_to_inbox',
           params: { file_1: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain') }
      Attachment.find_by!(created_for: user.id, filename: 'upload.txt')
    end

    it 'has the inbox shape' do
      expect(inbox_attachment).to have_attributes(attachable_type: 'Container', attachable_id: nil)
    end

    it 'lets the owner delete it' do
      delete "/api/v1/attachments/#{inbox_attachment.id}"
      expect(response).to have_http_status(:ok)
      expect(Attachment.find_by(id: inbox_attachment.id)).to be_nil
    end

    it 'lets the owner bulk delete it' do
      delete '/api/v1/attachments/bulk_delete',
             params: { ids: [inbox_attachment.id] }.to_json,
             headers: { 'CONTENT_TYPE' => 'application/json' }
      expect(response).to have_http_status(:ok)
      expect(Attachment.find_by(id: inbox_attachment.id)).to be_nil
    end

    it 'lets the owner delete a file unlinked back to the inbox' do
      container = create(:container, containable: user)
      attachment = create(:attachment, attachable: container, created_for: user.id)
      Usecases::Attachments::Unlink.execute!(attachment)

      delete "/api/v1/attachments/#{attachment.id}"
      expect(response).to have_http_status(:ok)
    end

    it 'does not let another user delete it' do
      other_attachment = create(:attachment, attachable: nil, attachable_type: 'Container',
                                             created_for: create(:person).id)
      delete "/api/v1/attachments/#{other_attachment.id}"
      expect(response).to have_http_status(:unauthorized)
      expect(Attachment.find_by(id: other_attachment.id)).not_to be_nil
    end
  end

  # Regression: write_access? ran ElementPolicy#read_dataset?, whose detail-level lookup used a
  # nonexistent sequencebasedmacromolecule_detail_level column, so any non-owner touching an
  # attachment linked directly to an SBMM got a 500 instead of a 401.
  describe 'write access to an attachment linked directly to another user\'s SBMM' do
    let(:sbmm) { create(:uniprot_sbmm) }
    let!(:attachment) { create(:attachment, :with_spectra_file, attachable: sbmm) }

    before do
      owner = create(:person)
      create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: owner,
                                                   collections: [create(:collection, user: owner)])
    end

    it 'rejects delete as unauthorized' do
      delete "/api/v1/attachments/#{attachment.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it 'rejects infer as unauthorized' do
      post '/api/v1/attachments/infer', params: { attachment_id: attachment.id, layout: 'IR' }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'skips the attachment on regenerate_spectrum without failing the request' do
      post '/api/v1/attachments/regenerate_spectrum', params: { original: [], generated: [attachment.id] }
      expect(response).to have_http_status(:created)
      expect(Attachment.find_by(id: attachment.id)).not_to be_nil
    end

    context 'when its sample is in a collection shared with the user with edit rights' do
      before do
        owner = create(:person)
        collection = create(:collection, user: owner)
        create(:collection_share, collection: collection, shared_with: user,
                                  permission_level: CollectionShare.permission_level(:edit_elements))
        create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: owner,
                                                     collections: [collection])
      end

      it 'allows delete' do
        delete "/api/v1/attachments/#{attachment.id}"
        expect(response).to have_http_status(:ok)
      end
    end
  end

  # Regression: writable? used to resolve the element only via the container chain
  # (AttachmentPolicy#write?), so for an attachment linked directly to an element through
  # attachable (ResearchPlan, Wellplate, ...) only its uploader had write access - a collaborator
  # with edit rights on the element was rejected.
  describe 'write access to an attachment linked directly to a shared research plan' do
    let(:owner_user) { create(:person) }
    let(:permission_level) { CollectionShare.permission_level(:edit_elements) }
    let(:shared_collection) do
      create(:collection, user: owner_user).tap do |collection|
        create(:collection_share, collection: collection, shared_with: user, permission_level: permission_level)
      end
    end
    let(:research_plan) { create(:research_plan, creator: owner_user, collections: [shared_collection]) }
    let!(:attachment) do
      create(:attachment, :with_spectra_file, attachable: research_plan, created_for: owner_user.id)
    end
    let(:generated_attachment) { create(:attachment, :with_spectra_file, attachable: research_plan) }

    before do
      allow_any_instance_of(Attachment).to receive(:infer_spectrum).and_return('shift' => [])
      allow_any_instance_of(Attachment).to receive(:generate_spectrum).and_return(generated_attachment)
      allow_any_instance_of(Usecases::Attachments::Annotation::AnnotationUpdater).to receive(:update_annotation)
    end

    context 'when shared with edit_elements and full detail level' do
      it 'allows infer' do
        post '/api/v1/attachments/infer', params: { attachment_id: attachment.id, layout: 'IR' }
        expect(response).to have_http_status(:created)
      end

      it 'allows save_spectrum' do
        post '/api/v1/attachments/save_spectrum', params: { attachment_id: attachment.id }
        expect(response).to have_http_status(:created)
      end

      it 'allows updating the annotation' do
        post "/api/v1/attachments/#{attachment.id}/annotation", params: { updated_svg_string: '<svg/>' }
        expect(response).to have_http_status(:created)
      end

      it 'allows regenerate_spectrum to remove the generated file' do
        post '/api/v1/attachments/regenerate_spectrum', params: { original: [], generated: [attachment.id] }
        expect(response).to have_http_status(:created)
        expect(Attachment.find_by(id: attachment.id)).to be_nil
      end

      it 'allows deleting the attachment' do
        delete "/api/v1/attachments/#{attachment.id}"
        expect(response).to have_http_status(:ok)
      end
    end

    context 'when shared with read_elements only' do
      let(:permission_level) { CollectionShare.permission_level(:read_elements) }

      it 'rejects infer' do
        post '/api/v1/attachments/infer', params: { attachment_id: attachment.id, layout: 'IR' }
        expect(response).to have_http_status(:unauthorized)
      end

      it 'rejects updating the annotation' do
        post "/api/v1/attachments/#{attachment.id}/annotation", params: { updated_svg_string: '<svg/>' }
        expect(response).to have_http_status(:unauthorized)
      end

      it 'leaves the attachment in place on regenerate_spectrum' do
        post '/api/v1/attachments/regenerate_spectrum', params: { original: [], generated: [attachment.id] }
        expect(Attachment.find_by(id: attachment.id)).not_to be_nil
      end

      it 'rejects deleting the attachment' do
        delete "/api/v1/attachments/#{attachment.id}"
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # TODO: Check these specs and remove everything that is already covered by the specs above
  #       Refactor the rest to match the spec structure as shown above
  context 'with legacy specs from spec/api/attachment_api_spec.rb' do
    let(:file_upload) do
      {
        file_1: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain'),
        file_2: fixture_file_upload(Rails.root.join('spec/fixtures/upload.txt'), 'text/plain'),
      }
    end

    let(:img_upload) do
      {
        file_1: fixture_file_upload(Rails.root.join('spec/fixtures/upload.jpg')),
      }
    end

    let(:user) { create(:user, first_name: 'Person', last_name: 'Test') }
    let(:u2) { create(:user) }
    let(:group) { create(:group) }
    let(:c1) { create(:collection, user_id: user.id) }
    let!(:cont_s1_root) { create(:container) }
    let!(:s1) do
      create(:sample_without_analysis, name: 'sample 1', container: cont_s1_root, collections: [c1])
    end

    let!(:cont_s1_analyses) { create(:container, container_type: 'analyses') }
    let!(:cont_s1_analysis) { create(:analysis_container) }
    let!(:new_attachment) do
      create(
        :attachment,
        storage: 'tmp', key: '8580a8d0-4b83-11e7-afc4-85a98b9d0194',
        filename: 'upload.jpg',
        file_path: Rails.root.join('spec/fixtures/upload.jpg'),
        created_by: user.id, created_for: user.id
      )
    end

    let(:new_local_attachment) { build(:attachment, storage: 'local') }

    context 'when authorized user logged in' do
      let(:attachments) do
        Attachment.where(created_by: user, filename: 'upload.txt')
      end

      let(:img_attachments) do
        Attachment.where(created_by: user, filename: 'upload.jpg')
      end

      before do
        allow_any_instance_of(WardenAuthentication).to receive(:current_user)
          .and_return(user)

        cont_s1_root.children << cont_s1_analyses
        cont_s1_root.save!
        cont_s1_analyses.children << cont_s1_analysis
        cont_s1_analyses.save!

        img_attachments.last.update!(
          attachable_id: cont_s1_analysis.id,
          attachable_type: 'Container',
        )
      end

      after(:all) do
        `rm -rf #{Rails.root.join('tmp/test')}`
        puts "delete tmp folder #{Rails.root.join('tmp/test')} "
      end

      describe 'upload files thru POST attachments/upload_dataset_attachments' do
        before do
          post '/api/v1/attachments/upload_dataset_attachments', params: file_upload
        end

        it 'creates attachments for each file' do
          expect(attachments.count).to eq 2
        end

        it 'stores file success' do
          expect(File.exist?(attachments.last.abs_path)).to be true
        end
      end

      describe 'upload img thru POST attachments/upload_dataset_attachments' do
        before do
          post '/api/v1/attachments/upload_dataset_attachments', params: img_upload
          img_attachments.reload.last.update!(
            attachable_id: cont_s1_analysis.id,
            attachable_type: 'Container',
          )
        end

        it 'creates attachments for each file' do
          expect(img_attachments.count).to eq 2
        end

        it 'stores file success' do
          expect(File.exist?(img_attachments.last.abs_path)).to be true
        end

        it 'creates thumbnail localy' do
          expect(File.exist?(img_attachments.last.attachment(:thumbnail).url)).to be true
        end

        describe 'Return Base64 encoded thumbnail' do
          before do
            get "/api/v1/attachments/thumbnail/#{img_attachments.last.id}"
          end

          it 'creates attachments for each file' do
            encoded_thumbnail = Base64.encode64(img_attachments.last.read_thumbnail)
            expect(response.body).to include(encoded_thumbnail.inspect)
          end
        end

        describe 'Return Base64 encoded thumbnails' do
          before do
            params = { ids: [img_attachments.reload.last.id] }
            post '/api/v1/attachments/thumbnails', params: params
          end

          it 'creates attachments for each file' do
            encoded_thumbnail = Base64.encode64(img_attachments.last.read_thumbnail)
            expect(response.body).to include(encoded_thumbnail.inspect)
          end
        end
      end
    end
  end
end

class ThumbnailerMock
  def create_thumbnail(tmp_path)
    tmp_path
  end
end
# rubocop:enable RSpec/NestedGroups
# rubocop:enable RSpec/MultipleMemoizedHelpers
# rubocop:enable RSpec/AnyInstance
# rubocop:enable RSpec/BeforeAfterAll
# rubocop:enable RSpec/LetSetup
# rubocop:enable Naming/VariableNumber
