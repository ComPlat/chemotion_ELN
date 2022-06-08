# == Schema Information
#
# Table name: inventories
#
#  id                   :bigint           not null, primary key
#  inventory_parameters :jsonb
#  inventoriable_id     :integer
#  inventoriable_type   :string
#
# Indexes
#
#  index_inventories_on_inventoriable_type_and_inventoriable_id  (inventoriable_type,inventoriable_id)
#

require 'uri'
require 'open-uri'
require 'net/http'
class Inventory < ApplicationRecord
    include HTTParty

    belongs_to :inventoriable, :polymorphic => true
    belongs_to :user, optional: true

    validates :inventoriable, presence: true


    def attach_ssd_file

        file = URI.open('https://www.sigmaaldrich.com/DE/de/sds/aldrich/769126')

        invent = Inventory.new
        # invent.inventory_parameters['sds_file']= .attach(io: file, filename: 'methane-sds.pdf')

        # url = 'https://www.sigmaaldrich.com/DE/de/sds/aldrich/769126'

        # filename = File.basename(URI.parse(url).path)
        # file = URI.open('https://meme.eq8.eu/noidea.jpg')

        # invent.inventory_parameters['internal_label'].attach(io: file, filename: 'methane-sds.pdf', content_type: 'application/pdf')

        # puts(invent.inventory_parameters['internal_label'])
        file.read
    end

    def file

        # file = open('http://www.sigmaaldrich.com/DE/de/sds/aldrich/769126')
        # file = open(URI.parse('http://www.google.com/intl/en_ALL/images/logo2.gif'))
        # file = open(URI.parse('https://www.sigmaaldrich.com/DE/en/sds/aldrich/488348'))
        # file = open(URI.parse('https://www.sigmaaldrich.com'))
        # file = open(URI.parse('http://www.africau.edu/images/default/sample.pdf'))
        # file = open(URI.parse('https://www.clickdimensions.com/links/TestPDFfile.pdf'))
        # file = open(URI.parse('https://drive.google.com/file/d/0B1HXnM1lBuoqMzVhZjcwNTAtZWI5OS00ZDg3LWEyMzktNzZmYWY2Y2NhNWQx/view?hl=en&resourcekey=0-5DqnTtXPFvySMiWstuAYdA'))
        # file = open(URI.parse('https://www.fishersci.de/store/msds?partNumber=11472854&productDescription=500ML+Methanol%2C+Certified+AR+for+analysis&countryCode=DE&language=de'))
        # file = open(URI.parse('https://www.google.com/search?q=require+%27net%2Fhttps%27&oq=require+%27net%2Fhttps%27&aqs=chrome..69i57j0i22i30l3j0i390l2.2336j0j7&sourceid=chrome&ie=UTF-8'))
        # file = open(URI.parse('https://www.facebook.com/adam.basha1992/'))
        # file = open(URI.parse('https://www.google.com'))
        # file = open(URI.parse('https://www.google.com/intl/en_ALL/images/logo2.gif'))
        # file = open(URI.parse('https://www.strem.com/uploads/sds/sd13-1500_DE.pdf'))
        # file = open(URI.parse('https://assets.thermofisher.com/DirectWebViewer/private/document.aspx?prd=ALFAAA16163~~PDF~~MTR~~CLP1~~DE~~2021-12-30%2023:36:09~~Formaldehyde%20%2037%%20w/w%20in%20aqueous%20solution~~'))


        # invent = Inventory.new
        # invent.inventory_parameters['sds_file']= .attach(io: file, filename: 'methane-sds.pdf')

        # url = 'https://www.sigmaaldrich.com/DE/de/sds/aldrich/769126'

        # filename = File.basename(URI.parse(url).path)
        # file = URI.open('https://meme.eq8.eu/noidea.jpg')

        # invent.inventory_parameters['internal_label'].attach(io: file, filename: 'methane-sds.pdf', content_type: 'application/pdf')

        # puts(invent.inventory_parameters['internal_label'])
        # u = URI.parse('https://www.sigmaaldrich.com/DE/en/sds/aldrich/488348')
        # status = Net::HTTP.start(u.host).head(u.request_uri).code
        # status

        # https://assets.thermofisher.com/directwebviewer/private/results.aspx?page=NewSearch&LANGUAGE=d__DE&SUBFORMAT=d__CLP1&SKU=ACR38503&PLANT=d__ACR

        #https://www.thermofisher.com/order/catalog/product/134340010
        #familyId, https://www.thermofisher.com/search/api/documents/family/de/de/3523460?docTypes=Protocols,Probes%20Handbook,LULL,Vectors,COA,MSDS,Manuals,Brochures,CellLines,Posters,Unitrays,MediaFormulation,TechBulletins,SupportFiles
        #documentId # https://www.thermofisher.com/search/api/documents/sds/3d8e9c519c4b10334b012bdee399f8a991e3e5d2.json/
        #choose language(deutsch) >> get document location

        # CID\": 399096

        # https://#{PUBCHEM_HOST}/rest/pug_view/data/compound/#{cid}/XML?heading=CAS

        # req do |file|
        #     File.open(params[:file][:tempfile], 'r') do |data|
        #       file.write(data.read)
        #     end
        # end
        # req do |file|
        #     # File.open(params[:file][:tempfile], 'r') do |data|
        #     #   file.write(data.read)
        #     # end
        #     response.read_body do |chunk|
        #         puts chunk
        #     end
        # end
        # if req.code == 200
        # file

        # data = Nokogiri::XML(req.body).to_json
        # data = Nokogiri::HTML.parse(req.body).css("class")
        # data = Nokogiri::HTML.parse(req.body).xpath("//*[contains(concat(' ', normalize-space(@class), ' '), ' #{class} ')]")

        # data = Nokogiri::XML(req.body).at_css("class")
        # data = Nokogiri::HTML.parse(req.body).xpath("//*[@class=\"#{"search-result-number"}\"]")

        # req.body
        # Nokogiri::XML(req.body)

        # options = { :timeout => 10,  :headers => {'Content-Type' => 'application/pdf'} }
        # req = HTTParty.get("https://www.alfa.com/en/search/?q=diphenyl+benzene", options)
        # req.headers['Content-Type']
        # product_number = Nokogiri::HTML.parse(req.body).xpath("//*[@class=\"#{"search-result-number"}\"]").at_css("span").children.text

        # req_ssd = HTTParty.get("https://www.alfa.com/en/msds/?language=DE&subformat=CLP1&sku=#{product_number}", options)
        # req_ssd.headers['Content-Type']

        # env['api.format'] = :binary
        # header['Content-Disposition'] = req_ssd.headers["Content-Disposition"]
        # req_ssd.size

        options = { :headers => {'Content-Type' => 'application/pdf'} }
        req = HTTParty.get("https://www.strem.com/catalog/index.php?x=0&y=0&keyword=1295-35-8&page_function=keyword_search", options)
        req.headers['Content-Type']
        strem_link = Nokogiri::HTML.parse(req.body).xpath("//*[@class=\"#{"printer_link"}\"]").css("a")[1].attributes["href"].value
        req_ssd = HTTParty.get("https://www.strem.com#{strem_link}", options)
        req_ssd.headers['Content-Type']
        #.at_css("a").attributes["href"].value
        # xpath("//*[@class=\"#{"printer_link"}\"]").at_css("a").children.text === "Download Safety Data Sheet"
    end
end
  
