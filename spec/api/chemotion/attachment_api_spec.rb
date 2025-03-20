# frozen_string_literal: true

# rubocop:disable Rspec/NestedGroups
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

      if example.metadata[:enable_attachment_policy_can_delete].present?
        allow(AttachmentPolicy).to receive(:can_delete?).and_return(true)
      end

      execute_request
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when "AttachmentPolicy" denies deletion' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when "AttachmentPolicy" allows deletion', :enable_attachment_policy_can_delete do
      let(:attachment) { create(:attachment) }

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

  describe 'DELETE /api/v1/attachments/link/{attachment_id}' do
    let(:execute_request) { delete "/api/v1/attachments/link/#{attachment_id}" }

    before do |example|
      if example.metadata[:enable_usecases_attachments_unlink].present?
        allow(Usecases::Attachments::Unlink).to receive(:execute!)
      end

      if example.metadata[:enable_attachment_policy_can_delete].present?
        allow(AttachmentPolicy).to receive(:can_delete?).and_return(true)
      end

      execute_request
    end

    context 'when attachment not exists' do
      let(:attachment_id) { 666 }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when "AttachmentPolicy" denies deletion' do
      let(:attachment) { create(:attachment) }

      it 'returns with an error' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when "AttachmentPolicy" allows deletion', :enable_attachment_policy_can_delete do
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
      create(:collection,
             user_id: receiving_user.id,
             is_shared: true,
             shared_by_id: owner_user.id,
             is_locked: true,
             permission_level: 0,
             label: 'shared by owner_user')
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
    let(:container_id) { sample.container.children[0].children[0].id }
    let(:sample) { create(:sample_with_image_in_analysis) }
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

    before do |example|
      if example.metadata[:enable_download_access].present?
        allow_any_instance_of(ElementPolicy).to receive(:read?).and_return(true)
        allow_any_instance_of(ElementPermissionProxy).to receive(:read_dataset?).and_return(true)
      end
    end

    context 'when attachment is not available' do
      before do
        execute
      end

      it 'returns error' do
        expect(response).to have_http_status :unauthorized
      end
    end

    context 'when attachment is available', :enable_download_access do
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
        let(:sample2) { create(:sample_with_annotated_image_in_analysis) }
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
    pending 'not yet implemented'
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
    pending 'not yet implemented'
  end

  describe 'POST /api/v1/attachments/thumbnails' do
    pending
  end

  describe 'POST /api/v1/attachments/files' do
    pending 'not yet implemented'
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
  end

  describe 'POST /api/v1/attachments/save_spectrum' do
    let(:attachment) { create(:attachment, :with_spectra_file) }

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
      pending 'not yet implemented'
    end
  end

  describe 'POST /api/v1/attachments/infer' do
    pending 'not yet implemented'
  end

  describe 'GET /api/v1/attachments/svgs' do
    pending 'not yet implemented'
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
      create(:sample_without_analysis, name: 'sample 1', container: cont_s1_root)
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

        CollectionsSample.create!(sample: s1, collection: c1)

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
# rubocop:enable Rspec/NestedGroups
# rubocop:enable RSpec/MultipleMemoizedHelpers
# rubocop:enable RSpec/AnyInstance
# rubocop:enable RSpec/BeforeAfterAll
# rubocop:enable RSpec/LetSetup
# rubocop:enable Naming/VariableNumber
