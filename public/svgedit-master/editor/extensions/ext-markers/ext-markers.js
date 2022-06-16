/**
 * @file ext-markers.js
 *
 * @license Apache-2.0
 *
 * @copyright 2010 Will Schleter based on ext-arrows.js by Copyright(c) 2010 Alexis Deveria
 * @copyright 2021 OptimistikSAS
 *
 * This extension provides for the addition of markers to the either end
 * or the middle of a line, polyline, path, polygon.
 *
 * Markers are graphics
 *
 * to simplify the coding and make the implementation as robust as possible,
 * markers are not shared - every object has its own set of markers.
 * this relationship is maintained by a naming convention between the
 * ids of the markers and the ids of the object
 *
 * The following restrictions exist for simplicty of use and programming
 *    objects and their markers to have the same color
 *    marker size is fixed
 *    an application specific attribute - se_type - is added to each marker element
 *        to store the type of marker
 *
 * @todo
 *    remove some of the restrictions above
 *
*/
var t={name:"markers",async init(){const{svgCanvas:t}=this,{BatchCommand:e,RemoveElementCommand:r,InsertElementCommand:n}=t.history,{$id:a,addSVGElementsFromJson:i}=t,o=["start","mid","end"],s=["line","path","polyline","polygon"],l={nomarker:{},leftarrow:{element:"path",attr:{d:"M0,50 L100,90 L70,50 L100,10 Z"}},rightarrow:{element:"path",attr:{d:"M100,50 L0,90 L30,50 L0,10 Z"}},box:{element:"path",attr:{d:"M20,20 L20,80 L80,80 L80,20 Z"}},mcircle:{element:"circle",attr:{r:30,cx:50,cy:50}}};["leftarrow","rightarrow","box","mcircle"].forEach((t=>{l[t+"_o"]=l[t]}));const getLinked=(e,r)=>{const n=e.getAttribute(r);if(!n)return null;const a=n.match(/\(#(.*)\)/);return a&&2===a.length?t.getElement(a[1]):null},showPanel=(t,e)=>{a("marker_panel").style.display=t?"block":"none",t&&e&&o.forEach((t=>{var r;const n=getLinked(e,"marker-"+t);null!=n&&null!==(r=n.attributes)&&void 0!==r&&r.se_type?a("".concat(t,"_marker_list_opts")).setAttribute("value",n.attributes.se_type.value):a("".concat(t,"_marker_list_opts")).setAttribute("value","nomarker")}))},addMarker=(e,r)=>{const n=t.getSelectedElements();let a=t.getElement(e);if(a)return;if(""===r||"nomarker"===r)return;const o=n[0].getAttribute("stroke");if(!l[r])return void console.error("unknown marker type: ".concat(r));a=i({element:"marker",attr:{id:e,markerUnits:"strokeWidth",orient:"auto",style:"pointer-events:none",se_type:r}});const s=i(l[r]),c="_o"===r.substr(-2)?"none":o;return s.setAttribute("fill",c),s.setAttribute("stroke",o),s.setAttribute("stroke-width",10),a.append(s),a.setAttribute("viewBox","0 0 100 100"),a.setAttribute("markerWidth",5),a.setAttribute("markerHeight",5),a.setAttribute("refX",50),a.setAttribute("refY",50),t.findDefs().append(a),a},setMarker=(a,s)=>{const l=t.getSelectedElements();if(0===l.length)return;const c="marker-"+a,m=l[0],u=getLinked(m,c);u&&u.remove(),m.removeAttribute(c);let d=s;if(""===d&&(d="nomarker"),"nomarker"===d)return void t.call("changed",l);const b="mkr_"+a+"_"+m.id;addMarker(b,d),t.changeSelectedAttribute(c,"url(#"+b+")"),"line"===m.tagName&&"mid"===a&&(a=>{if("line"!==a.tagName)return a;const s=Number(a.getAttribute("x1")),l=Number(a.getAttribute("x2")),c=Number(a.getAttribute("y1")),m=Number(a.getAttribute("y2")),{id:u}=a,d=i({element:"polyline",attr:{points:s+","+c+" "+(s+l)/2+","+(c+m)/2+" "+l+","+m,stroke:a.getAttribute("stroke"),"stroke-width":a.getAttribute("stroke-width"),fill:"none",opacity:a.getAttribute("opacity")||1}});o.forEach((t=>{const e="marker-"+t;a.getAttribute(e)&&d.setAttribute(e,a.getAttribute(e))}));const b=new e;b.addSubCommand(new r(a,a.parentNode)),b.addSubCommand(new n(d)),a.insertAdjacentElement("afterend",d),a.remove(),t.clearSelection(),d.id=u,t.addToSelection([d]),t.addCommandToHistory(b)})(m),t.call("changed",l)};return{name:this.i18next.t("".concat(name,":name")),callback(){const t=document.createElement("template");let e='<div id="marker_panel">';o.forEach((t=>{e+='<se-list id="'.concat(t,'_marker_list_opts" title="tools.').concat(t,'_marker_list_opts" label="" width="22px" height="22px">'),Object.entries(l).forEach((r=>{let[n,a]=r;e+='<se-list-item id="mkr_'.concat(t,"_").concat(n,'" value="').concat(n,'" title="tools.mkr_').concat(n,'" src="').concat(n,'.svg" img-height="22px"></se-list-item>')})),e+="</se-list>"})),e+="</div>",t.innerHTML=e,a("tools_top").appendChild(t.content.cloneNode(!0)),showPanel(!1),o.forEach((t=>{a("".concat(t,"_marker_list_opts")).addEventListener("change",(e=>{setMarker(t,e.detail.value)}))}))},selectedChanged(t){0===t.elems.length&&showPanel(!1),t.elems.forEach((e=>{e&&s.includes(e.tagName)&&t.selectedElement&&!t.multiselected?showPanel(!0,e):showPanel(!1)}))},elementChanged(e){const r=e.elems[0];r&&(r.getAttribute("marker-start")||r.getAttribute("marker-mid")||r.getAttribute("marker-end"))&&((t=>{const e=t.getAttribute("stroke");o.forEach((r=>{const n=getLinked(t,"marker-"+r);if(!n)return;if(!n.attributes.se_type)return;const a=n.lastElementChild;if(!a)return;const i=a.getAttribute("fill"),o=a.getAttribute("stroke");i&&"none"!==i&&a.setAttribute("fill",e),o&&"none"!==o&&a.setAttribute("stroke",e)}))})(r),(e=>{const r=t.getSelectedElements();o.forEach((n=>{const a="marker-"+n,i=getLinked(e,a);if(!i||!i.attributes.se_type)return;const o=e.getAttribute(a);if(o){const s=e.id.length,l=o.substr(-s-1,s);if(e.id!==l){const o="mkr_"+n+"_"+e.id;addMarker(o,i.attributes.se_type.value),t.changeSelectedAttribute(a,"url(#"+o+")"),t.call("changed",r)}}}))})(r))}}}};export{t as default};
//# sourceMappingURL=ext-markers.js.map
