# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join('lib/tasks/support/ketcher_common_templates_name_sync.rb')

describe KetcherCommonTemplatesNameSync do
  # Minimal molfile: 3 header lines (2nd carries the program/timestamp stamp) + body.
  def molfile(body, stamp: 'Ketcher 07261614192D')
    "\r\n  #{stamp}\r\n\r\n#{body}\r\nM  END\r\n"
  end

  # opts: :notes, :icon (default 'templates/x.png'), :stamp (molfile header stamp)
  def template(name, body, category: 1, **opts)
    molfile_opts = opts.slice(:stamp)
    { 'name' => name, 'molfile' => molfile(body, **molfile_opts), 'template_category_id' => category,
      'notes' => opts[:notes], 'icon_path' => opts.fetch(:icon, 'templates/x.png') }
  end

  let(:logger) { instance_double(Logger, info: nil) }
  let(:dir) { Pathname.new(Dir.mktmpdir) }
  let(:instance_path) { dir.join('instance.json') }
  let(:default_path) { dir.join('default.json') }

  let(:default_templates) do
    [
      template('Alanine', 'ALA', category: 6, notes: 'Ala'),
      template('Decalin', 'DECALIN', category: 2, notes: 'Bicyclo[4.4.0]decane'),
      template('Cycloundecane (2)', 'C11', category: 15),
      template('Tetrakis(trimethylsilyl)silane', 'SI5', category: 19, notes: 'Oligosilane'),
    ]
  end

  let(:instance_templates) do
    [
      template('alanine', 'ALA', category: 6, stamp: 'ChemDraw08271621272D'),
      template('_23', 'DECALIN', category: 2, notes: 'test note'),
      template('_24', 'DECALIN-COPY', category: 2),
      template('_15', 'C11', category: 15),
      template('Cycloalkane_12 Cs', 'C11', category: 15, icon: nil),
      template('My own template', 'CUSTOM', category: 6),
    ]
  end

  def write_files(instance = instance_templates)
    File.write(instance_path, JSON.pretty_generate(instance))
    File.write(default_path, JSON.pretty_generate(default_templates))
  end

  def run_sync
    described_class.call(instance_path: instance_path, default_path: default_path, logger: logger)
  end

  def names
    JSON.parse(File.read(instance_path)).pluck('name')
  end

  before do
    removed = [
      [2, described_class.structure_key(molfile('DECALIN-COPY')), :any],
      [15, described_class.structure_key(molfile('C11')), nil],
    ]
    stub_const("#{described_class}::REMOVED_DUPLICATES", removed)
    stub_const("#{described_class}::ADDED_TEMPLATES", [[19, described_class.structure_key(molfile('SI5'))]])
    write_files
  end

  after { FileUtils.rm_rf(dir) }

  it 'renames templates by structure, ignoring the molfile header stamp' do
    run_sync
    expect(names).to include('Alanine', 'Decalin', 'Cycloundecane (2)')
  end

  it 'removes only the known duplicates, keeping the copy with an icon' do
    result = run_sync
    expect(result.removed).to eq(2)
    expect(names).not_to include('_24', 'Cycloalkane_12 Cs')
    expect(JSON.parse(File.read(instance_path)).find { |t| t['name'] == 'Cycloundecane (2)' }['icon_path'])
      .to eq('templates/x.png')
  end

  it 'adds missing templates once' do
    run_sync
    run_sync
    expect(names.count('Tetrakis(trimethylsilyl)silane')).to eq(1)
  end

  it 'leaves unrecognised templates unchanged and reports them' do
    result = run_sync
    expect(names).to include('My own template')
    expect(result.unmatched).to eq(['My own template'])
  end

  it 'fills aliases into blank or placeholder notes but keeps real notes' do
    write_files([template('alanine', 'ALA', category: 6, notes: 'curated by admin'),
                 template('_23', 'DECALIN', category: 2, notes: 'test note'),
                 template('_15', 'C11', category: 15, notes: 'test note')])
    run_sync
    notes = JSON.parse(File.read(instance_path)).to_h { |t| [t['name'], t['notes']] }
    expect(notes).to eq('Alanine' => 'curated by admin', 'Decalin' => 'Bicyclo[4.4.0]decane',
                        'Cycloundecane (2)' => nil, 'Tetrakis(trimethylsilyl)silane' => 'Oligosilane')
  end

  it 'is idempotent and does not rewrite an up-to-date file' do
    run_sync
    content = File.read(instance_path)
    mtime = File.mtime(instance_path)
    result = run_sync
    expect(result.changed?).to be(false)
    expect(File.read(instance_path)).to eq(content)
    expect(File.mtime(instance_path)).to eq(mtime)
  end

  it 'keeps a backup of the previous file' do
    original = File.read(instance_path)
    run_sync
    expect(File.read("#{instance_path}.bak")).to eq(original)
  end

  it 'leaves the file intact when it is not valid JSON' do
    File.write(instance_path, '{ broken')
    expect { run_sync }.to raise_error(JSON::ParserError)
    expect(File.read(instance_path)).to eq('{ broken')
  end

  describe '.valid_template_file?' do
    it 'accepts a JSON array' do
      expect(described_class.valid_template_file?(instance_path)).to be(true)
    end

    it 'rejects broken, non-array or missing files' do
      broken = dir.join('broken.json').tap { |p| File.write(p, '{ broken') }
      object = dir.join('object.json').tap { |p| File.write(p, '{}') }
      expect([broken, object, dir.join('missing.json')].map { |p| described_class.valid_template_file?(p) })
        .to eq([false, false, false])
    end
  end

  it 'skips when there is no instance file' do
    FileUtils.rm_f(instance_path)
    expect(run_sync).to be_nil
  end

  describe 'with the real default list' do
    # Captured at load time, before the outer `before` stubs them.
    real_removed = described_class::REMOVED_DUPLICATES
    real_added = described_class::ADDED_TEMPLATES

    let(:real_default) { JSON.parse(File.read(described_class::TEMPLATES_DEFAULT)) }
    let(:real_keys) do
      real_default.map { |t| [t['template_category_id'], described_class.structure_key(t['molfile'])] }
    end

    it 'no longer contains the removed duplicates but contains the added templates' do
      removed_keys = real_removed.map { |category, key, _icon| [category, key] }
      # Only the category-15 structure remains, once (the copy that has an icon).
      expect((real_keys & removed_keys).size).to eq(1)
      expect(real_added - real_keys).to be_empty
    end

    it 'has unique, readable names and unique structures' do
      names = real_default.pluck('name')
      expect(names.size).to eq(names.uniq.size)
      expect(names.grep(/\A(_\d+|[a-z])/)).to be_empty
      expect(real_keys.uniq.size).to eq(real_default.size)
    end

    it 'is unchanged when synced onto itself' do
      stub_const("#{described_class}::REMOVED_DUPLICATES", real_removed)
      stub_const("#{described_class}::ADDED_TEMPLATES", real_added)
      result = described_class.new(instance_path: nil, default_path: nil, logger: logger)
                              .sync(real_default, real_default)
      expect(result.changed?).to be(false)
    end
  end
end
