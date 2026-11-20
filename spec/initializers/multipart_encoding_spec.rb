# frozen_string_literal: true

require 'rack'

# config/initializers/zz_multipart_encoding.rb normalises multipart part encodings to UTF-8
# so request strings are handled consistently regardless of a part's declared charset.
# rubocop:disable RSpec/DescribeClass
RSpec.describe 'multipart part encoding normalisation' do
  def field(part_headers, value, name: 'field')
    boundary = 'BOUNDARY'
    body = +''
    body << "--#{boundary}\r\nContent-Disposition: form-data; name=\"#{name}\"\r\n"
    part_headers.each { |h| body << "#{h}\r\n" }
    body << "\r\n#{value}\r\n--#{boundary}--\r\n"
    body = body.b
    env = Rack::MockRequest.env_for('/', 'REQUEST_METHOD' => 'POST',
                                         'CONTENT_TYPE' => "multipart/form-data; boundary=#{boundary}",
                                         'CONTENT_LENGTH' => body.bytesize.to_s, input: body)
    Rack::Request.new(env).POST[name]
  end

  it 'is prepended onto Rack::Multipart::Parser' do
    expect(Rack::Multipart::Parser.ancestors.map(&:to_s)).to include('MultipartUtf8Encoding')
  end

  it 'transcodes an ISO-8859-1 field to UTF-8' do
    value = field(['Content-Type: text/plain; charset=ISO-8859-1'], "stra\xDFe")
    expect(value.encoding).to eq(Encoding::UTF_8)
    expect(value).to be_valid_encoding
    expect(value).to eq('straße')
  end

  it 'transcodes a Windows-1252 field to UTF-8' do
    value = field(['Content-Type: text/plain; charset=Windows-1252'], "stra\xDFe")
    expect(value.encoding).to eq(Encoding::UTF_8)
  end

  it 'leaves case folding consistent after normalisation' do
    value = field(['Content-Type: text/plain; charset=ISO-8859-1'], "stra\xDFe")
    up = value.upcase
    expect(up.encoding).to eq(Encoding::UTF_8)
    expect(up).to eq('STRASSE')
    expect(up).to be_valid_encoding
  end

  it 'normalises an RFC 5987 filename*= value to UTF-8' do
    boundary = 'B'
    body = "--#{boundary}\r\nContent-Disposition: form-data; name=\"file\"; " \
           "filename*=ISO-8859-1''foo.%DF%BF\r\nContent-Type: application/octet-stream\r\n\r\nd\r\n--#{boundary}--\r\n".b
    env = Rack::MockRequest.env_for('/', 'REQUEST_METHOD' => 'POST',
                                         'CONTENT_TYPE' => "multipart/form-data; boundary=#{boundary}",
                                         'CONTENT_LENGTH' => body.bytesize.to_s, input: body)
    filename = Rack::Request.new(env).POST['file'][:filename]
    expect(filename.encoding).to eq(Encoding::UTF_8)
    expect { filename.upcase }.not_to raise_error
  end

  it 'leaves a plain UTF-8 field untouched' do
    value = field([], 'straße')
    expect(value.encoding).to eq(Encoding::UTF_8)
    expect(value).to eq('straße')
  end
end
# rubocop:enable RSpec/DescribeClass
