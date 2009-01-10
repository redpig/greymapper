///////////////////////////////////////////////////////////
// The only one instance for YTree
var g_YTree = null;

///////////////////////////////////////////////////////////
// Javascript Tree
YTree.prototype				= new Object();
YTree.prototype.constructor	= YTree;
YTree.superclass			= Object.prototype;

function YTree() {
	// the only one root node
	this.rootNode			= null;
	this.rootNodeID			= "r";
	// hold all node by hashmap
	this.nodes				= new Array;
	// hold the latest node id
	this.maxid				= 0;

	// assign this to the only one instance
	g_YTree = this;

	// YTree CONSTANT
	this.NODE_POS_ROOT		= 0;
	this.NODE_POS_LEFT		= 1;
	this.NODE_POS_RIGHT		= 2;

	this.NODE_SIB_PREV		= 0;
	this.NODE_SIB_NEXT		= 1;

	this.NODE_SWITCH_UP		= 0;
	this.NODE_SWITCH_DN		= 1;
}

YTree.prototype.initTree = function(text) {
	this.rootNode.removeChildren();

	this.rootNode.text	= text;
	this.maxid			= 0;
}

YTree.prototype.getYNodeTextFromXNode = function(xnode) {
	var text = xnode.getAttribute("TEXT");
	if ( text == undefined || text == null || text.length == 0 ) {
		return "untitled";
	}

	var toks = text.split(/&#x/g);
	var str = "";
	for ( var i=0; i<toks.length; i++ ) {
		tok = toks[i];
		if ( tok == undefined || tok == null || tok.length == 0 ) {
			continue;
		}

		if ( tok.length == 5 && tok.charAt(4) == ';' ) {
			str += String.fromCharCode(
					(parseInt(tok.charAt(0) + tok.charAt(1), 16)<<8) +
					(parseInt(tok.charAt(2) + tok.charAt(3), 16))
				);
		} else {
			var tmpStr = tok.replace(/&amp;/g, '&');
			tmpStr = tmpStr.replace(/&quot;/g, '"');
			tmpStr = tmpStr.replace(/&lt;/g, '<');
			tmpStr = tmpStr.replace(/&gt;/g, '>');
			str += tmpStr;
		}
	}

	return str;
}

YTree.prototype.getXNodeTextFromYNode = function(ynode) {
	string = ynode.text.replace(/\r\n/g,"\n");
	var utftext = "";

	for (var n = 0; n < string.length; n++) {
		var c = string.charCodeAt(n);

		/*
		if (c < 128) {
			utftext += String.fromCharCode(c);
		} else if ( (c > 127) && (c < 2048) ) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		} else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
		*/
		if (c < 256) {
			var aChar = String.fromCharCode(c);

			if ( aChar == '&' ) {
				utftext += '&amp;';
			} else if ( aChar == '"' ) {
				utftext += '&quot;';
			} else if ( aChar == '<' ) {
				utftext += '&lt;';
			} else if ( aChar == '>' ) {
				utftext += '&gt;';
			} else {
				utftext += aChar;
			}

		} else {
			utftext += "&#x" + c.toString(16) + ";";
		}
	}

	return utftext;
}

YTree.prototype.buildYNodes = function(xnode, ynode) {
	ynode.text = this.getYNodeTextFromXNode(xnode);

	for ( var i=0; i<xnode.childNodes.length; i++ ) {
		var tmpXNode = xnode.childNodes[i];
		if ( tmpXNode.tagName == "node" ) {
			var pos = tmpXNode.getAttribute("POSITION");
			if ( pos == "right" ) {
				pos = this.NODE_POS_RIGHT;
			} else {
				pos = this.NODE_POS_LEFT;
			}

			var folded = tmpXNode.getAttribute("FOLDED");
			if ( folded == "true" ) {
				ynode.collapsed = true;
			}

			var tmpYNode = ynode.appendChild("", pos);
			this.buildYNodes(tmpXNode, tmpYNode);

		} else if ( tmpXNode.tagName == "icon" ) {
			var att = tmpXNode.getAttribute("BUILTIN");
			if ( att == undefined || att == null ) {
				continue;
			}
			ynode.appendIcon(att);

		} else if ( tmpXNode.tagName == "font" ) {
			var bold = tmpXNode.getAttribute("BOLD");
			if ( bold == "true" ) {
				ynode.bold = true;
			}

			var italic = tmpXNode.getAttribute("ITALIC");
			if ( italic == "true" ) {
				ynode.italic = true;
			}
		}
	}
}

YTree.prototype.buildXNodes = function(ynode) {
	var strPosition = "";
	var strFolded = "";
	var strBold = "";
	var strItalic = "";

	if ( ynode.indent == 1 ) {
		strPosition = ' POSITION="' + ((ynode.pos == this.NODE_POS_LEFT)? 'left':'right') + '"';
	}

	if ( ynode.indent > 0 && ynode.collapsed ) {
		strFolded = ' FOLDED="true"';
	}

	if ( ynode.bold ) {
		strBold = ' BOLD="true"';
	}

	if ( ynode.italic ) {
		strItalic = ' ITALIC="true"';
	}

	var str = '<node' + strFolded + strPosition + ' TEXT="' + this.getXNodeTextFromYNode(ynode) + '">\n';

	if ( ynode.bold || ynode.italic ) {
		str += '<font' + strBold + strItalic + ' SIZE="12"/>\n';
	}

	for ( var i=0; i<ynode.icons.length; i++ ) {
		str += '<icon BUILTIN="' + ynode.icons[i] + '" />\n';
	}

	if ( ynode.indent == 0 ) {
		var tmpNode = null;
		for ( var i=0; i<ynode.childNodes.length; i++ ) {
			var cNode = this.getNodeById(ynode.childNodes[i]);
			if ( cNode && cNode.pos == this.NODE_POS_RIGHT ) {
				tmpNode = cNode.getSiblingHead();
				break;
			}
		}

		while ( tmpNode ) {
			str += this.buildXNodes(tmpNode);
			tmpNode = tmpNode.nextNode;
		}

		tmpNode = null;
		for ( var i=0; i<ynode.childNodes.length; i++ ) {
			var cNode = this.getNodeById(ynode.childNodes[i]);
			if ( cNode && cNode.pos == this.NODE_POS_LEFT ) {
				tmpNode = cNode.getSiblingHead();
				break;
			}
		}

		while ( tmpNode ) {
			str += this.buildXNodes(tmpNode);
			tmpNode = tmpNode.nextNode;
		}

	} else {
		var tmpNode = null;
		if ( ynode.childNodes.length > 0 ) {
			var cNode = this.getNodeById(ynode.childNodes[0]);
			if ( cNode ) {
				tmpNode = cNode.getSiblingHead();
			}
		}

		while ( tmpNode ) {
			str += this.buildXNodes(tmpNode);
			tmpNode = tmpNode.nextNode;
		}
	}

	str += '</node>\n';

	return str;
}

YTree.prototype.exportToXML = function() {
	var str = '<map version="0.8.0">\n';

	str += this.buildXNodes(this.rootNode);
	str += '</map>';

	return str;
}

YTree.prototype.loadFromXML = function(XMLString) {
	var doc, x;

	if ( window.ActiveXObject ) {
		var doc=new ActiveXObject("Microsoft.XMLDOM");
		doc.async="false";
		doc.loadXML(XMLString);
	} else {
		var parser = new DOMParser();
		doc = parser.parseFromString(XMLString,"text/xml");
	}

	x = doc.documentElement; // map

	for ( var i=0; i<x.childNodes.length; i++ ) {
		var xnode = x.childNodes[i];
		if ( xnode.tagName == "node" ) {
			this.buildYNodes(xnode, this.rootNode);
			break;
		}
	}

}

YTree.prototype.buildText = function(ynode, bWithIndent) {
	var str = "";
	if ( bWithIndent ) {
		for ( var i=0; i<ynode.indent; i++ ) {
			str += "\t";
		}
	}
	str += ynode.text + "\n";

	if ( ynode.indent == 0 ) {
		var tmpNode = null;
		for ( var i=0; i<ynode.childNodes.length; i++ ) {
			var cNode = this.getNodeById(ynode.childNodes[i]);
			if ( cNode && cNode.pos == this.NODE_POS_RIGHT ) {
				tmpNode = cNode.getSiblingHead();
				break;
			}
		}

		while ( tmpNode ) {
			str += this.buildText(tmpNode, bWithIndent);
			tmpNode = tmpNode.nextNode;
		}

		tmpNode = null;
		for ( var i=0; i<ynode.childNodes.length; i++ ) {
			var cNode = this.getNodeById(ynode.childNodes[i]);
			if ( cNode && cNode.pos == this.NODE_POS_LEFT ) {
				tmpNode = cNode.getSiblingHead();
				break;
			}
		}

		while ( tmpNode ) {
			str += this.buildText(tmpNode, bWithIndent);
			tmpNode = tmpNode.nextNode;
		}

	} else {
		var tmpNode = null;
		if ( ynode.childNodes.length > 0 ) {
			var cNode = this.getNodeById(ynode.childNodes[0]);
			if ( cNode ) {
				tmpNode = cNode.getSiblingHead();
			}
		}

		while ( tmpNode ) {
			str += this.buildText(tmpNode, bWithIndent);
			tmpNode = tmpNode.nextNode;
		}
	}

	return str;
}

YTree.prototype.exportToText = function(bWithIndent) {
	return this.buildText(this.rootNode, bWithIndent);
}

YTree.prototype.createRootNode = function(text) {
	this.rootNode = new YNode(null, this.NODE_POS_ROOT, text);

	return this.rootNode;
}

YTree.prototype.addNode = function(node) {
	this.nodes[node.id] = node;
}

YTree.prototype.deleteNodeById = function(id) {
	// What's this?
	// hashmap is just fine for deleting it's key:value pair.
	delete this.nodes[id];
}

YTree.prototype.removeNode = function(node) {
	if ( node.parentNode == null ) {
		return false;
	}

	node.removeChildren();

	for ( var i=0; i<node.parentNode.childNodes.length; i++ ) {
		var tmpNode = g_YTree.getNodeById(node.parentNode.childNodes[i]);
		if ( node.id == tmpNode.id ) {
			node.parentNode.childNodes.splice(i,1);

			if ( node.prevNode ) {
				node.prevNode.nextNode = node.nextNode;
			}
			if ( node.nextNode ) {
				node.nextNode.prevNode = node.prevNode;
			}

			this.deleteNodeById(node.id);
			return true;
		}
	}

	return false;
}

YTree.prototype.getNodeById = function(id) {
	return this.nodes[id];
}

YTree.prototype.getNextMaxId = function() {
	this.maxid++;
	return this.maxid;
}
