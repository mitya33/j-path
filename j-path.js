'use strict';

/* ---
| J-PATH - main function for searching object (or JSON string) via XPath. Args:
|	@obj (obj; str)	- object or JSON string or data to search within
|	@path (str)		- the XPath
--- */

function jpath(obj, path) {
	
	//prep
	if (!jpath.cache) jpath.cache = {};
	if (obj.toString() != '[object Object]' && !(obj instanceof Array) && typeof obj != 'string')
		return alert('jpath - @obj not passed or is not an object or a string');
	if (typeof path != 'string')
		return alert('jpath = @path is not a string');
	if (typeof obj == 'string')
		try { obj = JSON.parse(obj); } catch(e) {
			return console.error('jpath - @obj string is not valid JSON');
		}
	
	//unless path is lazy (starts with //) prefix with root/ to reflect element that derived XML gets wrapped in
	path = path.replace(/^\/(?!=\/)/, '');
	path = ('/root/'+path).replace(/\/{3}/g, '//');

	//convert to XML (once per object - cache thereafter)
	let json = JSON.stringify(obj),
		map = !jpath.cache[json] ? {} : jpath.cache[json].map,
		xml = !jpath.cache[json] ? jpath.obj_to_xml(obj, null, 1, map) : jpath.cache[json].xml,
		parser = new DOMParser(),
		matches = [];
	xml = typeof xml == 'string' ? parser.parseFromString(xml, 'text/xml') : xml;
	jpath.cache[json] = {xml: xml, map: map};
	
	//look up node(s) defined by @path and log in @matches
	let xpRes = xml.evaluate(path, xml, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE);
	for (let i=0; i<xpRes.snapshotLength; i++)
		matches.push(map[xpRes.snapshotItem(i).getAttribute('link')]);
	console.log('MATCHES', matches);
	
	
	return matches;
	
}

/* ---
| OBJECT TO XML - helper func to convert object to XML. Also callable in isolation. Args:
|	@obj (obj)			- the object to convert
|	@depth (int)		- for recursion; the next level depth
|	@addLinks (bool)	- denotes j-path (non-isolated) use; denotes should add markers linking XML nodes
|						  to original object/array in source object
--- */

jpath.obj_to_xml = function(obj, depth=null, addLinks, map) {

	//...prep
	let xml = '',
		root_name = 'root';
	depth = depth || 0;
	if (!depth) xml = '<'+root_name+'>';

	//...recurse over passed object (for-in) or array (for) - also add in link-back references (to sub-arrays and
	//-objects) to corresponding points in the source object.
	for (let prop in obj) {
		if (!obj.hasOwnProperty(prop)) continue;
		let rand = Math.round(Math.random() * 10000000);
		if (addLinks) map[rand.toString()] = obj[prop];
		xml += build_node(prop, obj[prop], addLinks ? rand : null) || '';
	}
	
	//...build individual XML node. Tags named after object key or, if array item, 'item'. Coerce tag name to be valid.
	function build_node(tag_name, val, link) {
		tag_name = tag_name.toString().replace(/[^\w\-_]/g, '-').replace(/-{2,}/g, '-').replace(/^[^a-z]/, () => 'item');
		let node = '<'+tag_name+(link ? ' link="'+link+'"' : '')+'>';
		if (val) node += !['Object', 'Array'].includes(val.constructor.name) ? val : jpath.obj_to_xml(val, depth + 1, addLinks, map);
		return node + '</'+tag_name+'>';
	}

	//...return XML string, cleaning it up a bit first
	if (!depth) xml += '</'+root_name+'>';
	return xml
		.replace(/&(?= )/g, '&amp;')
		.replace(/^\n(?=<)/, '')
		.replace(/\n{2,}/g, '\n')
		.replace(/^\t+\n/mg, '');
}