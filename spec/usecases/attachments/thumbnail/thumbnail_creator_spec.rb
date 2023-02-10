# frozen_string_literal: true

describe Usecases::Attachments::Thumbnail::ThumbnailCreator do
  let(:temp_file) { Tempfile.new.path }
  let(:attachment) { build(:attachment, identifier: SecureRandom.uuid) }
  let(:creator) { described_class.new }
  let(:expected_path) do
    File.join(
      File.dirname(temp_file),
      "#{attachment.identifier}.thumb.jpg",
    )
  end

  describe '.create_derivative' do
    it 'successfully created thumbnail' do
      allow_any_instance_of(Thumbnailer) #rubocop:disable RSpec/AnyInstance
        .to receive(:create)
        .and_return(temp_file)
      result = creator.create_derivative(temp_file, nil, nil, {}, attachment)

      expect(attachment.thumb).to be true
      assert_equal(result[:thumbnail].path, expected_path)
    end

    it 'error at creating thumbnail' do
      allow_any_instance_of(Thumbnailer)
        .to receive(:create)
        .and_raise('An error occurred')
      expected_attachment_data = attachment.attachment_data
      creator = described_class.new
      result = creator.create_derivative(temp_file, nil, nil, {}, attachment)

      expect(attachment.thumb).to be false
      expect(attachment.attachment_data).to eq expected_attachment_data
      expect(result).to eq({})
    end
  end
end
