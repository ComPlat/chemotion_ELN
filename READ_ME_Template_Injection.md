### 1- Download Ket2.20 from github
```` bash
https://github.com/epam/ketcher/releases/download/v2.20.0/ketcher-standalone-2.20.0.zip
````
- unzip under public/default_ketcher/ket2

### 2- Injection file
- Make sure you have a inject file @ ````public/temaples.injection.js```` file place in root of ket2

### 3- Steps for main javascript file

- open file /static/js/main.6b3484ae.js
- unminify the file at line # L123354, replace the manual data string with:

```` bash
B = new N.oJU(V).deserialize(window.chemotion.payload) 
````

- compress the file back and it should be good to go.
