## 💡 Ketcher2 Surface Chemistry (K2SC) feature documentation 💡

This document helps developers understand how the K2SC feature is implemented using the Ket2 Editor API provided within the Ket2 instance. Two built-in Ketcher2 features are used to form a polymer template: Atom with Alias and Image.

### ⭐ Basic idea:  
All K2SC atoms should have an alias, which is composed of three parts. The third part of the alias represents the index of the imagesList. When an atom is moved or deleted, the third part of the alias can be used to identify which image, corresponding to that index in the imagesList, should be moved.

#### &#9733; Molfile with polymers   
First, the list of polymers is extracted (set aside) and removed from the original molfile. The molfile is then converted to the Ket2 format using the Ketcher-editor API. At this point, we have:  
1️⃣ A list of polymers, such as "11 12 13", where the numbers represent the atom count in the molfile (atoms without an 's' are beads, and atoms with an 's' are surfaces).  
2️⃣ The molfile in Ket2 format.  
Next, considering the list of polymers, images are pushed into nodes, and aliases are built for atoms labeled "A". For each new template added, a counter, named image_used_counter, is maintained to relate images to atoms.

### ⭐ Ket2 Events
Implementation is built on event-listeners which are triggered inside the ket2 canvas. Here is a list of events used in implemetation:   
✔️ Load canvas -> open, saveMolecule  
✔️ Add Atom -> on new atom, mol, paste, delete  
✔️ Move Atom -> on atom move  
✔️ Delete Atom -> on atom delete, on molecule delete  
✔️ Delete Image -> on image delete  
✔️ Upsert image(NIU) -> on image add  
✔️ Move image(NIU) -> on image move  
✔️ Update(NIU) -> any action on canvas  

### ⭐ Few frequently used functions from Editors API
Here are some functions available in Editor API which are frequently used for K2SC:  
✔️ Editor: editor._structureDef.editor  
✔️ Indigo service inside Editor: editor._structureDef.editor.indigo  
✔️ Set New Data: editor.structureDef.editor.setMolecule  
✔️ To get Ket2 Format: editor.structureDef.editor.getKet  
✔️ Convert format: editor._structureDef.editor.indigo.convert  

### ⭐ Alias Patterns:
✔️ Two parts: t_01 => p1: t(prefix), p2: template id  
✔️ Three Parts: t_01_01 => ..., p3: Image index  
    &#9733; examples: **t_01, t_02, t_02_0, t_01_1**   
    **&#9733; &#9733; :** On every new template added **image_used_counter** is incremented by one

### ⭐ Understand Main events and Execution

### &#9733; Event => Add atom:
When a new temaplte is added to the canvas. A link is created between an image and atom(with alias).
These main components of a template:  
✔️ Atom with label(A) -- all k2SC atoms should have label:A  
✔️ Alias(t_templateid) -- All atoms should have an alias  
✔️ Image -- alias third part is an index of image in the nodes [patterns](#Alias-Patterns) data.  

### &#9733; Logic flow (in-order):  
✔️ Add atom should be with lable A  
✔️ Added atom should have an alias: Types of alias: t_01  
✔️ Get the latest added image index  
✔️ Update the alias of atom as: t_templateid_imageindex  
✔️ MoveTemplate: which place an image on alias atom  

  Having a correct index of the image is very import to maintain a temaplte

### &#9733; Event => Move atom (in-order):
  Once an atom is added with correct alias:  
✔️ On atom move, get the alias of moved atom  
✔️ Grad the location [x,y,z] of the move atom and based on alias third part which is an index from the image list.  
✔️ Update the location of image  
✔️ MoveTemplate: which place an image on alias atom  

### &#9733; Event => Delete Atom (in-order):
  When an atom is deleted:  
✔️ grab the atom deleted with its alias  
✔️  identify the image based on third part of the alias  
✔️ remove the image index from imageList  
✔️ reset all aliases and should be consistent  
✔️ Save and Move template  

### &#9733; Event => Delete Image (in-order):
  When an image is deleted:  
✔️ Get deleted image index from _selected variable  
✔️ Find an alias which has the image index number as third part  
✔️ Delete that atom  
✔️ reset all aliases and should be consistent  
✔️  MoveTemplate: which place an image on alias atom  

### &#9733; Event => Load canvas:  
  Event called when a file is loaded or when setMolecule function is called.

### doc-flags: 
  - NIU => Not in use