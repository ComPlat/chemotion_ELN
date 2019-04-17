module Export
  class ExportCollectionsUdmBuilder

    def initialize(data)
      @data = data
      @builder = Nokogiri::XML::Builder.new do |xml|
        build_xml(xml)
      end
    end

    def to_xml
      @builder.to_xml
    end

    private

    def build_xml(xml)
      xml.UDM(DATABASE: '?', SEQUENCE: 0, TIMESTAMP: DateTime.now.to_s) {
        xml.UDM_VERSION_PA(:MAJOR => 4, :MINOR => 0, :REVISION => 0, :BUILD => 1, :VERSIONTEXT => '4.0.0.1')
        xml.CITATIONS {
          @data.fetch('Literature', {}).each do |uuid, fields|
            build_citation(xml, uuid, fields)
          end
        }
        xml.MOLECULES {
          @data.fetch('Molecule', {}).each do |uuid, fields|
            build_molecule(xml, uuid, fields)
          end
        }
        xml.REACTIONS {
          @data.fetch('Reaction', {}).each do |uuid, fields|
            build_reaction(xml, uuid, fields)
          end
        }
      }
    end

    def build_citation(xml, uuid, fields)
      xml.CITATION('ID' => uuid) {
        # xml.TYPE
        # xml.AUTHOR
        xml.TITLE fields.fetch('title')
        # xml.JOURNAL
        # xml.YEAR
        # xml.VOL
        # xml.PAGE
        # xml.KEYWORD
        xml.DOI fields.fetch('doi')
        # xml.PATENT_COUNTRY
        # xml.PATENT_NUMBER
        # xml.PATENT_ASSIGNEE
        # xml.PATENT_KIND_CODE
        # xml.PATENT_PUB_DATE
        # xml.ABSTRACT
        # xml.COMMENTS
      }
    end

    def build_molecule(xml, uuid, fields)
      xml.MOLECULE('ID' => uuid) {
        # The structure of the molecule represented as an MDL Molfile.
        xml.MOLSTRUCTURE fields.fetch('molfile')
        # (Wrong description in the schema.)
        # xml.MW
        # # The value of clogP for the molecule.
        # xml.CLP
        # # The PSA (Polar Surface Area) of the molecule.
        # xml.PSA
        # # The heavy actom count.
        # xml.HEV
        # # The number of rotatable bonds in the molecule.
        # xml.RTB
        # # The number of hydrogen bond donors in the molecule.
        # xml.HBD
        # # The number of hydrogen bond acceptors in the molecule.
        # xml.HBA
        # # The number of carbon atoms in the molecule.
        # xml.NOC
        # # The number of rings in the molecule.
        # xml.RNG
        # # Customer-specific registry number.
        # xml.CC_ID
        # # The molecular formula.
        # xml.MF
        # # The CAS (Chemical Abstracts Service) number assigned to the molecule.
        # xml.CAS
        # The preferred name of the molecule, often the most common one.
        xml.NAME fields.fetch('iupac_name')
        # Synonyms (alternative names) of the molecule.
        xml.SYNONYMS fields.fetch('names').join(' ')
        # xml.COMMENTS
        # xml.IDENTIFIERS
        # xml.LINKS
        # xml.CALCULATED
        # xml.CIT_ID
      }
    end

    def build_reaction(xml, uuid, fields)
      xml.REACTION('ID' => uuid) {
        # # The diagram of the reaction represented as an MDL RXN file.
        # xml.RXNSTRUCTURE
        # # The molecular weight of the largest product of the reaction.
        # xml.RANK
        # xml.MW_LARGEST_PRODUCT
        # xml.SORT_CREATION_DATE
        # xml.SORT_REACTION_SCALE
        # xml.SORT_REACTION_MOLARITY
        # xml.SORT_TOTAL_VOLUME

        # # Identifier of a metabolic product.
        # xml.METABOLITE_ID

        # Identifier of a reactant in the reaction.
        # @data.fetch('ReactionsReactantSample', {}).each do |product_uuid, _|
        #   xml.REACTANT_ID(:id => product_uuid)
        # end

        # Identifier of a product in the reaction.
        # @data.fetch('ReactionsProductSample', {}).each do |product_uuid, _|
        #   xml.PRODUCT_ID(:id => product_uuid)
        # end

        # List of variations of a given reaction performed in different conditions.
        xml.VARIATIONS {
          # due to the different nature of the chemotion_eln and the udm data model
          # we have only one variation for each reaction
          build_variation(xml, uuid, fields)
        }
      }
    end

    def build_variation(xml, uuid, fields)
      # The date the experiment (reaction) was originally registered.
      xml.CREATION_DATE fields.fetch('created_at').strftime("%F")
      # # xml.EXPERIMENT_ID
      # xml.EXPERIMENT_TYPE
      # The date the experiment (reaction) record was modified last time.
      xml.MODIFICATION_DATE fields.fetch('updated_at').strftime("%F")
      # The name of the project given experiment (reaction) was performed for.
      # xml.PROJECT_NAME
      # xml.QUALIFICATION
      # xml.SOURCE
      # xml.DESTINATION
      # xml.RANK
      # xml.CONCLUSION_PHRASE
      # xml.CREATED_AT_SITE
      # xml.DUPLICATE_EXP_REF
      # xml.PREPARATIVE
      # xml.ELN_CITATION
      # xml.REACTION_SCALE
      # xml.NEXTMOVE_REACTION_TYPE
      # xml.RXNO_REACTION_TYPE
      # xml.ANALYTICAL_DATA_EXISTS
      # xml.TECHNOLOGY
      # # The scientist who performed the reaction.
      # xml.SCIENTIST
      # # The scientist responsible for the design and the performance
      # # of the reaction (often a lab head).
      # xml.RESP_SCIENTIST
      # xml.KEYWORDS

      @data.fetch('ReactionsReactantSample', {}).each do |_uuid, _fields|
        if _fields.fetch('reaction_id') == uuid
          sample_uuid = _fields.fetch('sample_id')
          sample_fields = @data.fetch('Sample', {}).fetch(sample_uuid)

          build_reactants(xml, sample_uuid, sample_fields)
        end
      end


      @data.fetch('ReactionsProductSample', {}).each do |_uuid, _fields|
        if _fields.fetch('reaction_id') == uuid
          sample_uuid = _fields.fetch('sample_id')
          sample_fields = @data.fetch('Sample', {}).fetch(sample_uuid)

          build_products(xml, sample_uuid, sample_fields)
        end
      end

      @data.fetch('ReactionsStartingMaterialSample', {}).each do |_uuid, _fields|
        if _fields.fetch('reaction_id') == uuid
          sample_uuid = _fields.fetch('sample_id')
          sample_fields = @data.fetch('Sample', {}).fetch(sample_uuid)

          build_reagents(xml, sample_uuid, sample_fields)
        end
      end

      @data.fetch('?CATALYSTS?', {}).each do |_uuid, _fields|
        if _fields.fetch('reaction_id') == uuid
          sample_uuid = _fields.fetch('sample_id')
          sample_fields = @data.fetch('Sample', {}).fetch(sample_uuid)

          build_catalysts(xml, sample_uuid, sample_fields)
        end
      end

      @data.fetch('ReactionsSolventSample', {}).each do |_uuid, _fields|
        if _fields.fetch('reaction_id') == uuid
          sample_uuid = _fields.fetch('sample_id')
          sample_fields = @data.fetch('Sample', {}).fetch(sample_uuid)

          build_solvents(xml, sample_uuid, sample_fields)
        end
      end

      # build_conditions(xml, uuid, fields)
      # build_metabolites(xml, uuid, fields)

      # # List of reaction variation stages. Stages represent intermediate steps
      # # within a reaction with no isolated products.
      # xml.STAGES {
      #   [].each do |stage|
      #     xml.REACTANTS {

      #     }
      #     xml.PRODUCTS {

      #     }
      #     xml.REAGENTS {

      #     }
      #     xml.CATALYSTS {

      #     }
      #     xml.SOLVENTS {

      #     }
      #     xml.CONDITIONS {

      #     }
      #     xml.METABOLITES {

      #     }
      #   end
      # }

      # xml.COMMENTS
      # xml.IDENTIFIERS
      # xml.LINKS
      # xml.GROUPS
      # xml.ANIMALS
      # xml.CIT_ID
    end

    def build_reactants(xml, uuid, fields)
      xml.REACTANTS('ID' => uuid) {
        xml.NAME fields.fetch('name')
        # xml.AMOUNT
        # xml.FORM
        # xml.COLOR
        # xml.VOLUME
        # xml.EQUIVALENTS
        # xml.SAMPLE_ID
        # xml.SAMPLE_REF
        # xml.COMPOUND_NAME
        # xml.COMMENTS
      }
    end

    def build_products(xml, uuid, fields)
      xml.PRODUCTS('ID' => uuid) {
        xml.NAME fields.fetch('name')
        # xml.AMOUNT
        # xml.FORM
        # xml.COLOR
        # xml.YIELD
        # xml.CONVERSION
        # xml.PURITY
        # xml.ENANTIOMERIC_PURITY
        # xml.EQUIVALENTS
        # xml.SAMPLE_ID
        # xml.SAMPLE_REF
        # xml.COMPOUND_NAME
        # xml.COMMENTS
      }
    end

    def build_reagents(xml, uuid, fields)
      xml.REAGENTS('ID' => uuid) {
        xml.NAME fields.fetch('name')
        # xml.AMOUNT
        # xml.FORM
        # xml.COLOR
        # xml.VOLUME
        # xml.EQUIVALENTS
        # xml.SAMPLE_ID
        # xml.SAMPLE_REF
        # xml.COMPOUND_NAME
        # xml.COMMENTS
      }
    end

    def build_catalysts(xml, uuid, fields)
      xml.CATALYSTS('ID' => uuid) {
        xml.NAME fields.fetch('name')
        # xml.AMOUNT
        # xml.FORM
        # xml.COLOR
        # xml.VOLUME
        # xml.SAMPLE_ID
        # xml.SAMPLE_REF
        # xml.COMPOUND_NAME
        # xml.COMMENTS
      }
    end

    def build_solvents(xml, uuid, fields)
      xml.SOLVENTS('ID' => uuid) {
        xml.NAME fields.fetch('name')
        # xml.AMOUNT
        # xml.FORM
        # xml.COLOR
        # xml.VOLUME
        # xml.SAMPLE_ID
        # xml.SAMPLE_REF
        # xml.COMPOUND_NAME
        # xml.COMMENTS
      }
    end

    def build_conditions(xml, uuid, fields)
      xml.CONDITIONS {
        xml.ATMOSPHERE
        xml.PH
        xml.PREPARATION
        xml.PRESSURE
        xml.REACTION_MOLARITY
        xml.REFLUX
        xml.TEMPERATURE
        xml.TIME
        xml.TOTAL_VOLUME
      }
    end

    def build_metabolites(xml, uuid, fields)
      xml.METABOLITES {
        xml.AMOUNT
        xml.EQUIVALENTS
        xml.COMMENTS
      }
    end

  end
end
