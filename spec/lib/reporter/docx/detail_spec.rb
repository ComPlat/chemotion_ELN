# frozen_string_literal: true

require 'rails_helper'

# The docx reporter's helper methods operate on Quill delta ops arrays that
# are read out of analysis containers' `extended_metadata['content']`. Before
# B1 these helpers assumed `op['insert']` was either a String or the legacy
# `{"image" => ...}` embed Hash; the modern inline-drop feature produces
# `{"attachment-image" => {...}}` / `{"attachment-file" => {...}}` embed
# hashes, and the helpers crashed with NoMethodError when they tried to
# `.gsub` on the hash.
#
# These specs assert that all four helpers now treat any Hash insert as
# "not text" (leave it untouched, pass it through) instead of crashing.
# Methods are private on Detail; we call via `send` to spec them in
# isolation without going through the full report pipeline.
RSpec.describe Reporter::Docx::Detail do
  subject(:detail) { described_class.new({}) }

  let(:attachment_image_op) do
    { 'insert' => { 'attachment-image' => { 'attachment_identifier' => 'abc', 'filename' => 'x.png' } } }
  end

  let(:attachment_file_op) do
    { 'insert' => { 'attachment-file' => { 'attachment_identifier' => 'xyz', 'filename' => 'x.pdf' } } }
  end

  let(:legacy_image_op) do
    { 'insert' => { 'image' => 'data:image/png;base64,legacy' } }
  end

  describe '#rm_head_space' do
    it 'does not crash on an attachment-image op at the head' do
      expect { detail.send(:rm_head_space, [attachment_image_op, { 'insert' => 'x' }]) }.not_to raise_error
    end

    it 'does not crash on an attachment-file op at the head' do
      expect { detail.send(:rm_head_space, [attachment_file_op, { 'insert' => 'x' }]) }.not_to raise_error
    end

    it 'still strips leading whitespace from a String insert' do
      result = detail.send(:rm_head_space, [{ 'insert' => '   hello' }])
      expect(result.first['insert']).to eq('hello')
    end
  end

  describe '#rm_tail_space' do
    it 'does not crash on an attachment-image op at the tail' do
      expect { detail.send(:rm_tail_space, [{ 'insert' => 'x' }, attachment_image_op]) }.not_to raise_error
    end

    it 'still strips trailing punctuation from a String insert' do
      result = detail.send(:rm_tail_space, [{ 'insert' => 'hello,.' }])
      expect(result.last['insert']).to eq('hello')
    end
  end

  describe '#rm_redundant_newline' do
    it 'does not crash on a mixed ops array containing attachment embeds' do
      ops = [{ 'insert' => "hi\n" }, attachment_image_op, attachment_file_op]
      expect { detail.send(:rm_redundant_newline, ops) }.not_to raise_error
    end

    it 'still chomps a trailing newline from a String insert' do
      ops = [{ 'insert' => "hello\n" }, { 'insert' => 'kept' }]
      detail.send(:rm_redundant_newline, ops)
      expect(ops.first['insert']).to eq('hello')
    end
  end

  describe '#remove_redundant_space_break' do
    it 'does not crash when an attachment-image op is present' do
      expect { detail.send(:remove_redundant_space_break, [attachment_image_op, { 'insert' => 'x' }]) }.not_to raise_error
    end

    it 'does not crash when an attachment-file op is present' do
      expect { detail.send(:remove_redundant_space_break, [attachment_file_op, { 'insert' => 'x' }]) }.not_to raise_error
    end

    it 'still collapses repeated whitespace inside String inserts' do
      result = detail.send(:remove_redundant_space_break, [{ 'insert' => 'a   b' }])
      expect(result.first['insert']).to eq('a b')
    end

    it 'passes through legacy image embed ops without raising' do
      expect { detail.send(:remove_redundant_space_break, [legacy_image_op, { 'insert' => 'x' }]) }.not_to raise_error
    end
  end
end
