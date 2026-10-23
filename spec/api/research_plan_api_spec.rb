# frozen_string_literal: true

# rubocop:disable RSpec/NestedGroups

require 'rails_helper'

describe Chemotion::ResearchPlanAPI do
  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/research_plans/:id' do
      context 'with appropriate permissions' do
        let!(:c) { create(:collection, user_id: user.id) }
        let!(:research_plan) { create(:research_plan) }

        before do
          CollectionsResearchPlan.create!(research_plan: research_plan, collection: c)

          get "/api/v1/research_plans/#{research_plan.id}"
        end

        it 'returns 200 status code' do
          expect(response.status).to eq 200
        end

        it 'returns serialized research_plan' do
          expect(JSON.parse(response.body)['research_plan']['name']).to eq research_plan.name
        end

        it 'returns can_update as true for the owner' do
          expect(JSON.parse(response.body)['research_plan']['can_update']).to be true
        end
      end

      context 'when the research plan is in a read-only shared collection' do
        let(:other_user) { create(:person) }
        let(:collection) do
          create(:collection, user: other_user).tap do |c|
            create(:collection_share, collection: c, shared_with: user,
                                      permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements])
          end
        end
        let(:research_plan) { create(:research_plan, collections: [collection]) }

        before { get "/api/v1/research_plans/#{research_plan.id}" }

        it 'returns can_update as false' do
          expect(response).to have_http_status :ok
          expect(JSON.parse(response.body)['research_plan']['can_update']).to be false
        end
      end

      context 'when the research plan is in a writable shared collection' do
        let(:other_user) { create(:person) }
        let(:collection) do
          create(:collection, user: other_user).tap do |c|
            create(:collection_share, collection: c, shared_with: user,
                                      permission_level: CollectionShare::PERMISSION_LEVELS[:edit_elements])
          end
        end
        let(:research_plan) { create(:research_plan, collections: [collection]) }

        before { get "/api/v1/research_plans/#{research_plan.id}" }

        it 'returns can_update as true' do
          expect(response).to have_http_status :ok
          expect(JSON.parse(response.body)['research_plan']['can_update']).to be true
        end
      end
    end

    describe 'POST /api/v1/research_plans' do
      context 'with valid parameters' do
        let(:params) do
          {
            name: 'test',
            container: {
              attachments: [],
              children: [],
              is_new: true,
              is_deleted: false,
              name: 'new',
            },
          }
        end

        before { post '/api/v1/research_plans', params: params, as: :json }

        it 'is able to create a new research plan' do
          rp = ResearchPlan.find_by(name: 'test')
          expect(rp).not_to be_nil
          params.delete(:container)
          params.each do |k, v|
            expect(rp.attributes.symbolize_keys[k]).to eq(v)
          end
        end

        it 'sets the creator' do
          rp = ResearchPlan.find_by(name: 'test')
          expect(rp.creator).to eq(user)
        end

        it 'returns serialized research_plan body' do
          expect(JSON.parse(response.body)['research_plan']).not_to be_nil
          rp = ResearchPlan.find_by(name: 'test')
          policy = ElementPolicy.new(user, rp)
          expected = Entities::ResearchPlanEntity.represent(rp, root: 'research_plan', policy: policy)
          expect(response.body).to eq JSON.generate(expected)
        end
      end

      context 'when copying attachments' do
        let(:collection) { create(:collection, user: user) }
        let(:owner) { create(:person) }
        let(:source_collection) { create(:collection, user: owner) }
        let(:source_plan) { create(:research_plan, creator: owner, collections: [source_collection]) }
        let!(:source) { create(:attachment, :with_png_image, attachable: source_plan, created_for: owner.id) }
        let(:params) do
          {
            name: 'Copied Plan',
            collection_id: collection.id,
            container: { attachments: [], children: [], is_new: true, is_deleted: false, name: 'new' },
            body: [{ type: 'image', value: { public_name: source.identifier } }],
            attachments: [{ id: source.id }],
          }
        end

        def attachment_files
          Shrine.storages.values.flat_map do |storage|
            Dir.glob(storage.directory.join('**', '*')).select { |path| File.file?(path) }
          end.uniq.sort
        end

        def expect_atomic_copy_failure(request_params, status)
          files_before = attachment_files
          expect do
            post '/api/v1/research_plans', params: request_params, as: :json
          end.not_to(change { [ResearchPlan.count, Container.count, Attachment.count, CollectionsResearchPlan.count] })

          expect(response).to have_http_status(status)
          expect(attachment_files).to eq(files_before)
        end

        context 'when reporting omitted attachments' do
          it 'reports the same warning for missing and unreadable IDs without exposing their details' do
            params[:body] = []
            post '/api/v1/research_plans', params: params, as: :json
            unreadable_result = JSON.parse(response.body).except('research_plan')

            params[:attachments] = [{ id: -1 }]
            post '/api/v1/research_plans', params: params, as: :json

            expect(response).to have_http_status(:created)
            expect(unreadable_result).to eq('attachments_omitted' => true)
            expect(JSON.parse(response.body).except('research_plan')).to eq(unreadable_result)
          end

          it 'also reports unreadable body images when no attachment IDs are supplied' do
            params.delete(:attachments)
            post '/api/v1/research_plans', params: params, as: :json

            expect(response).to have_http_status(:created)
            expect(JSON.parse(response.body)['attachments_omitted']).to be true
            expect(ResearchPlan.find_by!(name: 'Copied Plan').body).to eq([])
          end

          it 'does not reveal whether a deleted ID matches an unreadable body image' do
            params[:attachments].first[:is_deleted] = true
            post '/api/v1/research_plans', params: params, as: :json
            unreadable_result = JSON.parse(response.body).except('research_plan')

            params[:attachments] = [{ id: -1, is_deleted: true }]
            post '/api/v1/research_plans', params: params, as: :json

            expect(unreadable_result).to eq('attachments_omitted' => true)
            expect(JSON.parse(response.body).except('research_plan')).to eq(unreadable_result)
          end

          context 'when the attachments are readable' do
            let(:owner) { user }

            it 'does not report omissions for successfully copied attachments' do
              post '/api/v1/research_plans', params: params, as: :json

              expect(response).to have_http_status(:created)
              expect(JSON.parse(response.body)).not_to have_key('attachments_omitted')
              expect(ResearchPlan.find_by!(name: 'Copied Plan').attachments.count).to eq(1)
            end

            it 'does not report attachments that were deliberately deleted' do
              params[:attachments].first[:is_deleted] = true
              post '/api/v1/research_plans', params: params, as: :json

              expect(response).to have_http_status(:created)
              expect(JSON.parse(response.body)).not_to have_key('attachments_omitted')
              expect(ResearchPlan.find_by!(name: 'Copied Plan').body).to eq([])
            end
          end
        end

        context 'when requested attachments are marked as deleted' do
          let(:owner) { user }

          it 'does not copy the file, annotation, or body image' do
            params[:attachments].first[:is_deleted] = true
            post '/api/v1/research_plans', params: params, as: :json

            copied_plan = ResearchPlan.find_by!(name: 'Copied Plan')
            expect(response).to have_http_status(:created)
            expect(copied_plan.attachments).to be_empty
            expect(copied_plan.body).to eq([])
          end
        end

        context 'when an attachment request is malformed' do
          it 'rejects a string entry before creating any records or files' do
            request_params = params.merge(attachments: [source.id.to_s])

            expect_atomic_copy_failure(request_params, :bad_request)
          end

          it 'rejects invalid entries before creating any records or files' do
            request_params = params
            request_params[:attachments] = [source.id]

            expect_atomic_copy_failure(request_params, :bad_request)
          end

          it 'rejects an object used as an attachment ID' do
            request_params = params
            request_params[:attachments] = [{ id: { unexpected: 'value' } }]

            expect_atomic_copy_failure(request_params, :bad_request)
          end
        end

        context 'when copying readable files' do
          let(:owner) { user }

          it 'rolls back the plan and its container when a source has no file' do
            missing = create(:attachment, attachable: source_plan, file_path: nil, file_data: nil)
            request_params = params.merge(attachments: [{ id: source.id }, { id: missing.id }])

            expect_atomic_copy_failure(request_params, :unprocessable_entity)
          end

          it 'cleans up an earlier copy when a later stored file is missing' do
            missing = create(:attachment, attachable: source_plan)
            missing.attachment.delete
            request_params = params.merge(attachments: [{ id: source.id }, { id: missing.id }])

            expect_atomic_copy_failure(request_params, :unprocessable_entity)
          end

          it 'rolls back earlier copies when a later copy exceeds the user quota' do
            small = create(:attachment, attachable: source_plan, created_for: user.id)
            request_params = params.merge(attachments: [{ id: small.id }, { id: source.id }])
            user.update!(used_space: 0, allocated_space: small.filesize + 1)

            expect_atomic_copy_failure(request_params, :unprocessable_entity)
          end

          it 'cleans up the copied image and annotation when a later creation step fails' do
            request_params = params
            copier = Usecases::Attachments::Copy.new(request_params[:attachments], user)
            allow(Usecases::Attachments::Copy).to receive(:new).and_return(copier)
            allow(copier).to receive(:execute!).and_wrap_original do |execute, *arguments|
              execute.call(*arguments)
              raise Usecases::Attachments::Copy::Error, 'Later creation step failed'
            end

            expect_atomic_copy_failure(request_params, :unprocessable_entity)
          end

          it 'keeps a body image uploaded into the new plan\'s own dataset' do
            upload = create(:attachment, :with_png_image, attachable: nil, created_for: user.id)
            request_params = params.merge(attachments: [], body: [
                                            { type: 'image', value: { public_name: upload.identifier } },
                                          ])
            request_params[:container][:children] = [{
              is_new: true, container_type: 'dataset', extended_metadata: {},
              attachments: [{ id: upload.key, is_new: true }]
            }]
            post '/api/v1/research_plans', params: request_params, as: :json

            copied_plan = ResearchPlan.find_by!(name: 'Copied Plan')
            expect(response).to have_http_status(:created)
            expect(upload.reload.root_element).to eq(copied_plan)
            expect(copied_plan.body.first.dig('value', 'public_name')).to eq(upload.identifier)
          end
        end

        context 'when the source research plan is not readable' do
          it 'creates the plan without copying the attachment or its annotation' do
            expect do
              post '/api/v1/research_plans', params: params, as: :json
            end.not_to change(Attachment, :count)

            expect(response).to have_http_status(:created)
            expect(ResearchPlan.find_by!(name: 'Copied Plan').attachments).to be_empty
          end

          it 'removes the skipped image from the body and exported document' do
            post '/api/v1/research_plans', params: params, as: :json

            copied_plan = ResearchPlan.find_by!(name: 'Copied Plan')
            html = Export::ExportResearchPlan.new(user, copied_plan, :html).to_html

            expect(copied_plan.body).to eq([])
            expect(html).not_to include(source.attachment.url)
            expect(Nokogiri::HTML(html).css('img')).to be_empty
          end
        end

        context 'when the attachment ID does not exist' do
          it 'creates the plan without copying any attachment' do
            params[:attachments] = [{ id: -1 }]

            expect do
              post '/api/v1/research_plans', params: params, as: :json
            end.not_to change(Attachment, :count)

            expect(response).to have_http_status(:created)
            expect(ResearchPlan.find_by!(name: 'Copied Plan').attachments).to be_empty
          end

          it 'also removes unreadable body references when the supplied ID is missing' do
            params[:attachments] = [{ id: -1 }]
            post '/api/v1/research_plans', params: params, as: :json

            copied_plan = ResearchPlan.find_by!(name: 'Copied Plan')
            expect(copied_plan.body).to eq([])
            expect(Export::ExportResearchPlan.new(user, copied_plan, :html).to_html)
              .not_to include(source.attachment.url)
          end
        end

        context 'when the source research plan is shared read-only' do
          let(:detail_level) { 10 }

          before do
            create(:collection_share, collection: source_collection, shared_with: user,
                                      permission_level: CollectionShare.permission_level(:read_elements),
                                      researchplan_detail_level: detail_level)
          end

          it 'copies the readable file and annotation and updates the body reference' do
            post '/api/v1/research_plans', params: params, as: :json

            expect(response).to have_http_status(:created)
            copied_plan = ResearchPlan.find_by!(name: 'Copied Plan')
            copy = copied_plan.attachments.take!
            expect([copy.read_file, copy.attachment(:annotation).read]).to match(
              [source.read_file, a_string_including("/api/v1/attachments/image/#{copy.id}")],
            )
            expect(copied_plan.body.first.dig('value', 'public_name')).to eq(copy.identifier)
          end

          context 'when the share does not allow reading datasets' do
            let(:detail_level) { 2 }

            it 'does not copy the attachment' do
              expect do
                post '/api/v1/research_plans', params: params, as: :json
              end.not_to change(Attachment, :count)

              expect(response).to have_http_status(:created)
            end

            it 'does not export the skipped source image from the copied plan' do
              post '/api/v1/research_plans', params: params, as: :json

              copied_plan = ResearchPlan.find_by!(name: 'Copied Plan')
              html = Export::ExportResearchPlan.new(user, copied_plan, :html).to_html

              expect(copied_plan.body).to eq([])
              expect(html).not_to include(source.attachment.url)
              expect(Nokogiri::HTML(html).css('img')).to be_empty
            end
          end
        end

        context 'when the request also includes a readable attachment' do
          let!(:readable_source) do
            create(:attachment, attachable: create(:research_plan, creator: user, collections: [collection]))
          end

          it 'copies only the readable attachment and skips unknown IDs' do
            params[:attachments].unshift({ id: -1 })
            params[:attachments] << { id: readable_source.id }
            params[:attachments] << { id: -2 }

            expect do
              post '/api/v1/research_plans', params: params, as: :json
            end.to change(Attachment, :count).by(1)

            expect(response).to have_http_status(:created)
            copied_plan = ResearchPlan.find_by!(name: 'Copied Plan')
            expect(copied_plan.attachments.take!.read_file).to eq(readable_source.read_file)
          end
        end
      end

      context 'when collection_id points to a read-only shared collection' do
        let(:other_user) { create(:person) }
        let(:read_only_collection) do
          create(:collection, user: other_user).tap do |c|
            create(:collection_share, collection: c, shared_with: user,
                                      permission_level: CollectionShare::PERMISSION_LEVELS[:read_elements])
          end
        end
        let(:params) do
          {
            name: 'Forbidden Plan',
            container: { attachments: [], children: [], is_new: true, is_deleted: false, name: 'new' },
            collection_id: read_only_collection.id,
          }
        end

        before { post '/api/v1/research_plans', params: params, as: :json }

        it 'returns 403 forbidden' do
          expect(response).to have_http_status :forbidden
        end

        it 'does not create the research plan' do
          expect(ResearchPlan.find_by(name: 'Forbidden Plan')).to be_nil
        end
      end

      context 'when collection_id points to a writable shared collection' do
        let(:other_user) { create(:person) }
        let(:writable_collection) do
          create(:collection, user: other_user).tap do |c|
            create(:collection_share, collection: c, shared_with: user,
                                      permission_level: CollectionShare::PERMISSION_LEVELS[:add_elements])
          end
        end
        let(:params) do
          {
            name: 'Shared Write Plan',
            container: { attachments: [], children: [], is_new: true, is_deleted: false, name: 'new' },
            collection_id: writable_collection.id,
          }
        end

        before { post '/api/v1/research_plans', params: params, as: :json }

        it 'returns 201 created' do
          expect(response).to have_http_status :created
        end

        it 'creates the research plan in the shared collection' do
          rp = ResearchPlan.find_by(name: 'Shared Write Plan')
          expect(rp).not_to be_nil
          expect(rp.collections).to include(writable_collection)
        end
      end
    end

    describe 'POST /api/v1/research_plans/:id/import_wellplate/:wellplate_id' do
      let(:collection) { create(:collection, user: user) }
      let(:wellplate) { create(:wellplate, :with_random_wells, number_of_readouts: 3, collections: [collection]) }
      let(:research_plan) { create(:research_plan, creator: user, collections: [collection]) }
      let(:params) { { research_plan_id: research_plan.id } }

      before do
        post "/api/v1/research_plans/#{research_plan.id}/import_wellplate/#{wellplate.id}", params: params, as: :json
      end

      it 'imports the wellplate as table into the research plan body' do
        response_body = JSON.parse(response.body)
        table = response_body.dig('research_plan', 'body').last

        expect(response_body.key?('error')).to be false

        rows = table['value']['rows']
        columns = table['value']['columns']

        expect(table['type']).to eq 'table'

        expect(rows.size).to eq 12 * 8
        expect(columns.size).to eq 8 # coordinate + 3*2 readout spalten

        names = columns.map { |column| column['headerName'] }
        expect(names).to eq ['Position', 'Sample', 'Readout 1 Value', 'Readout 1 Unit', 'Readout 2 Value',
                             'Readout 2 Unit', 'Readout 3 Value', 'Readout 3 Unit']

        first_row = rows.first
        first_readout = wellplate.wells.first.readouts.first

        expect(first_row['readout_1_value']).to eq first_readout['value']
        expect(first_row['readout_1_unit']).to eq first_readout['unit']
      end
    end

    describe 'GET /api/v1/research_plans/linked' do
      let!(:c) { create(:collection, label: 'C1', user: user) }
      let!(:research_plan) { create(:research_plan, :with_linked) }

      before do
        get '/api/v1/research_plans/linked', params: { id: 100, element: 'reaction' }
      end

      it 'returns 200 status code' do
        expect(response.status).to eq 200
      end

      it 'returns research_plans linked to an element' do
        response_body = JSON.parse(response.body)
        expect(response_body[0]['name']).to eq research_plan.name
      end
    end
  end
end
# rubocop:enable RSpec/NestedGroups
