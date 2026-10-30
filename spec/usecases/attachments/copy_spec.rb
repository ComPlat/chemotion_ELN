# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Attachments::Copy do
  let(:user) { create(:user) }
  let(:research_plan) { create(:research_plan) }
  let(:collection) { create(:collection, user: user) }
  let(:source_plan) { create(:research_plan, collections: [collection]) }

  describe '.execute!' do
    let(:attachments) { [{ id: source.id }] }
    let(:source_plan_id) { source_plan.id }

    before do
      described_class.execute!(attachments, research_plan, user, source_plan_id: source_plan_id)
    end

    context 'when the attachment ID does not exist' do
      let(:attachments) { [{ id: -1 }] }

      it 'skips the missing attachment' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is a non-annotatable file (e.g. PDF)' do
      # A PDF gets a :thumbnail derivative but never an :annotation derivative.
      # Regression for NoMethodError: undefined method `url' for nil:NilClass
      # raised from AnnotationLoader when copying a research plan (Sentry).
      let(:source) { create(:attachment, :with_pdf, attachable: source_plan) }

      it 'copies the attachment without attempting to copy an annotation' do
        copy = Attachment.where(attachable: research_plan).where.not(id: source.id).last

        expect(copy).to be_present
        expect(copy.filename).to eq(source.filename)
        expect(copy.attachment(:annotation)).to be_nil
      end
    end

    context 'when the attachment is marked as deleted' do
      let(:source) { create(:attachment, :with_png_image, attachable: source_plan) }
      let(:attachments) { [{ id: source.id, is_deleted: true }] }
      let(:research_plan) do
        create(:research_plan, body: [{ type: 'image', value: { public_name: source.identifier } }])
      end

      it 'copies neither the file nor its body image' do
        expect(research_plan.attachments).to be_empty
        expect(research_plan.reload.body).to eq([])
        expect(source.reload.attachment.exists?).to be true
      end
    end

    context 'when a duplicate entry marks the same attachment as deleted' do
      let(:source) { create(:attachment, attachable: source_plan) }
      let(:attachments) { [{ id: source.id }, { id: source.id.to_s, is_deleted: true }] }

      it 'does not create a copy' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is an annotatable image' do
      let(:source) { create(:attachment, :with_png_image, attachable: source_plan) }

      it 'copies the attachment and its annotation derivative' do
        copy = Attachment.where(attachable: research_plan).where.not(id: source.id).last

        expect(copy).to be_present
        expect(copy.attachment(:annotation)).to be_present
      end
    end

    context 'when the source research plan is not readable' do
      let(:collection) { create(:collection) }
      let(:source_plan_id) { nil }
      let(:source) { create(:attachment, :with_png_image, attachable: source_plan, created_for: user.id) }

      it 'does not copy the attachment even if it was uploaded for the current user' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the body references an unreadable image more than once' do
      let(:collection) { create(:collection) }
      let(:source_plan_id) { nil }
      let(:source) { create(:attachment, :with_png_image, attachable: source_plan, created_for: user.id) }
      let(:text_field) do
        { 'type' => 'richtext', 'value' => { 'ops' => [{ 'insert' => "Keep this text\n" }] } }
      end
      let(:research_plan) do
        create(:research_plan, body: [
                 text_field,
                 { type: 'image', value: { public_name: source.identifier } },
                 { type: 'image', value: { public_name: source.identifier } },
               ])
      end

      it 'removes every unreadable image while retaining other fields' do
        expect(research_plan.reload.body).to eq([text_field])
      end
    end

    context 'when the body references a readable unattached image' do
      let(:source) { create(:attachment, attachable: nil, created_for: user.id) }
      let(:image) { create(:attachment, :with_png_image, attachable: nil, created_for: user.id) }
      let(:research_plan) do
        create(:research_plan, body: [{ type: 'image', value: { public_name: image.identifier } }])
      end

      it 'keeps the image field for the pending upload' do
        expect(research_plan.reload.body.first.dig('value', 'public_name')).to eq(image.identifier)
      end
    end

    context 'when the attachment is in an unreadable analysis container' do
      let(:sample) { create(:sample, collections: [create(:collection)]) }
      let(:analysis) { create(:container, parent: sample.container.analyses_container, container_type: 'analysis') }
      let(:dataset) { create(:container, parent: analysis, container_type: 'dataset') }
      let(:source) { create(:attachment, attachable: dataset, created_for: user.id) }

      it 'does not copy the attachment' do
        expect(source.root_element).to eq(sample)
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is unattached and belongs to another user' do
      let(:source) { create(:attachment, attachable: nil, created_for: create(:user).id, created_by: user.id) }

      it 'does not copy the attachment' do
        expect(research_plan.attachments).to be_empty
      end
    end

    context 'when the attachment is unattached and belongs to the current user' do
      let(:source) { create(:attachment, attachable: nil, created_for: user.id) }

      it 'leaves the pending upload for the regular upload flow' do
        expect(research_plan.attachments).to be_empty
        expect(source.reload.attachable_id).to be_nil
      end
    end
  end

  describe 'batch copying' do
    let(:first_source) { create(:attachment, :with_png_image, attachable: source_plan) }
    let(:second_source) { create(:attachment, attachable: source_plan) }
    let(:research_plan) do
      create(:research_plan, body: [
               { id: 'first', type: 'image', value: { public_name: first_source.identifier } },
               { id: 'second', type: 'image', value: { public_name: first_source.identifier } },
               { id: 'third', type: 'image', value: { public_name: second_source.identifier } },
               { id: 'text', type: 'richtext', value: nil },
             ])
    end

    it 'rewrites every image reference and saves the body once' do
      plan = research_plan
      allow(plan).to receive(:save!).and_call_original

      described_class.execute!([{ id: first_source.id }, { id: second_source.id }], plan, user,
                               source_plan_id: source_plan.id)

      references = plan.reload.body.first(3).map { |field| field.dig('value', 'public_name') }
      expect(plan).to have_received(:save!).once
      expect(references).to eq([references.first, references.first, references.last])
      expect(references.uniq).to match_array(plan.attachments.pluck(:identifier))
    end

    it 'loads the supplied IDs in one batch and deduplicates repeated IDs' do
      entries = [{ id: first_source.id.to_s }, { id: second_source.id }, { id: first_source.id.to_s }]
      plan = research_plan
      allow(Attachment).to receive(:where).and_call_original

      expect do
        described_class.execute!(entries, plan, user, source_plan_id: source_plan.id)
      end.to change(Attachment, :count).by(2)
      expect(Attachment).to have_received(:where).with(attachable: source_plan).once
    end

    it 'uploads each original once directly to permanent storage' do
      entries = [{ id: first_source.id }]
      plan = research_plan
      uploads = { cache: [], store: [] }
      uploads.each do |storage, ids|
        allow(Shrine.storages.fetch(storage)).to receive(:upload).and_wrap_original do |upload, io, id, **options|
          ids << id
          upload.call(io, id, **options)
        end
      end

      described_class.execute!(entries, plan, user, source_plan_id: source_plan.id)

      copy = plan.attachments.take!
      expect(uploads.transform_values { |ids| ids.count(copy.attachment.id) }).to eq(cache: 0, store: 1)
      expect(copy.read_file).to eq(first_source.read_file)
      expect(copy.attachment(:annotation)).to be_present
    end
  end

  describe 'empty and invalid input' do
    it 'enforces source authorization even when called outside the API' do
      foreign = create(:research_plan, collections: [create(:collection)])

      expect do
        described_class.new([], user, source_plan_id: foreign.id)
      end.to raise_error(described_class::Forbidden)
    end

    it 'rejects a missing source with the same authorization error' do
      expect do
        described_class.new([], user, source_plan_id: -1)
      end.to raise_error(described_class::Forbidden)
    end

    it 'reuses the supplied user without querying it again for an empty copy list' do
      plan = research_plan
      current_user = user
      allow(User).to receive(:find).and_call_original

      described_class.execute!([], plan, current_user)

      expect(User).not_to have_received(:find)
    end

    it 'still removes unreadable body images when no attachments are requested' do
      image = create(:attachment, attachable: create(:research_plan))
      plan = create(:research_plan, body: [{ type: 'image', value: { public_name: image.identifier } }])

      described_class.execute!([], plan, user)

      expect(plan.reload.body).to eq([])
    end

    it 'rejects malformed entries before executing the transaction' do
      expect { described_class.new([123], user) }.to raise_error(described_class::InvalidInput)
    end
  end
end
