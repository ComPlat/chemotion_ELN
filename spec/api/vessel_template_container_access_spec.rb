# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Vessel template container writes' do # rubocop:disable RSpec/DescribeClass
  include_context 'api request authorization context'

  let(:author) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:template) do
    # Container.containable_id is an integer; templates have UUID IDs. Keep this
    # fixture consistent with the existing container request specs.
    create(:vessel_template, id: '12345678-1234-4000-8000-000000000001',
                             container: Container.create_root_container)
  end
  let(:analysis) do
    create(:container, parent: template.container.analyses_container, container_type: 'analysis', name: 'Original')
  end
  let(:dataset) { create(:container, parent: analysis, container_type: 'dataset') }
  let!(:file) { create(:attachment, attachable: dataset, created_for: author.id) }

  def node(type, **attributes)
    { container_type: type, name: 'New', is_new: true, extended_metadata: {}, children: [] }.merge(attributes)
  end

  def new_tree(upload)
    dataset_data = node('dataset', attachments: [{ id: upload.key, is_new: true }])
    analysis_data = node('analysis', children: [dataset_data])
    { is_new: true, children: [node('analyses', children: [analysis_data])] }
  end

  def existing_tree(change)
    dataset_data = node('dataset', id: dataset.id, is_new: false, attachments: [
                          { id: file.id, is_new: false, is_deleted: change == :delete_file },
                        ])
    analysis_data = node('analysis', id: analysis.id, is_new: false, name: 'Changed',
                                     is_deleted: change == :delete_analysis, children: [dataset_data])
    { id: template.container.id, is_new: change == :replace_root, description: 'Changed',
      children: [node('analyses', id: template.container.analyses_container.id,
                                  is_new: false, children: [analysis_data])] }
  end

  def template_state
    {
      name: template.reload.name,
      containers: template.container.self_and_descendants.order(:id).pluck(:id, :name, :description),
      attachment: file.reload.attributes.slice('attachable_id', 'attachable_type', 'filename'),
    }
  end

  changes = %i[rename_analysis delete_analysis delete_file replace_root]
  %i[author another_user].each do |actor|
    context "when acting as #{actor}" do
      let(:user) { actor == :author ? author : create(:person) }

      changes.each do |change|
        it "refuses #{change} through PUT before changing template fields" do
          original = template_state

          put "/api/v1/vessels/templates/#{template.id}", params: {
            name: 'Changed template', container: existing_tree(change)
          }, as: :json

          expect(response).to have_http_status(:forbidden)
          expect(template_state).to eq(original)
        end

        it "ignores #{change} through bulk_create while creating instances" do
          original = template_state

          expect do
            post '/api/v1/vessels/bulk_create', params: {
              vessel_template_id: template.id, collection_id: collection.id, count: 1,
              container: existing_tree(change)
            }, as: :json
          end.to change(Vessel, :count).by(1)

          expect(response).to have_http_status(:created), response.body
          expect(template_state).to eq(original)
        end
      end

      it 'still saves ordinary template fields when no container write is requested' do
        put "/api/v1/vessels/templates/#{template.id}", params: { name: 'Updated name' }, as: :json

        expect(response).to have_http_status(:ok)
        expect(template.reload.name).to eq('Updated name')
        expect(file.reload.attachable).to eq(dataset)
      end

      it 'still creates individual instances of an existing template' do
        post '/api/v1/vessels/instances/create', params: {
          vessel_template_id: template.id, collection_id: collection.id
        }, as: :json

        expect(response).to have_http_status(:created)
        expect(Vessel.find(parsed_json_response['id']).user_id).to eq(user.id)
        expect(file.reload.attachable).to eq(dataset)
      end

      it 'refuses writes through the direct container dialog endpoint' do
        original = template_state
        put '/api/v1/containers/container', params: { container: existing_tree(:delete_file) }, as: :json

        expect(response).to have_http_status(:unauthorized)
        expect(template_state).to eq(original)
      end

      it 'refuses deletion through the direct container endpoint' do
        original = template_state
        delete "/api/v1/containers/#{analysis.id}"

        expect(response).to have_http_status(:unauthorized)
        expect(template_state).to eq(original)
      end

      it 'refuses content updates through the direct container endpoint' do
        original = template_state
        put "/api/v1/containers/#{analysis.id}", params: { content: { ops: [] } }, as: :json

        expect(response).to have_http_status(:unauthorized)
        expect(template_state).to eq(original)
      end
    end
  end

  it 'creates a new template with an analysis and an own pending file' do
    upload = create(:attachment, attachable: nil, created_for: user.id)
    tree = new_tree(upload).merge(id: template.container.id, is_new: false)
    # The database generates template UUIDs; pin a numeric-prefix one like the fixtures above.
    allow(VesselTemplate).to receive(:create!).and_wrap_original do |create, attributes|
      create.call(attributes.merge(id: '32345678-1234-4000-8000-000000000001'))
    end

    post '/api/v1/vessels/templates/create', params: { name: 'New template', container: tree }, as: :json

    expect(response).to have_http_status(:created), response.body
    root = VesselTemplate.find(parsed_json_response['id']).container
    expect(root).not_to eq(template.container)
    expect(upload.reload.attachable.root).to eq(root)
  end

  it 'initializes the first container through PUT without adopting a supplied existing root' do
    empty_template = create(:vessel_template, name: 'Empty template', id: '22345678-1234-4000-8000-000000000001')
    upload = create(:attachment, attachable: nil, created_for: user.id)
    tree = new_tree(upload).merge(id: template.container.id, is_new: false)

    put "/api/v1/vessels/templates/#{empty_template.id}", params: { container: tree }, as: :json

    expect(response).to have_http_status(:ok), response.body
    expect(empty_template.reload.container).not_to eq(template.container)
    expect(upload.reload.attachable.root).to eq(empty_template.container)
  end
end
