///////////////////////////////////////////////////////////
// Some util functions
String.prototype.trim = function() {
  return this.replace(/^\s*(\b.*\b|)\s*$/, "$1");
}


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


///////////////////////////////////////////////////////////
// Tree's node element
YNode.prototype				= new Object();
YNode.prototype.constructor	= YNode;
YNode.superclass			= Object.prototype;

function YNode(parent, pos, text) {
	if ( parent ) {
		if ( this.indent == 1 ) {
		}
		this.id = "_" + g_YTree.getNextMaxId();
		this.indent = parent.indent + 1;
	} else {
		// this node is root node
		this.indent = 0;
		this.id = g_YTree.rootNodeID;
	}
	this.pos = pos;
	this.text = text.trim();
	this.collapsed = false;

	// hold all children's id string
	this.childNodes = new Array;
	
	// hold all icon
	this.icons	= new Array;

	this.parentNode = parent;
	// need for sequencial order for each sibling nodes
	this.prevNode = null;	
	this.nextNode = null;
	
	this.lastSelectedChildID = "";
	
	this.bold = false;
	this.italic = false;

	// append node itself
	g_YTree.addNode(this);
}

YNode.prototype.toString = function () {
	return this.id;
}

YNode.prototype.appendChild = function (text, pos) {
	var newPos;
	
	// Make this tree ballanced
	if ( this.pos == g_YTree.NODE_POS_ROOT ) {
		if ( pos == undefined || pos == null ) {
			var leftNodeCnt = 0;
			var rightNodeCnt = 0;
			var childNodeCnt = this.childNodes.length;
			
			for ( var i=0; i<childNodeCnt; i++ ) {
				var tmpNode = g_YTree.getNodeById(this.childNodes[i]);
				if ( tmpNode.pos == g_YTree.NODE_POS_LEFT ) {
					leftNodeCnt++;
				} else {
					rightNodeCnt++;
				}
			}
	
			if ( leftNodeCnt >= rightNodeCnt ) {
				newPos = g_YTree.NODE_POS_RIGHT;
			} else {
				newPos = g_YTree.NODE_POS_LEFT;
			}
		} else {
			newPos = pos;
			if ( newPos != g_YTree.NODE_POS_RIGHT && newPos != g_YTree.NODE_POS_LEFT ) {
				newPos = g_YTree.NODE_POS_RIGHT;
			}
		}
		
	} else {
		newPos = this.pos;
	}
	
	var node = new YNode(this, newPos, text);
	
	var pnode = null;
	
	// Child node will be the last node in this node
	if ( this.pos == g_YTree.NODE_POS_ROOT ) {
		for ( var i=0; i<this.childNodes.length; i++ ) {
			var tmpNode = g_YTree.getNodeById(this.childNodes[i]);
			if ( tmpNode.pos == newPos ) {
				pnode = tmpNode;
				break;
			}
		}
	} else {
		if ( this.childNodes.length > 0 ) {
			pnode =  g_YTree.getNodeById(this.childNodes[0]);
		}
	}
		
	if ( pnode != null ) {
		while(pnode.nextNode != null) {
			pnode = pnode.nextNode;
		}
		pnode.nextNode = node;
		node.prevNode = pnode;
	}


	// hold all child nodes' id
	this.childNodes.push(node.id);

	return node;
}

YNode.prototype.appendIcon = function (iconSrc) {
	this.icons.push(iconSrc);
}

YNode.prototype.removeIcon = function (iconIdx) {
	if ( iconIdx < 0 || iconIdx >= this.icons.length ) {
		return false;
	}
	this.icons.splice(iconIdx,1);
	return true;
}

YNode.prototype.removeLastIcon = function () {
	if ( this.icons.length == 0 ) {
		return false;
	}
	this.icons.splice(this.icons.length-1,1);
	return true;
}

YNode.prototype.removeIcons = function () {
	var cnt = 0;
	for ( var i=this.icons.length-1; i>=0; i-- ) {
		if ( this.removeIcon(i) ) cnt++;
	}
	return cnt;
}

YNode.prototype.getIconCount = function () {
	return this.icons.length;
}

YNode.prototype.getSiblingHead = function () {
	var tmpNode = this.prevNode;
	if ( tmpNode ) {
		while ( tmpNode.prevNode != null ) {
			tmpNode = tmpNode.prevNode;
		}
	} else {
		tmpNode = this;
	}
	return tmpNode;
}

YNode.prototype.getChildHead = function () {
	if ( this.childNodes.length == 0 ) {
		return null;
	}
	return g_YTree.getNodeById(this.childNodes[0]).getSiblingHead();
}

YNode.prototype.getSiblingTail = function () {
	var tmpNode = this.nextNode;
	if ( tmpNode ) {
		while ( tmpNode.nextNode != null ) {
			tmpNode = tmpNode.nextNode;
		}
	} else {
		tmpNode = this;
	}
	return tmpNode;
}

YNode.prototype.getChildTail = function () {
	if ( this.childNodes.length == 0 ) {
		return null;
	}
	return g_YTree.getNodeById(this.childNodes[0]).getSiblingTail();
}

YNode.prototype.getLastSelectedChild = function (pos) {
	var tmpNode = null;
	var childCnt = this.childNodes.length;
	
	if ( childCnt == 0 ) {
		return null;
	}
	
	if ( this.lastSelectedChildID != "" )
		tmpNode = g_YTree.getNodeById(this.lastSelectedChildID);

	if (
		(tmpNode == undefined || tmpNode == null) ||
		(tmpNode.parentNode.id != this.id || (this.indent == 0 && tmpNode.pos != pos))
	) {
		tmpNode = null;
		if ( this.indent == 0 ) {
			for ( var i=0; i<childCnt; i++ ) {
				var cNode = g_YTree.getNodeById(this.childNodes[i]);
				if ( cNode.pos == pos ) {
					tmpNode = cNode;
					break;
				}
			}
		} else {
			tmpNode = g_YTree.getNodeById(this.childNodes[0]);
		}

		return (tmpNode != null)? tmpNode.getSiblingHead():null;
	}

	return tmpNode;	
}

YNode.prototype.switchNode = function (dir) {
	if ( dir != g_YTree.NODE_SWITCH_UP && dir != g_YTree.NODE_SWITCH_DN ) {
		return null;
	}
	
	var pnode = this.prevNode;
	var nnode = this.nextNode;
	
	if ( dir == g_YTree.NODE_SWITCH_UP ) {
		if ( pnode == null ) {
			return null;
		}

		if ( pnode.prevNode ) {
			this.prevNode = pnode.prevNode;
			pnode.prevNode.nextNode = this;
		} else {
			this.prevNode = null;
		}
		
		if ( nnode ) {
			pnode.nextNode = nnode;
			nnode.prevNode = pnode;
		} else {
			pnode.nextNode = null;
		}
		
		this.nextNode = pnode;
		pnode.prevNode = this;
		
		return pnode;

	} else {
		if ( nnode == null ) {
			return null;
		}
		
		if ( pnode ) {
			nnode.prevNode = pnode;
			pnode.nextNode = nnode;
		} else {
			nnode.prevNode = null;
		}
		
		if ( nnode.nextNode ) {
			this.nextNode = nnode.nextNode;
			nnode.prevNode = this;
		} else {
			this.nextNode = null;
		}
		
		this.prevNode = nnode;
		nnode.nextNode = this;
		
		return nnode;
	}
	
	return null;
}

YNode.prototype.appendSibling = function (text, dir) {
	if ( this.parentNode == null ) {
		return null;
	}

	var node = new YNode(this.parentNode, this.pos, text);
	
	// adjust the order for this newly inserted node
	if ( dir == g_YTree.NODE_SIB_PREV ) {	// set it previous node
		if ( this.prevNode ) {
			this.prevNode.nextNode = node;
		}
		node.prevNode = this.prevNode;
		node.nextNode = this;
		this.prevNode = node;
	} else {	// set it next node
		if ( this.nextNode ) {
			this.nextNode.prevNode = node;
		}
		node.prevNode = this;
		node.nextNode = this.nextNode;
		this.nextNode = node;
	}
	
	this.parentNode.childNodes.push(node.id);

	return node;
}

YNode.prototype.changePos = function(pos) {
	for ( var i=0; i<this.childNodes.length; i++ ) {
		node = g_YTree.getNodeById(this.childNodes[i]);
		node.changePos(pos);
	}
	this.pos = pos;
}

YNode.prototype.changeIndent = function(indent) {
	for ( var i=0; i<this.childNodes.length; i++ ) {
		node = g_YTree.getNodeById(this.childNodes[i]);
		node.changeIndent(indent+1);
	}
	this.indent = indent;
}

YNode.prototype.detachChild = function (node) {
	// javascript does not remove array element by deleting
	// Splice is the only one method that I know which really elimintes
	// array element
	for ( var i=0; i<this.childNodes.length; i++ ) {
		if ( this.childNodes[i] == node.id ) {
			var pnode = node.prevNode;
			var nnode = node.nextNode;
			node.parentNode = null;
			node.prevNode = null;
			node.nextNode = null;
			if ( pnode ) {
				pnode.nextNode = nnode;
			}
			
			if ( nnode ) {
				nnode.prevNode = pnode;
			}

			this.childNodes.splice(i,1);
			
			return true;
		}
	}
	
	return false;
}

// remove all child nodes.
// if bSelf is true remove itself.
YNode.prototype.removeChildren = function ( pos ) {
	for ( var i=this.childNodes.length-1; i >= 0; i-- ) {
		var node = g_YTree.nodes[this.childNodes[i]];
		if ( pos != undefined && node.pos != pos ) {
			continue;
		}
		this.childNodes.splice(i,1);

		node.removeChildren( pos );

		g_YTree.deleteNodeById(node.id);
	}
}

YNode.prototype.isChildren = function (id) {
	for ( var i=0; i<this.childNodes.length; i++ ) {
		node = g_YTree.getNodeById(this.childNodes[i]);
		if ( node.id == id || node.isChildren(id) == true ) {
			return true;
		}
	}
	return false;
}

YNode.prototype.attachToNode = function (tnode, pos) {
	// ignore root node
	if ( this.parentNode == null ) {
		return false;
	}
	
	var pnode = null;

	if ( tnode.indent == 0 ) {
		// swap pos when tnode is root
		if ( this.indent == 1 && this.pos == pos ) {
			return false;
		}

		var len = tnode.childNodes.length;

		for ( var i=0; i<len; i++ ) {
			var tmpNode = g_YTree.getNodeById(tnode.childNodes[i]);
			if ( tmpNode.pos == pos ) {
				pnode = tmpNode;
				break;
			}
		}
		
	} else {
	
		// ignore self attaching, parent attaching, children attaching
		if ( this.id == tnode.id || this.parentNode.id == tnode.id || this.isChildren(tnode.id) ) {
			return false;
		}
		
		if ( tnode.childNodes.length > 0 ) {
			pnode = g_YTree.getNodeById(tnode.childNodes[0]);
		}
	}
	
	// find tail node
	if ( pnode != null ) {
		while(pnode.nextNode != null) {
			pnode = pnode.nextNode;
		}
	}
	
	// remove from previous parent
	// after detachChild call parentNode will be null
	if ( !this.parentNode.detachChild(this) ) {
		return false;
	}
	
	// append this to tnode
	tnode.childNodes.push(this.id);
	if ( pnode ) {
		pnode.nextNode = this;
	}
	this.parentNode = tnode;
	this.prevNode = pnode;
	this.nextNode = null;

	// set pos if pos is different from previous pos
	if ( this.pos != pos ) {
		this.changePos(pos);
	}
	
	// set indent if indent is diffrent from previous indent
	if ( this.indent != (tnode.indent+1) ) {
		this.changeIndent(tnode.indent+1);
	}
	
	return true;
}

YNode.prototype.toggleBold = function (val) {
	if ( val != undefined ) {
		this.bold = val;
	}
	this.bold = !this.bold;
}

YNode.prototype.toggleItalic = function (val) {
	if ( val != undefined ) {
		this.italic = val;
	}
	this.italic = !this.italic;
}