# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Container writes through element APIs' do # rubocop:disable RSpec/DescribeClass
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }
  let(:owner) { create(:person) }
  let(:foreign_plan) { create(:research_plan, creator: owner, collections: [create(:collection, user: owner)]) }
  let(:foreign_child) { create(:container, parent: foreign_plan.container, name: 'Private dataset') }
  let!(:foreign_attachment) { create(:attachment, attachable: foreign_child, created_for: owner.id) }

  def node(type, **attributes)
    { container_type: type, name: 'New', is_new: true, extended_metadata: {}, children: [] }.merge(attributes)
  end

  def dataset_tree(attachment)
    [node('analyses', children: [node('analysis', children: [node('dataset', attachments: Array.wrap(attachment))])])]
  end

  def element_update_path(path, factory, id)
    return path if factory == :cellline_sample
    return "/api/v1/vessels/templates/#{id}" if factory == :vessel_template

    "#{path}/#{id}"
  end

  shared_examples 'inbox attachment drops' do
    let(:inbox_root) { create(:inbox_container_root, containable: user) }
    let(:device_box) { create(:inbox_container, parent: inbox_root) }
    let(:inbox_dataset) { create(:container, parent: device_box, container_type: 'dataset') }
    let(:inbox_file) { create(:attachment, attachable: inbox_dataset, created_for: user.id) }

    it 'moves a file dropped from the user\'s inbox into the sample dataset' do
      container_data[:children] = dataset_tree(id: inbox_file.id, is_new: false)
      saved = target.class.find_by!(name: save_element)

      expect(inbox_file.reload.root_element).to eq(saved)
      expect(inbox_file.attachable.container_type).to eq('dataset')
      expect(inbox_dataset.reload.attachments).to be_empty
    end

    it 'moves all files dropped from an inbox dataset into the same sample dataset' do
      second_file = create(:attachment, attachable: inbox_dataset, created_for: owner.id)
      files = [inbox_file, second_file]
      container_data[:children] = dataset_tree(files.map { |file| { id: file.id, is_new: false } })
      saved = target.class.find_by!(name: save_element)

      expect(files.map { |file| file.reload.root_element }).to eq([saved, saved])
      expect(files.map(&:attachable).uniq.one?).to be true
      expect(inbox_dataset.reload.attachments).to be_empty
    end

    it 'does not move or delete another user\'s inbox file, even if it was uploaded for this user' do
      foreign_inbox = create(:inbox_container_root, containable: owner)
      foreign_device = create(:inbox_container, parent: foreign_inbox)
      foreign_dataset = create(:container, parent: foreign_device, container_type: 'dataset')
      foreign_file = create(:attachment, attachable: foreign_dataset, created_for: user.id)
      deleted_flags = [false, true]
      deleted_flags.each do |deleted|
        container_data[:children] = dataset_tree(id: foreign_file.id, is_new: false, is_deleted: deleted)
        save_element

        expect(foreign_file.reload.attachable).to eq(foreign_dataset)
      end
    end
  end

  shared_examples 'scoped container writes' do |path, factory|
    let(:target) do
      case factory
      when :sequence_based_macromolecule_sample
        create(factory, user: user, collections: [collection],
                        container: Container.create_root_container,
                        sequence_based_macromolecule: create(:modified_uniprot_sbmm))
      when :vessel_template
        # Container.containable_id is currently an integer, whereas vessel templates use UUIDs.
        # Use a stable numeric prefix to exercise an existing, resolvable template association.
        create(factory, id: '12345678-1234-4000-8000-000000000001', container: Container.create_root_container)
      when :screen, :wellplate
        create(factory, collections: [collection], container: Container.create_root_container)
      else
        create(factory, creator: user, collections: [collection])
      end
    end

    let(:element_params) do
      common = { name: 'Container access test', collection_id: collection.id }
      case factory
      when :sample
        common.merge(target_amount_value: 1, target_amount_unit: 'g', description: '', purity: 1,
                     location: '', is_top_secret: false, decoupled: true, xref: {})
      when :reaction
        common.merge(materials: { starting_materials: [], reactants: [], solvents: [], products: [] })
      when :screen
        common.merge(wellplate_ids: [], research_plan_ids: [])
      when :wellplate
        common.merge(wells: [], width: 1, height: 1)
      when :cellline_sample
        common.merge(amount: 1, unit: 'g', passage: 1, material_names: 'Test cells', source: 'Test')
      when :sequence_based_macromolecule_sample
        serialize_sbmm_sample_as_api_input(target).merge(common)
      when :element
        common.merge(element_klass: { id: target.element_klass_id }, properties: target.properties.deep_dup)
      when :research_plan
        common.merge(body: [])
      else
        common
      end
    end

    %i[create update].each do |operation|
      context "when saving an element with #{operation}" do
        let(:container_data) do
          { id: target.container&.id, is_new: operation == :create, container_type: 'root', children: [] }
        end

        define_method(:save_element) do
          payload = element_params.merge(container: container_data)
          payload[:name] = "Container access test #{SecureRandom.hex(6)}"
          if operation == :create
            post(path, params: payload, as: :json)
          else
            payload[:cell_line_sample_id] = target.id.to_s if factory == :cellline_sample
            put(element_update_path(path, factory, target.id), params: payload, as: :json)
          end
          expect(response).to have_http_status(operation == :create ? :created : :ok), response.body
          payload[:name]
        end

        it_behaves_like 'inbox attachment drops' if factory == :sample

        it 'preserves foreign attachments when asked to move or delete them' do
          [false, true].each do |deleted| # rubocop:disable Performance/CollectionLiteralInLoop
            container_data[:children] = dataset_tree(id: foreign_attachment.id, is_new: false, is_deleted: deleted)
            save_element

            expect(foreign_attachment.reload.attachable).to eq(foreign_child)
          end
        end

        it 'preserves foreign containers and their files when asked to edit or delete them' do
          [false, true].each do |deleted| # rubocop:disable Performance/CollectionLiteralInLoop
            container_data[:children] = [node('dataset', id: foreign_child.id, is_new: false, is_deleted: deleted)]
            save_element

            expect(foreign_child.reload.name).to eq('Private dataset')
            expect(foreign_attachment.reload.attachable).to eq(foreign_child)
          end
        end

        it 'does not adopt or change a supplied foreign root' do
          root = foreign_plan.container
          original_description = root.description
          container_data.merge!(id: root.id, is_new: false, description: 'Changed')
          save_element

          expect(root.reload.root_element).to eq(foreign_plan)
          expect(root.description).to eq(original_description)
        end

        it 'attaches a pending upload created for the current user' do
          upload = create(:attachment, attachable: nil, created_for: user.id)
          container_data[:children] = dataset_tree(id: upload.key, is_new: true)
          saved_name = save_element
          saved = target.class.find_by!(name: saved_name)

          expect(upload.reload.attachable).to be_a(Container)
          if factory == :vessel_template
            root = upload.attachable.root
            expect([root.containable_type, root.containable_id]).to eq(['VesselTemplate', saved.id.to_i])
          else
            expect(upload.attachable.root).to eq(saved.container)
          end
        end
      end
    end
  end

  it_behaves_like 'scoped container writes', '/api/v1/research_plans', :research_plan
  it_behaves_like 'scoped container writes', '/api/v1/samples', :sample
  it_behaves_like 'scoped container writes', '/api/v1/reactions', :reaction
  it_behaves_like 'scoped container writes', '/api/v1/wellplates', :wellplate
  it_behaves_like 'scoped container writes', '/api/v1/screens', :screen
  it_behaves_like 'scoped container writes', '/api/v1/cell_lines', :cellline_sample
  it_behaves_like 'scoped container writes', '/api/v1/device_descriptions', :device_description
  it_behaves_like 'scoped container writes', '/api/v1/sequence_based_macromolecule_samples',
                  :sequence_based_macromolecule_sample
  it_behaves_like 'scoped container writes', '/api/v1/generic_elements', :element
  it_behaves_like 'scoped container writes', '/api/v1/vessels/templates/create', :vessel_template

  context 'when updating a container directly' do
    let(:plan) { create(:research_plan, creator: user, collections: [collection]) }

    it 'skips foreign attachment moves and deletes within an own root' do
      [false, true].each do |deleted|
        container = { id: plan.container.id, children: dataset_tree(
          id: foreign_attachment.id, is_new: false, is_deleted: deleted,
        ) }
        put '/api/v1/containers/container', params: { container: container }, as: :json

        expect(response).to have_http_status(:ok)
        expect(foreign_attachment.reload.attachable).to eq(foreign_child)
      end
    end

    it 'skips foreign child edits and deletes within an own root' do
      [false, true].each do |deleted|
        container = { id: plan.container.id, children: [node(
          'dataset', id: foreign_child.id, is_new: false, is_deleted: deleted
        )] }
        put '/api/v1/containers/container', params: { container: container }, as: :json

        expect(response).to have_http_status(:ok)
        expect(foreign_child.reload.name).to eq('Private dataset')
        expect(foreign_attachment.reload.attachable).to eq(foreign_child)
      end
    end
  end

  context 'when creating vessel instances with template containers' do
    let(:template) do
      create(:vessel_template, id: '12345678-1234-4000-8000-000000000001',
                               container: Container.create_root_container)
    end

    it 'attaches own uploads while preserving foreign attachments and containers' do
      upload = create(:attachment, attachable: nil, created_for: user.id)
      children = dataset_tree(id: foreign_attachment.id, is_new: false) +
                 dataset_tree(id: upload.key, is_new: true) +
                 [node('dataset', id: foreign_child.id, is_new: false, is_deleted: true)]
      post '/api/v1/vessels/bulk_create', params: {
        vessel_template_id: template.id, collection_id: collection.id, count: 1,
        container: { id: template.container.id, children: children }
      }, as: :json

      expect(response).to have_http_status(:created)
      expect(foreign_attachment.reload.attachable).to eq(foreign_child)
      expect(upload.reload.attachable.root).to eq(template.container)
    end
  end
end
