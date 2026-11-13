# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'QuillToPlainText' do
  subject(:lib) { Chemotion::QuillToPlainText }

  describe 'convert' do
    let(:delta_ops) do
      [
        { insert: "Hello\n" },
        { insert: 'This is colorful', attributes: { color: '#f00' } },
      ]
    end
    let(:plain_text) do
      "Hello\nThis is colorful"
    end

    it 'converts a quill delta ops as ruby array to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to plain text' do
      expect(lib.convert(delta_ops.to_json)).to match(plain_text)
    end
  end

  describe 'convert empty array' do
    let(:delta_ops) do
      []
    end
    let(:plain_text) do
      ''
    end

    it 'converts a quill delta ops as ruby array to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to plain text' do
      expect(lib.convert(delta_ops.to_json)).to match(plain_text)
    end
  end

  describe 'convert empty delta' do
    let(:delta_ops) do
      "{\"ops\":[{\"insert\":\"\"}]}"
    end
    let(:delta_ops_multi) do
      "{\"ops\":[{\"insert\":\"\"},{\"insert\":\"\"}]}"
    end
    let(:plain_text) do
      ''
    end

    it 'converts a quill delta ops as ruby array to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to plain text' do
      expect(lib.convert(JSON.parse(delta_ops))).to match(plain_text)
    end

    it 'converts a quill delata with multiple empty inserts' do
      expect(lib.convert(JSON.parse(delta_ops_multi))).to match(plain_text)
    end
  end

  describe 'convert long delta' do
    let(:delta_ops) do
      "{\"ops\":[{\"insert\":\"#{'a' * 10_000}\"}]}"
    end
    let(:plain_text) do
      'a' * 10_000
    end

    it 'converts a long quill delta ops to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end
  end

  describe 'blank_content?' do
    [
      nil,
      '',
      {},
      { 'ops' => [] },
      { 'ops' => [{ 'insert' => "\n" }] },
      { 'ops' => [{ 'insert' => "\n", 'attributes' => { 'header' => 1 } }] },
      { 'ops' => [{ 'insert' => '' }, { 'insert' => "\n" }] },
      { 'ops' => [{ 'insert' => " \t\u00a0\n" }] },
      [{ 'insert' => "\n" }],
      '{"ops":[{"insert":"","attributes":{"bold":true}},{"insert":"\\n"}]}',
    ].each do |content|
      it "treats #{content.inspect} as blank" do
        expect(lib.blank_content?(content)).to be true
      end
    end

    [
      { 'ops' => [{ 'insert' => "x\n" }] },
      { 'ops' => [{ 'insert' => "\n" }, { 'insert' => "x\n" }] },
      { 'ops' => [{ 'insert' => { 'image' => 'data:image/png;base64,AAAA' } }, { 'insert' => "\n" }] },
      '{"ops":[{"insert":"x\\n"}]}',
      'not json',
    ].each do |content|
      it "treats #{content.inspect} as content" do
        expect(lib.blank_content?(content)).to be false
      end
    end
  end
end
