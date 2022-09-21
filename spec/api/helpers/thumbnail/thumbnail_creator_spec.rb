# frozen_string_literal: true

require 'helpers/thumbnail/thumbnail_creator'
require 'base64'
require 'fileutils'
require 'rails_helper'

describe ThumbnailCreator do
  let(:attachment) { create(:attachment) }
  let(:temp_file) do
    Tempfile.new('example.png')
  end

  before do
  end

  describe '.create_derivative' do
    it 'successfully created thumbnail' do
      allow_any_instance_of(Thumbnailer)
        .to receive(:create)
        .and_return(temp_file)

      creator = described_class.new
      result = creator.create_derivative(temp_file.path, nil, nil, {}, attachment)

      assert(attachment.thumb)
      expected_path = File.dirname(temp_file.path) + '/' + attachment.identifier + '.thumb.jpg'
      assert_equal(result[:thumbnail].path, expected_path)
    end
  end
end
