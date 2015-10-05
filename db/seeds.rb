# create initial test users
u = User.create!(email: 'test@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept', first_name: 'Test', last_name: 'Ninja')
hattori = User.create!(email: 'hattori@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept', first_name: 'Hattori', last_name: 'Hanzo')
momochi = User.create!(email: 'momochi@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept', first_name: 'Momochi', last_name: 'Sandayu')

collection_1 = Collection.create!(label: 'Collection #1', user_id: u.id)
subcollection_1 = Collection.create!(label: 'Subcollection of #1', user_id: u.id, parent: collection_1)
grand_child = Collection.create!(label: 'Grandchild', user_id: u.id, parent: subcollection_1)
collection_2 = Collection.create!(label: 'Collection #2', user_id: u.id)
collection_3 = Collection.create!(label: 'Collection #3', user_id: u.id)
collection_4 = Collection.create!(label: 'Collection #4', user_id: u.id)

# create some shared collections
# shared_collection_1 = Collection.create!(is_shared: true, label: 'My project with Hattori', user_id: hattori.id, shared_by_id: u.id)
# shared_collection_2 = Collection.create!(is_shared: true, label: 'My project with Momochi', user_id: momochi.id, shared_by_id: u.id)

molfiles = []
molfiles << <<-MOLFILE
C6H14 Pentane, 2-methyl- 107835
##CCCBDB 8251515:55
Geometry Optimized at HF/STO-3G
 20 19  0  0  0  0  0  0  0  0    V2000
    2.8532   -0.2145    0.1475 C  0000000000000000000
    3.6724    0.4012   -0.2119 H  0000000000000000000
    2.9078   -0.2535    1.2315 H  0000000000000000000
    2.9915   -1.2214   -0.2350 H  0000000000000000000
   -1.4584    1.3854    0.1985 C  0000000000000000000
   -0.7510    2.1407   -0.1267 H  0000000000000000000
   -2.4421    1.6695   -0.1629 H  0000000000000000000
   -1.4834    1.3857    1.2842 H  0000000000000000000
    1.4994    0.3634   -0.3103 C  0000000000000000000
    1.4076    1.3822    0.0583 H  0000000000000000000
    1.4789    0.4107   -1.3976 H  0000000000000000000
    0.3080   -0.4864    0.1870 C  0000000000000000000
    0.2965   -0.4882    1.2754 H  0000000000000000000
   -1.0735   -0.0122   -0.3383 C  0000000000000000000
   -1.0198    0.0461   -1.4261 H  0000000000000000000
   -2.1644   -1.0449    0.0291 C  0000000000000000000
   -1.9239   -2.0203   -0.3830 H  0000000000000000000
   -2.2520   -1.1436    1.1070 H  0000000000000000000
   -3.1293   -0.7384   -0.3633 H  0000000000000000000
    0.4612   -1.5158   -0.1312 H  0000000000000000000
  1  2  1  0     0  0
  1  3  1  0     0  0
  1  4  1  0     0  0
  1  9  1  0     0  0
  5  6  1  0     0  0
  5  7  1  0     0  0
  5  8  1  0     0  0
  5 14  1  0     0  0
  9 10  1  0     0  0
  9 11  1  0     0  0
  9 12  1  0     0  0
 12 13  1  0     0  0
 12 14  1  0     0  0
 12 20  1  0     0  0
 14 15  1  0     0  0
 14 16  1  0     0  0
 16 17  1  0     0  0
 16 18  1  0     0  0
 16 19  1  0     0  0


MOLFILE

molfiles << <<-MOLFILE
H2O Water 7732185
##CCCBDB 8251509:58
Geometry Optimized at HF/STO-3G
  3  2  0  0  0  0  0  0  0  0    V2000
    0.0000    0.0000    0.1271 O  0000000000000000000
    0.0000    0.7580   -0.5085 H  0000000000000000000
    0.0000   -0.7580   -0.5085 H  0000000000000000000
  1  2  1  0     0  0
  1  3  1  0     0  0
M  END
MOLFILE

molfiles << <<-MOLFILE
C6H4 (E)-Hexa-1,5-diyne-3-ene 16668681
##CCCBDB 8251510:05
Geometry Optimized at HF/STO-3G
 10  9  0  0  0  0  0  0  0  0    V2000
   -0.3290    0.5751    0.0000 C  0000000000000000000
    0.3290   -0.5751    0.0000 C  0000000000000000000
    0.3290    1.8708    0.0000 C  0000000000000000000
   -0.3290   -1.8708    0.0000 C  0000000000000000000
   -1.4147    0.5870    0.0000 H  0000000000000000000
    1.4147   -0.5870    0.0000 H  0000000000000000000
    0.8570    2.9180    0.0000 C  0000000000000000000
   -0.8570   -2.9180    0.0000 C  0000000000000000000
    1.3357    3.8690    0.0000 H  0000000000000000000
   -1.3357   -3.8690    0.0000 H  0000000000000000000
  1  2  2  0     0  0
  1  3  1  0     0  0
  1  5  1  0     0  0
  2  4  1  0     0  0
  2  6  1  0     0  0
  3  7  3  0     0  0
  4  8  3  0     0  0
  7  9  1  0     0  0
  8 10  1  0     0  0
MOLFILE

# create some samples
sample_1 = Sample.create!(name: 'Sample 1', molfile: molfiles[0])
sample_2 = Sample.create!(name: 'Sample 2', molfile: molfiles[1])
sample_3 = Sample.create!(name: 'Sample 3', molfile: molfiles[2])
sample_4 = Sample.create!(name: 'Sample 4', molfile: molfiles[0])
sample_5 = Sample.create!(name: 'Sample 5', molfile: molfiles[1])
sample_6 = Sample.create!(name: 'Sample 6', molfile: molfiles[2])
sample_7 = Sample.create!(name: 'Sample 7', molfile: molfiles[0])
sample_8 = Sample.create!(name: 'Sample 8', molfile: molfiles[1])


# associate samples with collections
CollectionsSample.create!(sample: sample_1, collection: collection_1)
CollectionsSample.create!(sample: sample_2, collection: collection_1)
CollectionsSample.create!(sample: sample_3, collection: collection_1)
CollectionsSample.create!(sample: sample_4, collection: collection_1)
CollectionsSample.create!(sample: sample_2, collection: subcollection_1)
CollectionsSample.create!(sample: sample_5, collection: subcollection_1)
CollectionsSample.create!(sample: sample_6, collection: subcollection_1)
CollectionsSample.create!(sample: sample_1, collection: grand_child)
CollectionsSample.create!(sample: sample_7, collection: grand_child)
CollectionsSample.create!(sample: sample_8, collection: grand_child)

# CollectionsSample.create!(sample: sample_1, collection: shared_collection_1)
# CollectionsSample.create!(sample: sample_2, collection: shared_collection_2)
# CollectionsSample.create!(sample: sample_3, collection: shared_collection_2)

# --- Reactions ---

# create some reactions
reaction_1 = Reaction.create(name: 'Reaction 1')
reaction_2 = Reaction.create(name: 'Reaction 2')
reaction_3 = Reaction.create(name: 'Reaction 3')
reaction_4 = Reaction.create(name: 'Reaction 4')
reaction_5 = Reaction.create(name: 'Reaction 5')
reaction_6 = Reaction.create(name: 'Reaction 6')

# associate samples with reactions
ReactionsStartingMaterialSample.create!(reaction: reaction_1, sample: sample_1, reference: true, equivalent: 1)
ReactionsReactantSample.create!(reaction: reaction_1, sample: sample_2, equivalent: 2)
ReactionsProductSample.create!(reaction: reaction_1, sample: sample_3, equivalent: 1)

ReactionsStartingMaterialSample.create!(reaction: reaction_2, sample: sample_3, equivalent: 1)
ReactionsReactantSample.create!(reaction: reaction_2, sample: sample_2, equivalent: 2)
ReactionsProductSample.create!(reaction: reaction_2, sample: sample_1, equivalent: 3)

# associate reactions with collections
CollectionsReaction.create!(reaction: reaction_1, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_2, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_3, collection: collection_1)
CollectionsReaction.create!(reaction: reaction_4, collection: grand_child)
CollectionsReaction.create!(reaction: reaction_5, collection: subcollection_1)
CollectionsReaction.create!(reaction: reaction_6, collection: subcollection_1)

# --- Screens ---

#create screens
screen_1 = Screen.create!(name: "Screen 1", result: "result", collaborator: "collabs", conditions: "conditions", requirements: "requirements", description: "lorem ipsum")
screen_2 = Screen.create!(name: "Screen 2", result: "", collaborator: "", conditions: "", requirements: "", description: "")

# associate screens with collections
CollectionsScreen.create!(screen: screen_1, collection: collection_1)
CollectionsScreen.create!(screen: screen_2, collection: collection_1)
CollectionsScreen.create!(screen: screen_1, collection: grand_child)
CollectionsScreen.create!(screen: screen_1, collection: subcollection_1)
CollectionsScreen.create!(screen: screen_1, collection: subcollection_1)

# --- Wellplates ---

# create some wellplates
wellplate_1 = Wellplate.create!(screen: screen_1, name: 'Wellplate 1', size: 96, description: "lorem ipsum")
wellplate_2 = Wellplate.create!(screen: screen_1, name: 'Wellplate 2', size: 96, description: "")
wellplate_3 = Wellplate.create!(screen: screen_2, name: 'Wellplate 3', size: 96, description: "")
wellplate_4 = Wellplate.create!(name: 'Wellplate 4', size: 96, description: "")

well_1 = Well.create!(sample: sample_1, wellplate: wellplate_1)
well_2 = Well.create(sample: sample_1, wellplate: wellplate_1)
well_3 = Well.create(sample: sample_2, wellplate: wellplate_1)
well_4 = Well.create(sample: sample_3, wellplate: wellplate_1)
well_5 = Well.create(sample: sample_4, wellplate: wellplate_1)
well_6 = Well.create(sample: sample_5, wellplate: wellplate_1)

# associate wellplates with collections
CollectionsWellplate.create!(wellplate: wellplate_1, collection: collection_1)
CollectionsWellplate.create!(wellplate: wellplate_2, collection: collection_1)
CollectionsWellplate.create!(wellplate: wellplate_3, collection: collection_1)
CollectionsWellplate.create!(wellplate: wellplate_4, collection: collection_1)
CollectionsWellplate.create!(wellplate: wellplate_1, collection: grand_child)
CollectionsWellplate.create!(wellplate: wellplate_1, collection: subcollection_1)
CollectionsWellplate.create!(wellplate: wellplate_1, collection: subcollection_1)
