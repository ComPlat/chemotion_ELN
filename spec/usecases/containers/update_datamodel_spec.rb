# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Containers::UpdateDatamodel do
  let(:user) { create(:person) }
  let(:owner) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:element) { create(:research_plan, creator: user, collections: [collection]) }
  let(:other_element) { create(:research_plan, creator: owner, collections: [create(:collection, user: owner)]) }
  let(:source) { create(:attachment, attachable: other_element, created_for: owner.id) }
  let(:usecase) { described_class.new(user) }

  def child_data(type, **attributes)
    { name: 'Updated', container_type: type, extended_metadata: {}, is_new: true, children: [] }.merge(attributes)
  end

  def root_data(children, root: element.container)
    { id: root.id, is_new: false, description: 'Updated root', children: children }
  end

  def upload_tree(attachment)
    dataset = child_data('dataset', attachments: [attachment])
    [child_data('analyses', children: [child_data('analysis', children: [dataset])])]
  end

  it 'does not move an attachment from another element' do
    usecase.update_datamodel(root_data(upload_tree(id: source.id, is_new: false)))

    expect(source.reload.attachable).to eq(other_element)
  end

  it 'does not delete an attachment from another element' do
    usecase.update_datamodel(root_data(upload_tree(id: source.id, is_new: false, is_deleted: true)))

    expect(Attachment.exists?(source.id)).to be true
  end

  it 'does not claim another user\'s pending upload by key' do
    source.update!(attachable: nil)
    usecase.update_datamodel(root_data(upload_tree(id: source.key, is_new: true)))

    expect(source.reload.attachable_id).to be_nil
  end

  it 'does not claim another user\'s pending upload by ID' do
    source.update!(attachable: nil)
    usecase.update_datamodel(root_data(upload_tree(id: source.id, is_new: false)))

    expect(source.reload.attachable_id).to be_nil
  end

  it 'does not edit a child from another root' do
    foreign = create(:container, parent: other_element.container, name: 'Original')
    usecase.update_datamodel(root_data([child_data('dataset', id: foreign.id, is_new: false)]))

    expect(foreign.reload.name).to eq('Original')
  end

  it 'does not delete a child from another root or its attachments' do
    foreign = create(:container, parent: other_element.container)
    source.update!(attachable: foreign)
    usecase.update_datamodel(root_data([child_data('dataset', id: foreign.id, is_new: false, is_deleted: true)]))

    expect(Container.exists?(foreign.id)).to be true
    expect(Attachment.exists?(source.id)).to be true
  end

  it 'ignores injected descendant IDs when deleting an own subtree' do
    own_child = create(:container, parent: element.container)
    foreign = create(:container, parent: other_element.container)
    source.update!(attachable: foreign)
    children = [{ id: own_child.id, is_deleted: true, children: [{ id: foreign.id, is_deleted: true }] }]
    usecase.update_datamodel(root_data(children))

    expect(Container.exists?(foreign.id)).to be true
    expect(Attachment.exists?(source.id)).to be true
  end

  it 'does not edit an existing orphan root' do
    orphan = create(:root_container, description: 'Original')
    usecase.update_datamodel(root_data([], root: orphan))

    expect(orphan.reload.description).to eq('Original')
  end

  it 'does not edit a root the user cannot update' do
    root = other_element.container
    original_description = root.description
    usecase.update_datamodel(root_data([], root: root))

    expect(root.reload.description).to eq(original_description)
  end

  it 'keeps a new root from adopting existing foreign children' do
    foreign = create(:container, parent: other_element.container, name: 'Original')
    data = { is_new: true, children: [child_data('dataset', id: foreign.id, is_new: false)] }
    usecase.update_datamodel(data, creating: true)

    expect(foreign.reload.name).to eq('Original')
  end

  it 'creates a fresh root when a create request supplies an existing root ID' do
    root = element.container
    result = usecase.update_datamodel(root_data([], root: root), element: other_element, creating: true)

    expect(result).not_to eq(root)
    expect(root.reload.root_element).to eq(element)
  end

  it 'does not update a different element even when the user can edit both' do
    another = create(:research_plan, creator: user, collections: [collection])
    root = another.container
    original_description = root.description
    result = usecase.update_datamodel(root_data([], root: root), element: element)

    expect(result).to eq(element.container)
    expect(root.reload.description).to eq(original_description)
  end

  it 'does not use a client creation flag to replace an existing root' do
    data = { is_new: true, description: 'Updated', children: upload_tree(id: source.id, is_new: false) }
    result = usecase.update_datamodel(data, element: element)

    expect(result).to eq(element.container)
    expect(source.reload.attachable).to eq(other_element)
  end

  it 'creates a missing root only for an element the user can update' do
    element.container.destroy!
    element.reload
    result = usecase.update_datamodel({ is_new: true, children: [] }, element: element)

    expect(result).to be_persisted
    expect(result).not_to eq(other_element.container)
  end

  it 'does not create a root on an inaccessible element' do
    other_element.container.destroy!
    other_element.reload

    expect do
      usecase.update_datamodel({ is_new: true, children: [] }, element: other_element)
    end.not_to change(Container, :count)
  end

  it 'skips missing attachment and child IDs' do
    data = root_data(upload_tree(id: -1, is_new: false) + [child_data('dataset', id: -1, is_new: false)])

    expect { usecase.update_datamodel(data, element: element) }.not_to change(Attachment, :count)
  end

  it 'attaches a pending upload created for the current user' do
    own_upload = create(:attachment, attachable: nil, created_for: user.id)
    usecase.update_datamodel(root_data(upload_tree(id: own_upload.key, is_new: true)))

    expect(own_upload.reload.root_element).to eq(element)
  end

  it 'moves attachments within the authorized element' do
    own_source = create(:attachment, attachable: element, created_for: user.id)
    usecase.update_datamodel(root_data(upload_tree(id: own_source.id, is_new: false)))

    expect(own_source.reload.attachable).to be_a(Container)
    expect(own_source.root_element).to eq(element)
  end

  it 'deletes the persisted subtree even when descendants are omitted from the request' do
    own_child = create(:container, parent: element.container)
    dataset = create(:container, parent: own_child)
    attachment = create(:attachment, attachable: dataset, created_for: user.id)
    usecase.update_datamodel(root_data([{ id: own_child.id, is_deleted: true }]))

    expect(Container.exists?(dataset.id)).to be false
    expect(Attachment.exists?(attachment.id)).to be false
  end
end
