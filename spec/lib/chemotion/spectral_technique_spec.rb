# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SpectralTechnique do
  describe '.detect' do
    context 'with NMR measurements (grouped, nucleus-aware)' do
      it 'detects 1H NMR and its nucleus' do
        d = described_class.detect(
          kind: '1H nuclear magnetic resonance spectroscopy (1H NMR)',
          text: '1H NMR (400 MHz, CDCl3 [7.27 ppm], ppm) δ = 8.51 (s, 1H), ' \
                '7.63 (dd, J = 8.4 Hz, J = 1.7 Hz, 1H).',
        )
        expect(d[:key]).to eq('nmr')
        expect(d[:nucleus]).to eq('1H')
        expect(d[:label]).to eq('1H NMR')
      end

      it 'detects 13C NMR from the text alone' do
        d = described_class.detect(text: '13C NMR (100 MHz, CDCl3 [77.0 ppm], ppm) δ = 164.4, 128.3 (q, J = 33.1 Hz).')
        expect(d[:key]).to eq('nmr')
        expect(d[:nucleus]).to eq('13C')
      end

      it 'detects 19F NMR and preserves the nucleus' do
        d = described_class.detect(text: '19F NMR (376 MHz, CDCl3, ppm) δ = –61.63.')
        expect(d[:key]).to eq('nmr')
        expect(d[:nucleus]).to eq('19F')
      end

      it 'defaults the nucleus to 1H when NMR is named without a nucleus' do
        d = described_class.detect(kind: 'nuclear magnetic resonance spectroscopy (NMR)',
                                   text: 'NMR spectrum recorded.')
        expect(d[:key]).to eq('nmr')
        expect(d[:nucleus]).to eq('1H')
      end
    end

    context 'with mass spectrometry measurements' do
      it 'detects EI-MS' do
        d = described_class.detect(text: 'EI (m/z, 70 eV, 70 °C): 353 (12) [M]+, 86 (100).')
        expect(d[:key]).to eq('ms')
        expect(d[:nucleus]).to be_nil
      end

      it 'detects HRMS' do
        d = described_class.detect(text: 'HRMS (C17H14O2NF3S): Calcd 353.0697, Found 353.0699.')
        expect(d[:key]).to eq('ms')
      end
    end

    context 'with IR measurements' do
      it 'detects IR (ATR)' do
        d = described_class.detect(kind: 'infrared absorption spectroscopy (IR)',
                                   text: 'IR (ATR, ṽ) = 2941, 2840, 1707 cm-1.')
        expect(d[:key]).to eq('ir')
      end
    end

    context 'with chromatography and UV-Vis measurements' do
      it 'detects HPLC' do
        expect(described_class.detect(text: 'HPLC (C18): tR = 8.42 min (98.5%).')[:key]).to eq('hplc')
      end

      it 'detects UV-Vis' do
        expect(described_class.detect(text: 'UV/Vis (MeOH): λmax (ε) = 254 (12000) nm.')[:key]).to eq('uvvis')
      end
    end

    context 'with an unknown technique' do
      it 'falls back to generic' do
        d = described_class.detect(text: 'Melting point: 122-124 °C.')
        expect(d[:key]).to eq('generic')
        expect(d[:label]).to eq('Spectral')
      end
    end
  end
end
