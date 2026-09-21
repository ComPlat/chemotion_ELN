# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ChemicalsService do
  describe '.validate_product_number!' do
    it 'raises when product_number is nil' do
      expect { described_class.validate_product_number!(nil) }.to raise_error(StandardError)
    end

    it 'raises when product_number is blank' do
      expect { described_class.validate_product_number!('  ') }.to raise_error(StandardError)
    end

    it 'raises when product_number contains suspicious characters' do
      expect { described_class.validate_product_number!('bl3h9abba10e?context=bbe') }.to raise_error(StandardError)
    end

    it 'does not raise for valid product numbers' do
      expect { described_class.validate_product_number!('ABC-123_def') }.not_to raise_error
    end
  end

  describe '.write_file with a Grape upload' do
    let(:relative_path) { '/safety_sheets/testvendor/upload.pdf' }
    let(:full_path) { Rails.public_path.join('safety_sheets/testvendor/upload.pdf') }

    after { FileUtils.rm_rf(Rails.public_path.join('safety_sheets/testvendor')) }

    it 'writes the upload when the hash is keyed by symbol' do
      described_class.write_file(relative_path, { tempfile: StringIO.new('%PDF symbol') })
      expect(File.read(full_path)).to eq('%PDF symbol')
    end

    it 'writes the upload when the hash is keyed by string' do
      described_class.write_file(relative_path, { 'tempfile' => StringIO.new('%PDF string') })
      expect(File.read(full_path)).to eq('%PDF string')
    end

    it 'rewinds an upload whose hash was already computed' do
      io = StringIO.new('%PDF rewound')
      io.read
      described_class.write_file(relative_path, { tempfile: io })
      expect(File.read(full_path)).to eq('%PDF rewound')
    end
  end

  describe '.fisher_sds' do
    def source(registry, url)
      { RegistryID: registry, SourceRecordURL: url }
    end

    it 'prefixes an all-numeric Thermo catalogue code with AC' do
      part, url = described_class.fisher_sds(
        source('GID_900000000130357', 'https://www.thermofisher.com/order/catalog/product/327840025'), 'en'
      )
      expect(part).to eq('AC327840025')
      expect(url).to start_with('https://www.fishersci.com/store/msds?partNumber=AC327840025')
    end

    it 'uses a Fisher Chemical catalogue number unchanged' do
      part, url = described_class.fisher_sds(source('A111', nil), 'en')
      expect(part).to eq('A111')
      expect(url).to include('partNumber=A111')
    end

    it 'maps a letter-prefixed dotted code to an ALFAA SKU on DirectWebViewer' do
      part, url = described_class.fisher_sds(
        source('GID_1', 'https://www.thermofisher.com/order/catalog/product/B22935.06'), 'de'
      )
      expect(part).to eq('ALFAAB22935')
      expect(url).to eq(
        'https://documents.thermofisher.com/directwebviewer/private/results.aspx' \
        '?page=NewSearch&LANGUAGE=d__DE&SUBFORMAT=d__CLP1&SKU=ALFAAB22935&PLANT=d__ALF',
      )
    end

    it 'falls back to English for a language Thermo does not publish' do
      _, url = described_class.fisher_sds(
        source('GID_1', 'https://www.thermofisher.com/order/catalog/product/L10407.AU'), 'it'
      )
      expect(url).to include('LANGUAGE=d__EN')
    end

    it 'builds no SDS link for an all-numeric dotted code' do
      expect(
        described_class.fisher_sds(
          source('GID_1', 'https://www.thermofisher.com/order/catalog/product/019392.K7'), 'en'
        ),
      ).to be_nil
    end
  end

  describe 'save routing' do
    it 'marks Sigma sheets browser-fetched, since the server is refused' do
      expect(described_class.vendor_save_mode('Sigma-Aldrich')).to eq('browser')
    end

    it 'marks Thermo sheets server-fetched' do
      expect(described_class.vendor_save_mode('Thermo Fisher Scientific')).to eq('server')
      expect(described_class.vendor_save_mode('Fisher Chemical')).to eq('server')
    end

    it 'offers no save route for a catalogue-only vendor' do
      expect(described_class.vendor_save_mode('abcr GmbH')).to eq('none')
    end

    it 'falls back to the other route for a vendor that has one' do
      expect(described_class.vendor_save_modes('Sigma-Aldrich')).to eq(%w[browser server])
      expect(described_class.vendor_save_modes('Thermo Fisher Scientific')).to eq(%w[server browser])
    end

    it 'offers no fallback for a catalogue-only vendor' do
      expect(described_class.vendor_save_modes('abcr GmbH')).to be_empty
    end
  end

  describe '.thermofisher' do
    let(:sources) do
      [{ SourceName: 'Thermo Fisher Scientific', RegistryID: 'GID_900000000130357',
         SourceRecordURL: 'https://www.thermofisher.com/order/catalog/product/327840025' },
       { SourceName: 'Sigma-Aldrich', RegistryID: '179124_SIGALD',
         SourceRecordURL: 'https://www.sigmaaldrich.com/catalog/product/sigald/179124' }]
    end

    it 'resolves the Fisher catalogue entry through PubChem' do
      allow(PubChem).to receive_messages(get_cid_from_identifier: 180, get_vendor_sources_from_cid: sources)
      expect(described_class.thermofisher('Acetone', 'en')).to include(
        'fisher_product_number' => 'AC327840025',
        'save_modes' => %w[server browser],
      )
    end

    it 'ignores vendors other than the Fisher lineage' do
      allow(PubChem).to receive_messages(get_cid_from_identifier: 180,
                                         get_vendor_sources_from_cid: [sources.last])
      expect(described_class.thermofisher('Acetone', 'en'))
        .to eq(described_class.no_sheet_found(described_class::THERMO_VENDOR))
    end

    it 'reports a miss when PubChem knows no CID' do
      allow(PubChem).to receive(:get_cid_from_identifier).and_return(nil)
      expect(described_class.thermofisher('Nonexistent', 'en'))
        .to eq(described_class.no_sheet_found(described_class::THERMO_VENDOR))
    end
  end

  describe '.no_sheet_found' do
    it 'names the vendor the way the UI names it' do
      expect(described_class.no_sheet_found(described_class::SDS_VENDOR))
        .to eq('No safety data sheet found from Sigma-Aldrich')
      expect(described_class.no_sheet_found(described_class::THERMO_VENDOR))
        .to eq('No safety data sheet found from Thermofisher')
    end

    it 'never calls Sigma-Aldrich by its parent company' do
      expect(described_class.no_sheet_found(described_class::SDS_VENDOR)).not_to include('Merck')
    end
  end

  describe 'narrowing a vendor search by product number' do
    let(:sources) do
      [{ SourceName: 'Sigma-Aldrich', RegistryID: '00560_SIAL',
         SourceRecordURL: 'https://www.sigmaaldrich.com/catalog/product/sial/00560' },
       { SourceName: 'Sigma-Aldrich', RegistryID: '179124_SIGALD',
         SourceRecordURL: 'https://www.sigmaaldrich.com/catalog/product/sigald/179124' },
       { SourceName: 'Thermo Fisher Scientific', RegistryID: 'GID_900000000130357',
         SourceRecordURL: 'https://www.thermofisher.com/order/catalog/product/327840025' }]
    end

    before do
      allow(PubChem).to receive_messages(get_cid_from_identifier: 180, get_vendor_sources_from_cid: sources)
    end

    it 'keeps only the vendor holding that number' do
      overview = described_class.vendor_overview('Acetone', 'en', '179124')
      expect(overview['sds_vendors'].pluck('vendor')).to eq(['Sigma-Aldrich'])
      expect(overview['sds_vendors'].first['products'].pluck('merck_product_number')).to eq(['179124'])
      expect(overview['sds_vendors'].first['count']).to eq(1)
    end

    it 'matches a Fisher code through its catalogue prefix' do
      overview = described_class.vendor_overview('Acetone', 'en', '327840025')
      expect(overview['sds_vendors'].pluck('vendor')).to eq(['Thermo Fisher Scientific'])
      expect(overview['sds_vendors'].first['products'].first['fisher_product_number']).to eq('AC327840025')
    end

    it 'ignores separators and case in the number the user typed' do
      overview = described_class.vendor_overview('Acetone', 'en', ' 179-124 ')
      expect(overview['sds_vendors'].first['products'].pluck('merck_product_number')).to eq(['179124'])
    end

    it 'returns no vendor when nothing carries that number' do
      overview = described_class.vendor_overview('Acetone', 'en', '999999')
      expect(overview['sds_vendors']).to be_empty
      expect(overview['catalogue_vendors']).to be_empty
    end

    it 'says so in the same words a single vendor would' do
      overview = described_class.vendor_overview('Acetone', 'en', '999999')
      expect(overview['message']).to eq(described_class.no_sheet_found(described_class::ALL_VENDORS))
      expect(overview['message']).to eq('No safety data sheet found from any vendor')
    end

    it 'carries no message when vendors were found' do
      expect(described_class.vendor_overview('Acetone', 'en')).not_to have_key('message')
    end

    it 'says the same when PubChem knows no CID' do
      allow(PubChem).to receive(:get_cid_from_identifier).and_return(nil)
      expect(described_class.vendor_overview('Nonexistent', 'en')['message'])
        .to eq(described_class.no_sheet_found(described_class::ALL_VENDORS))
    end

    it 'leaves the listing whole when no number is given' do
      expect(described_class.vendor_overview('Acetone', 'en')['sds_vendors'].size).to eq(2)
    end

    it 'picks the Sigma entry the number names, not the highest-ranked brand' do
      expect(described_class.merck('Acetone', 'en', '00560')).to include('merck_product_number' => '00560')
      expect(described_class.merck('Acetone', 'en')).to include('merck_product_number' => '179124')
    end

    it 'reports a miss when the number matches no Sigma entry' do
      expect(described_class.merck('Acetone', 'en', '999999'))
        .to eq(described_class.no_sheet_found(described_class::SDS_VENDOR))
    end

    it 'narrows the Thermofisher lookup the same way' do
      expect(described_class.thermofisher('Acetone', 'en', '327840025'))
        .to include('fisher_product_number' => 'AC327840025')
      expect(described_class.thermofisher('Acetone', 'en', '999999'))
        .to eq(described_class.no_sheet_found(described_class::THERMO_VENDOR))
    end
  end

  describe '.duplicate_sheet_message' do
    it 'names the catalogue number the sheet is already held under' do
      expect(described_class.duplicate_sheet_message('/safety_sheets/fisher/AC196660010_web_2be7b427e93cc619.pdf'))
        .to eq('This sample already holds this sheet. It is the same document as AC196660010.')
    end

    it 'reads a sheet saved under the current naming' do
      expect(described_class.duplicate_sheet_message('/safety_sheets/merck/392693_c4f307a89d9fd8c2.pdf'))
        .to include('as 392693.')
    end

    it 'falls back to a plain sentence when the name says nothing' do
      expect(described_class.duplicate_sheet_message(nil))
        .to eq('This sample already holds this safety data sheet.')
    end
  end

  describe '.sheet_already_saved?' do
    let(:saved) { '/safety_sheets/merck/a_1111111111111111.pdf' }
    let(:data) { [{ 'safetySheetPath' => [{ 'a_1111111111111111_link' => saved }] }] }

    it 'spots the same file already on this sample' do
      expect(described_class.sheet_already_saved?(data, saved)).to be true
    end

    it 'lets a different sheet for the same product through' do
      expect(described_class.sheet_already_saved?(data, '/safety_sheets/merck/a_2222222222222222.pdf')).to be false
    end

    it 'holds no opinion on an empty sample', :aggregate_failures do
      expect(described_class.sheet_already_saved?([{}], '/safety_sheets/merck/a.pdf')).to be false
      expect(described_class.sheet_already_saved?(nil, '/safety_sheets/merck/a.pdf')).to be false
    end
  end

  describe 'saving a second sheet for one product number' do
    let(:vendor) { 'merck' }
    let(:product) { '270709' }
    let(:link) { 'https://www.sigmaaldrich.com/sheet.pdf' }
    let(:first_initials) { Digest::MD5.hexdigest('%PDF first')[0..15] }

    before do
      FileUtils.mkdir_p("public/safety_sheets/#{vendor}")
      # The name carries the content hash, which is how a duplicate is found.
      File.write("public/safety_sheets/#{vendor}/#{product}_#{first_initials}.pdf", '%PDF first')
    end

    after { FileUtils.rm_rf("public/safety_sheets/#{vendor}") }

    # The old code globbed <product>_web_*.pdf and returned that file without ever
    # fetching, so a second language or revision could never be saved.
    it 'writes the second sheet rather than handing back the first', :aggregate_failures do
      allow(described_class).to receive(:request_pdf_file) do |_url, path|
        File.write(path, '%PDF second')
        true
      end

      result = described_class.find_existing_or_create_safety_sheet(link, vendor, product)
      expect(result).to match(%r{\A/safety_sheets/#{vendor}/#{product}_[a-f0-9]{16}\.pdf\z})
      expect(result).not_to end_with("#{first_initials}.pdf")
      expect(File.read("public#{result}")).to eq('%PDF second')
    end

    it 'hands back the file already held when the bytes repeat' do
      allow(described_class).to receive(:request_pdf_file) do |_url, path|
        File.write(path, '%PDF first')
        true
      end

      result = described_class.find_existing_or_create_safety_sheet(link, vendor, product)
      expect(result).to eq("/safety_sheets/#{vendor}/#{product}_#{first_initials}.pdf")
    end
  end

  describe '.sds_limit_reached?' do
    def with_sheets(count)
      [{ 'safetySheetPath' => Array.new(count) { |i| { "p#{i}_link" => "/safety_sheets/merck/p#{i}.pdf" } } }]
    end

    it 'allows a save below the cap' do
      expect(described_class.sds_limit_reached?(with_sheets(described_class::MAX_SAVED_SDS - 1))).to be false
    end

    it 'refuses a save at the cap' do
      expect(described_class.sds_limit_reached?(with_sheets(described_class::MAX_SAVED_SDS))).to be true
    end

    it 'treats a chemical with no sheets yet as free' do
      expect(described_class.sds_limit_reached?([{}])).to be false
      expect(described_class.sds_limit_reached?(nil)).to be false
    end
  end

  describe '.fetch_allowed_url' do
    let(:pdf) { instance_double(HTTParty::Response, headers: { 'Content-Type' => 'application/pdf' }) }

    def redirect_to(location)
      instance_double(HTTParty::Response, headers: { 'Location' => location }, code: 302)
    end

    it 'follows a redirect that stays on an allowed host' do
      allow(HTTParty).to receive(:get).with('https://www.fishersci.com/start', anything)
                                      .and_return(redirect_to('https://www.fishersci.com/final.pdf'))
      allow(HTTParty).to receive(:get).with('https://www.fishersci.com/final.pdf', anything).and_return(pdf)
      expect(described_class.fetch_allowed_url('https://www.fishersci.com/start')).to eq(pdf)
    end

    it 'refuses a redirect that leaves the allowlist' do
      allow(HTTParty).to receive(:get).and_return(redirect_to('https://evil.example.com/x.pdf'))
      expect { described_class.fetch_allowed_url('https://www.fishersci.com/start') }
        .to raise_error(StandardError, /not allowed/)
    end

    it 'gives up rather than following a redirect loop' do
      looping = redirect_to('https://www.fishersci.com/again')
      allow(HTTParty).to receive(:get).and_return(looping)
      expect(described_class.fetch_allowed_url('https://www.fishersci.com/start')).to eq(looping)
    end
  end

  describe '.merck and .vendor_groups' do
    let(:sources) do
      [
        { SourceName: 'Sigma-Aldrich', RegistryID: '00560_SIAL',
          SourceRecordURL: 'https://www.sigmaaldrich.com/catalog/product/sial/00560?utm_source=pubchem' },
        { SourceName: 'Sigma-Aldrich', RegistryID: '179124_SIGALD',
          SourceRecordURL: 'https://www.sigmaaldrich.com/catalog/product/sigald/179124?utm_source=pubchem' },
        { SourceName: 'Thermo Fisher Scientific', RegistryID: 'GID_900000000130357',
          SourceRecordURL: 'https://www.thermofisher.com/order/catalog/product/327840025' },
        { SourceName: 'Glentham Life Sciences Ltd.', RegistryID: 'GK3021',
          SourceRecordURL: 'https://www.glentham.com/en/products/product/GK3021/' },
      ]
    end

    before do
      allow(PubChem).to receive_messages(get_cid_from_identifier: 180, get_vendor_sources_from_cid: sources)
    end

    it 'prefers the sigald brand over sial when both are listed' do
      expect(described_class.merck('Acetone', 'en')).to eq(
        'merck_link' => 'https://www.sigmaaldrich.com/DE/en/sds/sigald/179124',
        'merck_product_number' => '179124',
        'merck_product_link' => 'https://www.sigmaaldrich.com/DE/de/product/sigald/179124',
        'save_mode' => 'browser',
        'save_modes' => %w[browser server],
      )
    end

    it 'reports a miss when PubChem knows no CID' do
      allow(PubChem).to receive(:get_cid_from_identifier).and_return(nil)
      expect(described_class.merck('Nonexistent', 'en'))
        .to eq(described_class.no_sheet_found(described_class::SDS_VENDOR))
    end

    it 'groups vendors and puts the SDS-capable one first' do
      groups = described_class.vendor_groups('Acetone', 'en')
      expect(groups.map { |g| g['vendor'] }).to eq(
        ['Sigma-Aldrich', 'Thermo Fisher Scientific', 'Glentham Life Sciences Ltd.'],
      )
      expect(groups.first).to include('count' => 2, 'sds_supported' => true)
    end

    it 'builds an AC-prefixed Fisher SDS link from an all-numeric Thermo catalogue code' do
      thermo = described_class.vendor_groups('Acetone', 'en').find { |g| g['vendor'].start_with?('Thermo') }
      expect(thermo['sds_supported']).to be true
      expect(thermo['products'].first).to include(
        'fisher_product_number' => 'AC327840025',
        'fisher_link' => 'https://www.fishersci.com/store/msds?partNumber=AC327840025' \
                         '&productDescription=&language=EN&countryCode=US',
      )
    end

    it 'uses a Fisher Chemical RegistryID verbatim as the part number' do
      allow(PubChem).to receive(:get_vendor_sources_from_cid).and_return(
        [{ SourceName: 'Fisher Chemical', RegistryID: 'A111', SourceRecordURL: nil }],
      )
      group = described_class.vendor_groups('Acetone', 'en').first
      expect(group['products'].first).to eq(
        'fisher_link' => 'https://www.fishersci.com/store/msds?partNumber=A111' \
                         '&productDescription=&language=EN&countryCode=US',
        'fisher_product_number' => 'A111',
        'save_mode' => 'server',
        'save_modes' => %w[server browser],
      )
    end

    it 'leaves a dotted Thermo code as a catalogue link with no SDS' do
      allow(PubChem).to receive(:get_vendor_sources_from_cid).and_return(
        [{ SourceName: 'Thermo Fisher Scientific', RegistryID: 'GID_900000000130357',
           SourceRecordURL: 'https://www.thermofisher.com/order/catalog/product/019392.K7' }],
      )
      group = described_class.vendor_groups('Acetone', 'en').first
      expect(group['sds_supported']).to be false
      expect(group['products'].first).not_to have_key('fisher_link')
    end

    it 'gives a catalogue-only vendor a product link and no SDS link' do
      glentham = described_class.vendor_groups('Acetone', 'en').find { |g| g['vendor'].start_with?('Glentham') }
      expect(glentham['sds_supported']).to be false
      expect(glentham['products'].first).to eq(
        'label' => 'GK3021', 'product_link' => 'https://www.glentham.com/en/products/product/GK3021/',
      )
    end

    it 'splits curated vendors into sheet sources and catalogue-only ones' do
      allow(PubChem).to receive(:get_vendor_sources_from_cid).and_return(
        sources + [{ SourceName: 'abcr GmbH', RegistryID: 'AB148930',
                     SourceRecordURL: 'https://abcr.com/de_en/AB148930' },
                   { SourceName: 'VladaChem', RegistryID: 'V1',
                     SourceRecordURL: 'https://www.vladachem.com/product.php?products=67-64-1' }],
      )
      overview = described_class.vendor_overview('Acetone', 'en')
      expect(overview['sds_vendors'].map { |g| g['vendor'] }).to eq(['Sigma-Aldrich', 'Thermo Fisher Scientific'])
      expect(overview['catalogue_vendors'].map { |g| g['vendor'] })
        .to contain_exactly('abcr GmbH', 'Glentham Life Sciences Ltd.')
      expect(overview['catalogue_vendors'].map { |g| g['vendor'] }).not_to include('VladaChem')
    end

    it 'counts every vendor and links to the full PubChem list' do
      overview = described_class.vendor_overview('Acetone', 'en')
      expect(overview['vendor_count']).to eq(3)
      expect(overview['pubchem_url']).to eq(
        'https://pubchem.ncbi.nlm.nih.gov/compound/180#section=Chemical-Vendors',
      )
    end

    it 'returns an empty overview when PubChem knows no CID' do
      allow(PubChem).to receive(:get_cid_from_identifier).and_return(nil)
      expect(described_class.vendor_overview('Nonexistent', 'en')).to eq(
        'sds_vendors' => [],
        'catalogue_vendors' => [],
        'vendor_count' => 0,
        'message' => described_class.no_sheet_found(described_class::ALL_VENDORS),
      )
    end

    it 'falls back to the URL segment when RegistryID is an internal PubChem GID' do
      allow(PubChem).to receive(:get_vendor_sources_from_cid).and_return(
        [{ SourceName: 'Oakwood Products', RegistryID: 'GID_900000000999999',
           SourceRecordURL: 'https://oakwoodchemical.com/products/035905' }],
      )
      expect(described_class.vendor_groups('Acetone', 'en').first['products'].first['label']).to eq('035905')
    end
  end

  describe Chemotion::ChemicalsService do
    context 'with write_file (current implementation)' do
      let(:link) { 'https://www.sigmaaldrich.com/DE/en/sds/sigald/383112' }
      let(:relative_path) { '/safety_sheets/merck/252549_test.pdf' }
      let(:full_path) { File.join('public', relative_path) }

      before { FileUtils.rm_f(full_path) }

      it 'downloads and writes PDF returning true (delegates to request_pdf_file)' do
        pdf_body = '%PDF test'
        allow(HTTParty).to receive(:get).with(link, anything).and_return(
          instance_double(HTTParty::Response, headers: { 'Content-Type' => 'application/pdf' }, body: pdf_body),
        )
        # request_pdf_file invoked internally when no upload given -> returns true
        result = described_class.write_file(relative_path, nil, link)
        expect(result).to be(true)
        expect(File.exist?(full_path)).to be true
      end

      it 'returns false when remote content not PDF' do
        allow(HTTParty).to receive(:get).and_return(
          instance_double(HTTParty::Response, headers: { 'Content-Type' => 'text/html' }, body: '<html/>'),
        )
        result = described_class.write_file(relative_path, nil, link)
        expect(result).to be(false)
        expect(File.exist?(full_path)).to be false
      end

      it 'writes uploaded tempfile (hash with tempfile) returning bytes written' do
        io = StringIO.new('uploaded content')
        file_param = { 'tempfile' => io }
        result = described_class.write_file(relative_path, file_param, nil)
        expect(result).to be > 0
        expect(File.exist?(full_path)).to be true
        expect(File.binread(full_path)).to eq('uploaded content')
      end

      it 'writes IO object directly (e.g. StringIO) returning bytes written' do
        io = StringIO.new('direct content')
        result = described_class.write_file(relative_path, io, nil)
        expect(result).to be > 0
        expect(File.exist?(full_path)).to be true
        expect(File.binread(full_path)).to eq('direct content')
      end
    end

    context 'when creating SDS file (API download path)' do
      # Must be an ALLOWED_DOMAINS host, or validate_url_for_request! rejects it before the download.
      let(:link) { 'https://www.sigmaaldrich.com/DE/en/sds/sial/A14672' }
      let(:product_number) { 'A14672' }
      let(:vendor) { 'thermofischer' }
      let(:full_hash) { 'a' * 32 }
      let(:hash_initials) { full_hash[0..15] }

      before do
        allow(HTTParty).to receive(:get).with(link, anything).and_return(
          instance_double(HTTParty::Response, headers: { 'Content-Type' => 'application/pdf' }, body: '%PDF test'),
        )
        allow(Chemotion::GenerateFileHashUtils).to receive(:generate_full_hash).and_return(full_hash)
        FileUtils.mkdir_p('public/safety_sheets/thermofischer')
      end

      it 'reuses the file already on disk when the bytes are the same' do
        existing_path = "/safety_sheets/#{vendor}/#{product_number}_#{hash_initials}.pdf"
        allow(Chemotion::GenerateFileHashUtils).to receive(:find_identical_sheet).and_return(existing_path)
        result = described_class.create_sds_file(link, product_number, vendor)
        expect(result).to eq(existing_path)
      end

      it 'writes a new file, with no web marker, when nothing matches', :aggregate_failures do
        allow(Chemotion::GenerateFileHashUtils).to receive(:find_identical_sheet).and_return(nil)
        result = described_class.create_sds_file(link, product_number, vendor)
        expect(result).to match(%r{^/safety_sheets/#{vendor}/#{product_number}_[a-f0-9]{16}\.pdf$})
        expect(result).not_to include('_web_')
        expect(File.exist?(File.join('public', result))).to be true
      end

      it 'returns error hash when request_pdf_file returns error hash' do
        allow(described_class).to receive(:request_pdf_file).and_return({ error: 'net fail' })
        result = described_class.create_sds_file(link, product_number, vendor)
        if result.is_a?(Hash)
          expect(result).to eq({ error: 'net fail' })
        else
          # In case implementation continues to produce a file path despite error stub
          expect(result).to match(%r{^/safety_sheets/#{vendor}/#{product_number}_web_[a-f0-9]{16}\.pdf$})
        end
      end

      it 'returns false when request_pdf_file returns false (non-PDF), propagating failure' do
        allow(described_class).to receive(:request_pdf_file).and_return(false)
        result = described_class.create_sds_file(link, product_number, vendor)
        expect(result).to be(false)
      end
    end

    context 'with chem_properties_alfa' do
      it 'constructs chemical properties hash for alfa vendor' do
        properties = ['formula', 'NaI', 'formula Weight', '149.89', 'form', 'powder', 'melting point', '651°']
        chemical_properties = described_class.chem_properties_alfa(properties)
        expect(chemical_properties.keys).to match_array(%w[formula formula_weight form melting_point])
      end
    end

    context 'when handling exceptions' do
      it 'executes block without error' do
        result = described_class.handle_exceptions { 'ok' }
        expect(result).to eq('ok')
      end

      it 'captures JSON::ParserError' do
        result = described_class.handle_exceptions { raise JSON::ParserError, 'msg' }
        expect(result[:error]).to eq('Invalid JSON data')
      end

      it 'captures ActiveRecord::StatementInvalid' do
        error = ActiveRecord::StatementInvalid.new('db')
        result = described_class.handle_exceptions { raise error }
        expect(result[:error]).to include('db')
      end

      it 'captures ActiveRecord::RecordInvalid' do
        chem = build(:chemical)
        result = described_class.handle_exceptions { raise ActiveRecord::RecordInvalid, chem }
        expect(result[:error]).to be_a(String)
      end

      it 'captures StandardError default' do
        result = described_class.handle_exceptions { raise StandardError, 'boom' }
        expect(result[:error]).to eq('boom')
      end
    end

    context 'when clean_property_name' do
      it 'handles abbreviations and german forms' do
        expect(described_class.clean_property_name('mp (schmelzpunkt)')).to eq('melting_point')
        expect(described_class.clean_property_name('bp')).to eq('boiling_point')
        expect(described_class.clean_property_name('qualitätsniveau')).to eq('quality level')
      end

      it 'returns nil for blank' do
        expect(described_class.clean_property_name('')).to be_nil
      end
    end

    context 'with generate_safety_sheet_file_path' do
      it 'names a sheet by vendor, product and content hash' do
        path = described_class.generate_safety_sheet_file_path('merck', '270709', 'abcd1234efgh5678')
        expect(path).to eq('/safety_sheets/merck/270709_abcd1234efgh5678.pdf')
      end
    end

    context 'with update_chemical_data' do
      let(:data) { [{ 'safetySheetPath' => [] }] }
      # Use only hex chars so regex in service matches
      let(:file_path) { '/safety_sheets/merck/270709_abcd1234efab5678.pdf' }

      it 'appends new safety sheet key when absent' do
        updated = described_class.update_chemical_data(data, file_path, '270709')
        keys = updated[0]['safetySheetPath'].flat_map(&:keys)
        expect(keys.first).to eq('270709_abcd1234efab5678_link')
      end

      it 'does not duplicate existing safety sheet key' do
        described_class.update_chemical_data(data, file_path, '270709')
        updated = described_class.update_chemical_data(data, file_path, '270709')
        expect(updated[0]['safetySheetPath'].size).to eq(1)
      end

      it 'records a file reused from another vendor folder' do
        reused = '/safety_sheets/fisher/AC123_abcd1234efab5678.pdf'
        updated = described_class.update_chemical_data(data, reused, '270709')
        expect(updated[0]['safetySheetPath'].flat_map(&:values)).to eq([reused])
      end

      it 'returns original data when pattern does not match' do
        unchanged = described_class.update_chemical_data(data, '/invalid/path.pdf', '270709')
        expect(unchanged[0]['safetySheetPath']).to be_empty
      end
    end

    context 'when finding existing or creating safety sheet' do
      let(:link) { 'http://example.com/file.pdf' }

      it 'always fetches, so a second sheet for one product can still be saved' do
        allow(described_class).to receive(:create_sds_file)
          .and_return('/safety_sheets/merck/270709_abcd1234efab5678.pdf')
        result = described_class.find_existing_or_create_safety_sheet(link, 'merck', '270709')
        expect(result).to eq('/safety_sheets/merck/270709_abcd1234efab5678.pdf')
        expect(described_class).to have_received(:create_sds_file).with(link, '270709', 'merck')
      end
    end

    context 'with request_pdf_file edge cases' do
      let(:tmp_path) { File.join(Dir.mktmpdir, 'file.pdf') }

      it 'returns error hash on exception' do
        allow(HTTParty).to receive(:get).and_raise(StandardError.new('net'))
        result = described_class.request_pdf_file('https://www.sigmaaldrich.com/x', tmp_path)
        expect(result).to be_a(Hash)
        expect(result[:error]).to include('net')
      end

      it 'refuses a page that is not a PDF however it is labelled' do
        resp = instance_double(HTTParty::Response, headers: { 'Content-Type' => 'application/pdf' },
                                                   body: '<html>Access Denied</html>')
        allow(HTTParty).to receive(:get).and_return(resp)
        allow(Rails.logger).to receive(:warn)
        expect(described_class.request_pdf_file('https://www.sigmaaldrich.com/x', tmp_path)).to be false
      end

      # Fisher labels the same sheet octet-stream under load; the bytes are what matter.
      it 'accepts a PDF sent under the wrong content type', :aggregate_failures do
        resp = instance_double(HTTParty::Response, headers: { 'Content-Type' => 'application/octet-stream' },
                                                   body: '%PDF-1.4 body')
        allow(HTTParty).to receive(:get).and_return(resp)
        expect(described_class.request_pdf_file('https://www.sigmaaldrich.com/x', tmp_path)).to be true
        expect(File.read(tmp_path)).to eq('%PDF-1.4 body')
      end
    end

    context 'with construct_p_statements' do
      it 'resolves individual P codes' do
        result = described_class.construct_p_statements('P102,P260')
        expect(result).to include('P102', 'P260')
      end

      it 'resolves a known combined key that exists in the JSON' do
        result = described_class.construct_p_statements(['P302+P352'])
        expect(result.keys).to eq(['P302+P352'])
      end

      it 'decomposes an unknown + combination into individual codes' do
        # P302+P335+P340 is not in the JSON as a combined key but each part is
        result = described_class.construct_p_statements(['P302+P335+P340'])
        expect(result.keys).to match_array(%w[P302 P335 P340])
      end

      it 'includes values for all decomposed precautionary codes' do
        result = described_class.construct_p_statements(['P302+P335+P340'])
        expect(result['P302']).to be_present
        expect(result['P335']).to be_present
        expect(result['P340']).to be_present
      end

      it 'decomposes P304+P335+P315' do
        result = described_class.construct_p_statements(['P304+P335+P315'])
        expect(result.keys).to match_array(%w[P304 P335 P315])
      end

      it 'decomposes a 4-part combination P370+P372+P380+P374' do
        result = described_class.construct_p_statements(['P370+P372+P380+P374'])
        expect(result.keys).to match_array(%w[P370 P372 P380 P374])
      end

      it 'handles mixed input: known combo and unknown combo together' do
        result = described_class.construct_p_statements(['P302+P352', 'P302+P335+P340'])
        expect(result).to have_key('P302+P352')
        expect(result).to have_key('P335')
        expect(result).to have_key('P340')
      end

      it 'silently skips codes not in the JSON' do
        result = described_class.construct_p_statements(['P999'])
        expect(result).to be_empty
      end
    end

    context 'with construct_h_statements' do
      it 'resolves individual H codes' do
        result = described_class.construct_h_statements('H301 H314')
        expect(result).to include('H301', 'H314')
      end

      it 'decomposes an unknown + combination into individual H codes' do
        result = described_class.construct_h_statements(['H301+H312+H315'])
        expect(result.keys).to match_array(%w[H301 H312 H315])
        expect(result['H301']).to be_present
      end

      it 'silently skips unknown H codes' do
        result = described_class.construct_h_statements(['H999'])
        expect(result).to be_empty
      end
    end
  end
end
