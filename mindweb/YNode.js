///////////////////////////////////////////////////////////
// Some util functions
String.prototype.trim = function() {
  return this.replace(/^\s*(\b.*\b|)\s*$/, "$1");
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
