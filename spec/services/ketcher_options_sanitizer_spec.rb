# frozen_string_literal: true

require 'rails_helper'

RSpec.describe KetcherOptionsSanitizer do
  # Settings as saved by the Ketcher 3.18 standalone build.
  let(:ketcher_settings) do
    {
      'resetToSelect' => 'paste', 'rotationStep' => 15, 'showValenceWarnings' => true, 'atomColoring' => true,
      'showStereoFlags' => false, 'stereoLabelStyle' => 'Iupac', 'colorOfAbsoluteCenters' => '#ff0000',
      'colorOfAndCenters' => '#0000cd', 'colorOfOrCenters' => '#228b22', 'colorStereogenicCenters' => 'LabelsOnly',
      'autoFadeOfStereoLabels' => true, 'absFlagLabel' => 'ABS', 'andFlagLabel' => 'AND Enantiomer',
      'mixedFlagLabel' => 'Mixed', 'ignoreChiralFlag' => false, 'orFlagLabel' => 'OR Enantiomer',
      'font' => '30px Courier New', 'fontsz' => 20, 'fontszUnit' => 'px', 'fontszsub' => 13, 'fontszsubUnit' => 'px',
      'carbonExplicitly' => false, 'showCharge' => true, 'showValence' => true,
      'showHydrogenLabels' => 'Terminal and Hetero', 'aromaticCircle' => true, 'bondSpacing' => 15,
      'bondThickness' => 2, 'bondThicknessUnit' => 'px', 'stereoBondWidth' => 6, 'stereoBondWidthUnit' => 'px',
      'bondLength' => 80, 'bondLengthUnit' => 'px', 'reactionComponentMarginSize' => 20,
      'reactionComponentMarginSizeUnit' => 'px', 'hashSpacing' => 1.2, 'hashSpacingUnit' => 'px',
      'imageResolution' => '72', 'dearomatize-on-load' => false, 'smart-layout' => true,
      'ignore-stereochemistry-errors' => true, 'mass-skip-error-on-pseudoatoms' => false,
      'gross-formula-add-rsites' => true, 'gross-formula-add-isotopes' => true, 'showAtomIds' => false,
      'showBondIds' => false, 'showHalfBondIds' => false, 'showLoopIds' => false, 'miewMode' => 'LN',
      'miewTheme' => 'light', 'miewAtomLabel' => 'bright'
    }
  end

  def clean(settings)
    described_class.call(settings).first
  end

  def dropped(settings)
    described_class.call(settings).last
  end

  it 'keeps a complete Ketcher settings object unchanged' do
    expect(described_class.call(ketcher_settings)).to eq([ketcher_settings, []])
  end

  it 'returns string keys for symbol keys' do
    expect(clean(rotationStep: 30, atomColoring: false)).to eq('rotationStep' => 30, 'atomColoring' => false)
  end

  it 'treats anything but a Hash as empty' do
    [nil, [], 'text', 42].each { |raw| expect(described_class.call(raw)).to eq([{}, []]) }
  end

  describe 'known keys' do
    {
      'rotationStep' => [0, 91, 15.5, '15', nil],
      'bondSpacing' => [0, 101],
      'fontsz' => [0, 96.1, Float::NAN, Float::INFINITY, '20'],
      'bondLength' => [1001, -1],
      'fontszUnit' => %w[em PX],
      'showCharge' => ['true', 1, nil],
      'resetToSelect' => ['on', nil],
      'stereoLabelStyle' => %w[iupac Other],
      'showHydrogenLabels' => %w[terminal All],
      'colorOfAndCenters' => %w[red #12345 #1234567 #gggggg],
      'imageResolution' => ['high', 72, '12345'],
      'absFlagLabel' => ['a' * 65, "AB\nS", 1],
      'miewTheme' => %w[blue],
    }.each do |key, bad_values|
      bad_values.each do |bad|
        it "drops #{key} = #{bad.inspect}" do
          expect(described_class.call(ketcher_settings.merge(key => bad)))
            .to eq([ketcher_settings.except(key), [key]])
        end
      end
    end

    it 'accepts the range limits' do
      limits = {
        'rotationStep' => 90, 'bondSpacing' => 1, 'fontsz' => 0.1, 'bondLength' => 1000, 'resetToSelect' => true
      }
      expect(clean(limits)).to eq(limits)
    end
  end

  describe 'unknown keys' do
    it 'keeps harmless scalars' do
      extra = { 'newSetting' => true, 'new-limit' => 3.5, 'newLabel' => 'x' }
      expect(clean(extra)).to eq(extra)
    end

    it 'drops nested values, nil and non-finite numbers' do
      junk = { 'nested' => { 'a' => 1 }, 'list' => [1, 2], 'empty' => nil, 'nan' => Float::NAN, 'big' => 'x' * 65 }
      expect(described_class.call(junk)).to eq([{}, junk.keys])
    end

    it 'drops keys that are not short identifiers' do
      junk = { '../evil' => true, 'a b' => true, '1st' => true, '' => true, "k#{'e' * 64}" => true }
      expect(dropped(junk)).to eq(junk.keys)
    end
  end
end
