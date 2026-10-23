# frozen_string_literal: true

require 'rails_helper'

# Authorization scope of the analyses/container tree applied on every element save.
# The tree is supplied by the client, so the use case must only ever create, update, delete or move
# containers and attachments that belong to the element being saved (or the caller's own unattached
# uploads). A container or attachment id that falls outside the saved element's own tree is ignored,
# even when another user's element owns it.
RSpec.describe Usecases::Containers::UpdateDatamodel do
  subject(:usecase) { described_class.new(saver) }

  let(:saver) { create(:person) }
  let(:other) { create(:person) }
  let(:saver_collection) { create(:collection, user: saver) }
  let(:other_collection) { create(:collection, user: other) }

  let(:saver_sample) { create(:sample, collections: [saver_collection]) }
  let(:other_sample) { create(:sample, collections: [other_collection]) }

  # root -> analyses -> analysis, built by the :with_analysis trait on the sample factory.
  let(:saver_root) { saver_sample.container }
  let(:other_analysis) do
    other_sample.container.children.find_by(container_type: 'analyses')
                .children.find_by(container_type: 'analysis')
  end
  let(:other_dataset) { create(:container, parent: other_analysis, container_type: 'dataset') }
  let(:other_attachment) do
    create(:attachment, :with_image, attachable: other_dataset, created_for: other.id)
  end

  # A tree rooted at the saver's own (authorized) root, with `extra` children added.
  def saver_tree(extra)
    { id: saver_root.id, is_new: false, container_type: 'root', children: extra }
  end

  describe 'ids outside the saved tree are ignored' do
    it 'does not delete a container outside the saved tree or its attachments' do
      other_attachment # create
      usecase.update_datamodel(saver_tree([{ id: other_analysis.id, is_deleted: true }]))

      expect(Container.exists?(other_analysis.id)).to be true
      expect(Container.exists?(other_dataset.id)).to be true
      expect(Attachment.exists?(other_attachment.id)).to be true
    end

    it 'does not rename or rewrite a container outside the saved tree' do
      original = other_analysis.name
      usecase.update_datamodel(saver_tree([{
                                            id: other_analysis.id, is_new: false,
                                            container_type: 'analysis', name: 'changed-elsewhere',
                                            description: 'changed', extended_metadata: {}, children: []
                                          }]))

      expect(other_analysis.reload.name).to eq(original)
      expect(other_analysis.name).not_to eq('changed-elsewhere')
    end

    it 'does not move another element dataset attachment into the saved tree' do
      other_attachment
      # A new dataset of the saver's own, listing an attachment id from another element.
      tree = saver_tree([{
                          is_new: true, container_type: 'analyses', extended_metadata: {}, children: [{
                            is_new: true, container_type: 'analysis', name: 'a', extended_metadata: {}, children: [{
                              is_new: true, container_type: 'dataset', name: 'dest', extended_metadata: {},
                              attachments: [{ id: other_attachment.id, is_new: false }], children: []
                            }]
                          }]
                        }])
      usecase.update_datamodel(tree)

      expect(other_attachment.reload.attachable_id).to eq(other_dataset.id)
      expect(other_attachment.attachable_type).to eq('Container')
    end

    it 'does not move another element element-level attachment (container_id nil)' do
      element_attachment = create(:attachment, :with_pdf, attachable: other_sample, created_for: other.id)
      tree = saver_tree([{
                          is_new: true, container_type: 'analyses', extended_metadata: {}, children: [{
                            is_new: true, container_type: 'analysis', name: 'a', extended_metadata: {}, children: [{
                              is_new: true, container_type: 'dataset', name: 'dest', extended_metadata: {},
                              attachments: [{ id: element_attachment.id, is_new: false }], children: []
                            }]
                          }]
                        }])
      usecase.update_datamodel(tree)

      expect(element_attachment.reload.attachable_id).to eq(other_sample.id)
      expect(element_attachment.attachable_type).to eq('Sample')
    end

    it 'denies a rootless/orphan root and applies none of its children' do
      orphan_root = create(:container, container_type: 'root')
      orphan_child = create(:container, parent: orphan_root, container_type: 'analysis')
      orphan_attachment = create(:attachment, attachable: orphan_child, created_for: other.id)

      usecase.update_datamodel({ id: orphan_root.id, is_new: false, container_type: 'root',
                                 children: [{ id: orphan_child.id, is_deleted: true }] })

      expect(Container.exists?(orphan_child.id)).to be true
      expect(Attachment.exists?(orphan_attachment.id)).to be true
    end
  end

  describe 'in-tree saves still work' do
    it 'creates new containers under the saved root' do
      tree = saver_tree([{
                          is_new: true, container_type: 'analyses', extended_metadata: {}, children: [{
                            is_new: true, container_type: 'analysis', name: 'fresh',
                            extended_metadata: {}, children: []
                          }]
                        }])
      expect { usecase.update_datamodel(tree) }
        .to change { saver_root.reload.descendants.count }.by(2)
    end

    it 'updates and deletes containers in the saved tree' do
      own_analyses = saver_root.children.find_by(container_type: 'analyses')
      own_analysis = own_analyses.children.find_by(container_type: 'analysis')

      usecase.update_datamodel(saver_tree([{
                                            id: own_analysis.id, is_new: false,
                                            container_type: 'analysis', name: 'renamed-own',
                                            description: '', extended_metadata: {}, children: []
                                          }]))
      expect(own_analysis.reload.name).to eq('renamed-own')

      described_class.new(saver).update_datamodel(
        saver_tree([{ id: own_analysis.id, is_deleted: true }]),
      )
      expect(Container.exists?(own_analysis.id)).to be false
    end

    it 'attaches the savers own unattached upload into a new dataset (inbox->dataset)' do
      upload = create(:attachment, attachable: nil, created_for: saver.id, key: 'OWNKEY', filename: 'up.txt')
      tree = saver_tree([{
                          is_new: true, container_type: 'analyses', extended_metadata: {}, children: [{
                            is_new: true, container_type: 'analysis', name: 'a', extended_metadata: {}, children: [{
                              is_new: true, container_type: 'dataset', name: 'ds', extended_metadata: {},
                              attachments: [{ id: 'OWNKEY', is_new: true }], children: []
                            }]
                          }]
                        }])
      usecase.update_datamodel(tree)

      upload.reload
      expect(upload.attachable_type).to eq('Container')
      dataset = Container.find(upload.attachable_id)
      expect(dataset.container_type).to eq('dataset')
      expect(dataset.root).to eq(saver_root)
    end

    it 'preserves reaction-variation linking for a new -v<id> attachment' do
      reaction = create(:reaction, creator: saver, collections: [saver_collection])
      reaction_root = reaction.container
      upload = create(:attachment, attachable: nil, created_for: saver.id, key: 'VKEY', filename: 'spec-v1.txt')
      tree = {
        id: reaction_root.id, is_new: false, container_type: 'root', children: [{
          is_new: true, container_type: 'analyses', extended_metadata: {}, children: [{
            is_new: true, container_type: 'analysis', name: 'a', extended_metadata: {}, children: [{
              is_new: true, container_type: 'dataset', name: 'ds', extended_metadata: {},
              attachments: [{ id: 'VKEY', is_new: true }], children: []
            }]
          }]
        }]
      }
      expect { described_class.new(saver).update_datamodel(tree) }.not_to raise_error

      upload.reload
      expect(upload.attachable_type).to eq('Container')
      expect(Container.find(upload.attachable_id).container_type).to eq('dataset')
    end
  end
end
