# frozen_string_literal: true

require 'rails_helper'

describe ReconvertAttachmentJob do
  let(:user) { create(:person) }
  let(:container) { create(:container, containable: user) }

  describe '.convertible?' do
    it 'accepts a container attachment the converter picked up' do
      attachment = build(:attachment, attachable: container, con_state: Labimotion::ConState::ERROR)
      expect(described_class.convertible?(attachment)).to be true
    end

    it 'rejects an attachment the converter never picked up' do
      attachment = build(:attachment, attachable: container, con_state: Labimotion::ConState::NONE)
      expect(described_class.convertible?(attachment)).to be false
    end

    it 'rejects an attachment that is not bound to a container' do
      attachment = build(:attachment, attachable: nil, con_state: Labimotion::ConState::ERROR)
      expect(described_class.convertible?(attachment)).to be false
    end
  end

  describe '#perform' do
    let(:attachment) do
      create(:attachment, attachable: container, filename: 'measurement.dta',
                          con_state: Labimotion::ConState::ERROR)
    end

    # Labimotion's `after_update :exec_converter` would otherwise fire a real converter-app
    # roundtrip as soon as con_state flips to WAIT.
    before { allow(Labimotion::Converter).to receive(:jcamp_converter).and_return(Labimotion::ConState::WAIT) }

    # NB: Attachment#reload returns set_key (nil), not self — always re-read separately.
    it 're-arms the converter callback by resetting the state to WAIT' do
      described_class.perform_now(attachment.id, user.id)
      expect(Attachment.find(attachment.id).con_state).to eq Labimotion::ConState::WAIT
    end

    it 'destroys the bagit zip left behind by the previous run' do
      stale = create(:attachment, attachable: container, filename: 'measurement.zip',
                                  con_state: Labimotion::ConState::COMPLETED)

      described_class.perform_now(attachment.id, user.id)

      expect(Attachment.exists?(stale.id)).to be false
    end

    it 'keeps unrelated attachments on the same container' do
      other = create(:attachment, attachable: container, filename: 'notes.zip',
                                  con_state: Labimotion::ConState::NONE)

      described_class.perform_now(attachment.id, user.id)

      expect(Attachment.exists?(other.id)).to be true
    end

    it 'ignores an attachment that is not convertible' do
      attachment.update!(con_state: Labimotion::ConState::NONE)

      expect { described_class.perform_now(attachment.id, user.id) }
        .not_to(change { Attachment.find(attachment.id).con_state })
    end
  end
end
