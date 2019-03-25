module Export
  class ExportCollectionsUdmBuilder

    def initialize(data)
      @builder = Nokogiri::XML::Builder.new do |xml|
        xml.UDM(DATABASE: '?', SEQUENCE: '?', TIMESTAMP: '?') {
          xml.UDM_VERSION_PA(:MAJOR => 4, :MINOR => 0, :REVISION => 0, :BUILD => 1, :VERSIONTEXT => '4.0.0.1')
          xml.CITATIONS {
            data.fetch('Literature', {}).each do |uuid, field|
              xml.CITATION(:id => uuid) {
                xml.TYPE
                xml.AUTHOR
                xml.TITLE field.fetch('title')
                xml.JOURNAL
                xml.YEAR
                xml.VOL
                xml.PAGE
                xml.KEYWORD
                xml.DOI field.fetch('doi')
                xml.PATENT_COUNTRY
                xml.PATENT_NUMBER
                xml.PATENT_ASSIGNEE
                xml.PATENT_KIND_CODE
                xml.PATENT_PUB_DATE
                xml.ABSTRACT
                xml.COMMENTS
              }
            end
          }
          xml.MOLECULES {
            data.fetch('Molecule', {}).each do |uuid, field|
              xml.MOLECULE(:id => uuid) {
                # The structure of the molecule represented as an MDL Molfile.
                xml.MOLSTRUCTURE field.fetch('molfile')
                # The structure of the molecule represented as an MDL Molfile.
                xml.MW field.fetch('molfile')
                # The value of clogP for the molecule.
                xml.CLP
                # The PSA (Polar Surface Area) of the molecule.
                xml.PSA
                # The heavy actom count.
                xml.HEV
                # The number of rotatable bonds in the molecule.
                xml.RTB
                # The number of hydrogen bond donors in the molecule.
                xml.HBD
                # The number of hydrogen bond acceptors in the molecule.
                xml.HBA
                # The number of carbon atoms in the molecule.
                xml.NOC
                # The number of rings in the molecule.
                xml.RNG
                # Customer-specific registry number.
                xml.CC_ID
                # The molecular formula.
                xml.MF
                # The CAS (Chemical Abstracts Service) number assigned to the molecule.
                xml.CAS
                # The preferred name of the molecule, often the most common one.
                xml.NAME = field.fetch('iupac_name')
                # Synonyms (alternative names) of the molecule.
                xml.SYNONYMS field.fetch('names').join(' ')
                xml.COMMENTS
                xml.IDENTIFIERS
                xml.LINKS
                xml.CALCULATED
                xml.CIT_ID
              }
            end
          }
          xml.REACTIONS {
            data.fetch('Reaction', {}).each do |uuid, field|
              xml.REACTION(:id => uuid) {
                # The diagram of the reaction represented as an MDL RXN file.
                xml.RXNSTRUCTURE
                # The molecular weight of the largest product of the reaction.
                xml.RANK
                xml.MW_LARGEST_PRODUCT
                xml.SORT_CREATION_DATE
                xml.SORT_REACTION_SCALE
                xml.SORT_REACTION_MOLARITY
                xml.SORT_TOTAL_VOLUME
                # Identifier of a metabolic product.
                xml.METABOLITE_ID
                # Identifier of a reactant in the reaction.
                xml.REACTANT_ID
                # Identifier of a product in the reaction.
                xml.PRODUCT_ID
                # List of variations of a given reaction performed in different conditions.
                xml.VARIATIONS {
                  [].each do |variation|
                    # The date the experiment (reaction) was originally registered.
                    xml.CREATION_DATE
                    xml.EXPERIMENT_ID
                    xml.EXPERIMENT_TYPE
                    # The date the experiment (reaction) record was modified last time.
                    xml.MODIFICATION_DATE
                    # The name of the project given experiment (reaction) was performed for.
                    xml.PROJECT_NAME
                    xml.QUALIFICATION
                    xml.SOURCE
                    xml.DESTINATION
                    xml.RANK
                    xml.CONCLUSION_PHRASE
                    xml.CREATED_AT_SITE
                    xml.DUPLICATE_EXP_REF
                    xml.PREPARATIVE
                    xml.ELN_CITATION
                    xml.REACTION_SCALE
                    xml.NEXTMOVE_REACTION_TYPE
                    xml.RXNO_REACTION_TYPE
                    xml.ANALYTICAL_DATA_EXISTS
                    xml.TECHNOLOGY
                    # The scientist who performed the reaction.
                    xml.SCIENTIST
                    # The scientist responsible for the design and the performance
                    # of the reaction (often a lab head).
                    xml.RESP_SCIENTIST
                    xml.KEYWORDS
                    xml.REACTANTS {
                      build_reactants(xml, [])
                    }
                    xml.PRODUCTS {
                      build_products(xml, [])
                    }
                    xml.REAGENTS {
                      build_reagents(xml, [])
                    }
                    xml.CATALYSTS {
                      build_catalysts(xml, [])
                    }
                    xml.SOLVENTS {
                      build_solvents(xml, [])
                    }
                    xml.CONDITIONS {
                      build_conditions(xml, [])
                    }
                    xml.METABOLITES {
                      build_metabolite(xml, [])
                    }
                    # List of reaction variation stages. Stages represent intermediate steps
                    # within a reaction with no isolated products.
                    xml.STAGES {
                      [].each do |stage|
                        xml.REACTANTS {
                          build_reactants(xml, [])
                        }
                        xml.PRODUCTS {
                          build_products(xml, [])
                        }
                        xml.REAGENTS {
                          build_reagents(xml, [])
                        }
                        xml.CATALYSTS {
                          build_catalysts(xml, [])
                        }
                        xml.SOLVENTS {
                          build_solvents(xml, [])
                        }
                        xml.CONDITIONS {
                          build_conditions(xml, [])
                        }
                        xml.METABOLITES {
                          build_metabolite(xml, [])
                        }
                      end
                    }
                    xml.COMMENTS
                    xml.IDENTIFIERS
                    xml.LINKS
                    xml.GROUPS
                    xml.ANIMALS
                    xml.CIT_ID
                  end
                }
              }
            end
          }
        }
      end
    end

    def to_xml
      @builder.to_xml
    end

    private

    def build_reactants(xml, reactants = [])
      reactants.each do |reactant|
        xml.NAME
        xml.AMOUNT
        xml.FORM
        xml.COLOR
        xml.VOLUME
        xml.EQUIVALENTS
        xml.SAMPLE_ID
        xml.SAMPLE_REF
        xml.COMPOUND_NAME
        xml.COMMENTS
      end
    end

    def build_products(xml, products = [])
      products.each do |product|
        xml.NAME
        xml.AMOUNT
        xml.FORM
        xml.COLOR
        xml.YIELD
        xml.CONVERSION
        xml.PURITY
        xml.ENANTIOMERIC_PURITY
        xml.EQUIVALENTS
        xml.SAMPLE_ID
        xml.SAMPLE_REF
        xml.COMPOUND_NAME
        xml.COMMENTS
      end
    end

    def build_reagents(xml, reagents = [])
      reagents.each do |reagent|
        xml.NAME
        xml.AMOUNT
        xml.FORM
        xml.COLOR
        xml.VOLUME
        xml.EQUIVALENTS
        xml.SAMPLE_ID
        xml.SAMPLE_REF
        xml.COMPOUND_NAME
        xml.COMMENTS
      end
    end

    def build_catalysts(xml, catalysts = [])
      catalysts.each do |catalyst|
        xml.NAME
        xml.AMOUNT
        xml.FORM
        xml.COLOR
        xml.VOLUME
        xml.SAMPLE_ID
        xml.SAMPLE_REF
        xml.COMPOUND_NAME
        xml.COMMENTS
      end
    end

    def build_solvents(xml, solvents = [])
      solvents.each do |solvent|
        xml.NAME
        xml.AMOUNT
        xml.FORM
        xml.COLOR
        xml.VOLUME
        xml.SAMPLE_ID
        xml.SAMPLE_REF
        xml.COMPOUND_NAME
        xml.COMMENTS
      end
    end

    def build_conditions(xml, conditions = [])
      conditions.each do |condition|
        xml.ATMOSPHERE
        xml.PH
        xml.PREPARATION
        xml.PRESSURE
        xml.REACTION_MOLARITY
        xml.REFLUX
        xml.TEMPERATURE
        xml.TIME
        xml.TOTAL_VOLUME
      end
    end

    def build_metabolite(xml, metabolites = [])
      metabolites.each do |metabolite|
        xml.AMOUNT
        xml.EQUIVALENTS
        xml.COMMENTS
      end
    end

  end
end
