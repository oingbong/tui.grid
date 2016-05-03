tui.util.defineNamespace("fedoc.content", {});
fedoc.content["view_layout_body.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @fileoverview Class for the body layout\n * @author NHN Ent. FE Development Team\n */\n'use strict';\n\nvar View = require('../../base/view');\nvar util = require('../../common/util');\nvar attrNameConst = require('../../common/constMap').attrName;\nvar classNameConst = require('../../common/classNameConst');\n\n// Minimum time (ms) to detect if an alert or confirm dialog has been displayed.\nvar MIN_INTERVAL_FOR_PAUSED = 200;\n\n// Minimum distance (pixel) to detect if user wants to drag when moving mouse with button pressed.\nvar MIN_DISATNCE_FOR_DRAG = 10;\n\n/**\n * Class for the body layout\n * @module view/layout/body\n * @extends module:base/view\n */\nvar Body = View.extend(/**@lends module:view/layout/body.prototype */{\n    /**\n     * @constructs\n     * @param {Object} options - Options\n     * @param {String} [options.whichSide='R'] L or R (which side)\n     */\n    initialize: function(options) {\n        View.prototype.initialize.call(this);\n\n        this.setOwnProperties({\n            dimensionModel: options.dimensionModel,\n            dataModel: options.dataModel,\n            columnModel: options.columnModel,\n            renderModel: options.renderModel,\n            selectionModel: options.selectionModel,\n            focusModel: options.focusModel,\n            viewFactory: options.viewFactory,\n\n            // DIV for setting rendering position of entire child-nodes of $el.\n            $container: null,\n            whichSide: options &amp;&amp; options.whichSide || 'R'\n        });\n\n        this.listenTo(this.dimensionModel, 'change:bodyHeight', this._onBodyHeightChange)\n            .listenTo(this.dataModel, 'add remove reset', this._resetContainerHeight)\n            .listenTo(this.renderModel, 'change:scrollTop', this._onScrollTopChange)\n            .listenTo(this.renderModel, 'change:scrollLeft', this._onScrollLeftChange);\n    },\n\n    className: classNameConst.BODY_AREA,\n\n    events: function() {\n        var hash = {};\n        hash.scroll = '_onScroll';\n        hash['mousedown .' + classNameConst.BODY_CONTAINER] = '_onMouseDown';\n\n        return hash;\n    },\n\n    /**\n     * Event handler for 'change:bodyHeight' event on module:model/dimension\n     * @param {Object} model - changed model\n     * @param {Number} value - new height value\n     * @private\n     */\n    _onBodyHeightChange: function(model, value) {\n        this.$el.css('height', value + 'px');\n    },\n\n    /**\n     * Resets the height of a container DIV\n     * @private\n     */\n    _resetContainerHeight: function() {\n        this.$container.css({\n            height: this.dimensionModel.get('totalRowHeight')\n        });\n    },\n\n    /**\n     * Event handler for 'scroll' event on DOM\n     * @param {UIEvent} event - event object\n     * @private\n     */\n    _onScroll: function(event) {\n        var attrs = {\n            scrollTop: event.target.scrollTop\n        };\n\n        if (this.whichSide === 'R') {\n            attrs.scrollLeft = event.target.scrollLeft;\n        }\n        this.renderModel.set(attrs);\n    },\n\n    /**\n     * Event handler for 'change:scrollLeft' event on module:model/renderer\n     * @param {Object} model - changed model\n     * @param {Number} value - new scrollLeft value\n     * @private\n     */\n    _onScrollLeftChange: function(model, value) {\n        if (this.whichSide === 'R') {\n            this.el.scrollLeft = value;\n        }\n    },\n\n    /**\n     * Event handler for 'chage:scrollTop' event on module:model/renderer\n     * @param {Object} model - changed model instance\n     * @param {Number} value - new scrollTop value\n     * @private\n     */\n    _onScrollTopChange: function(model, value) {\n        this.el.scrollTop = value;\n    },\n\n    /**\n     * Returns the name of the visible data columns at given index\n     * @param  {Number} columnIndex - Column index\n     * @returns {String} - Column name\n     * @private\n     */\n    _getColumnNameByVisibleIndex: function(columnIndex) {\n        var columns = this.columnModel.getVisibleColumnModelList(null, false);\n        return columns[columnIndex].columnName;\n    },\n\n    /**\n     * Mousedown event handler\n     * @param {MouseEvent} event - Mousedown event\n     * @private\n     */\n    _onMouseDown: function(event) {\n        var columnModel = this.columnModel;\n        var $target = $(event.target);\n        var $td = $target.closest('td');\n        var $tr = $target.closest('tr');\n        var columnName = $td.attr(attrNameConst.COLUMN_NAME);\n        var rowKey = $tr.attr(attrNameConst.ROW_KEY);\n        var startAction = true;\n        var inputData = _.pick(event, 'pageX', 'pageY', 'shiftKey');\n        var indexData;\n\n        if (!$td.length) { // selection layer, focus layer\n            indexData = this.dimensionModel.getIndexFromMousePosition(event.pageX, event.pageY);\n            columnName = this._getColumnNameByVisibleIndex(indexData.column);\n        } else if (rowKey &amp;&amp; columnName) { // valid cell\n            indexData = {\n                column: columnModel.indexOfColumnName(columnName, true),\n                row: this.dataModel.indexOfRowKey(rowKey)\n            };\n            if (this.columnModel.get('selectType') === 'radio') {\n                this.dataModel.check(indexData.row);\n            }\n        } else { // dummy cell\n            startAction = false;\n        }\n\n        if (startAction) {\n            this._controlStartAction(inputData, indexData, columnName, $target.is('input'));\n        }\n    },\n\n    /**\n     * Control selection action when started\n     * @param {Object} inputData - Mouse position X\n     * @param   {number} inputData.pageY - Mouse position Y\n     * @param   {number} inputData.pageY - Mouse position Y\n     * @param   {boolean} inputData.shiftKey - Whether the shift-key is pressed.\n     * @param {{column:number, row:number}} indexData - Index map object\n     * @param {String} columnName - column name\n     * @param {boolean} isInput - Whether the target is input element.\n     * @private\n     */\n    _controlStartAction: function(inputData, indexData, columnName, isInput) {\n        var selectionModel = this.selectionModel,\n            columnIndex = indexData.column,\n            rowIndex = indexData.row,\n            startDrag = true;\n\n        if (!selectionModel.isEnabled()) {\n            return;\n        }\n\n        if (!util.isMetaColumn(columnName)) {\n            selectionModel.setState('cell');\n            if (inputData.shiftKey &amp;&amp; !isInput) {\n                selectionModel.update(rowIndex, columnIndex);\n            } else {\n                startDrag = this._doFocusAtAndCheckDraggable(rowIndex, columnIndex);\n                selectionModel.end();\n            }\n        } else if (columnName === '_number') {\n            this._updateSelectionByRow(rowIndex, inputData.shiftKey);\n        } else {\n            startDrag = false;\n        }\n\n        if (!isInput &amp;&amp; startDrag) {\n            this.dimensionModel.refreshLayout();\n            this._attachDragEvents(inputData.pageX, inputData.pageY);\n        }\n    },\n\n    /**\n     * Update selection model by row unit.\n     * @param {number} rowIndex - row index\n     * @param {boolean} shiftKey - true if the shift key is pressed\n     * @private\n     */\n    _updateSelectionByRow: function(rowIndex, shiftKey) {\n        if (shiftKey) {\n            this.selectionModel.update(rowIndex, 0, 'row');\n        } else {\n            this.selectionModel.selectRow(rowIndex);\n        }\n    },\n\n    /**\n     * Executes the `focusModel.focusAt()` and returns the boolean value which indicates whether to start drag.\n     * @param {number} rowIndex - row index\n     * @param {number} columnIndex - column index\n     * @returns {boolean}\n     * @private\n     */\n    _doFocusAtAndCheckDraggable: function(rowIndex, columnIndex) {\n        var startTime = (new Date()).getTime(),\n            focusSuccessed = this.focusModel.focusAt(rowIndex, columnIndex),\n            endTime = (new Date()).getTime(),\n            hasPaused = (endTime - startTime) > MIN_INTERVAL_FOR_PAUSED;\n\n        if (!focusSuccessed || hasPaused) {\n            return false;\n        }\n        return true;\n    },\n\n    /**\n     * Attach event handlers for drag event.\n     * @param {Number} pageX - initial pageX value\n     * @param {Number} pageY - initial pageY value\n     * @private\n     */\n    _attachDragEvents: function(pageX, pageY) {\n        this.setOwnProperties({\n            mouseDownX: pageX,\n            mouseDownY: pageY\n        });\n        $(document)\n            .on('mousemove', $.proxy(this._onMouseMove, this))\n            .on('mouseup', $.proxy(this._detachDragEvents, this))\n            .on('selectstart', $.proxy(this._onSelectStart, this));\n    },\n\n    /**\n     * Detach all handlers which are used for drag event.\n     * @private\n     */\n    _detachDragEvents: function() {\n        this.selectionModel.stopAutoScroll();\n        $(document)\n            .off('mousemove', this._onMouseMove)\n            .off('mouseup', this._detachDragEvents)\n            .off('selectstart', this._onSelectStart);\n    },\n\n    /**\n     * Event handler for 'mousemove' event during drag\n     * @param {MouseEvent} event - MouseEvent object\n     * @private\n     */\n    _onMouseMove: function(event) {\n        var dragged = this._getMouseMoveDistance(event.pageX, event.pageY) > MIN_DISATNCE_FOR_DRAG;\n\n        if (this.selectionModel.hasSelection() || dragged) {\n            this.selectionModel.updateByMousePosition(event.pageX, event.pageY);\n        }\n    },\n\n    /**\n     * Returns the distance between 'mousedown' position and specified position.\n     * @param {number} pageX - X position relative to the document\n     * @param {number} pageY - Y position relative to the document\n     * @returns {number} Distance\n     * @private\n     */\n    _getMouseMoveDistance: function(pageX, pageY) {\n        var dx = Math.abs(this.mouseDownX - pageX);\n        var dy = Math.abs(this.mouseDownY - pageY);\n\n        return Math.round(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)));\n    },\n\n    /**\n     * Event handler to prevent default action on `selectstart` event.\n     * @param {Event} event - event object\n     * @returns {boolean} false\n     * @private\n     */\n    _onSelectStart: function(event) {\n        event.preventDefault();\n        return false;\n    },\n\n    /**\n     * renders\n     * @returns {View.Layout.Body}   자기 자신\n     */\n    render: function() {\n        var whichSide = this.whichSide;\n\n        this._destroyChildren();\n\n        if (!this.dimensionModel.get('scrollX')) {\n            this.$el.css('overflow-x', 'hidden');\n        }\n        if (!this.dimensionModel.get('scrollY') &amp;&amp; whichSide === 'R') {\n            this.$el.css('overflow-y', 'hidden');\n        }\n        this.$el.css('height', this.dimensionModel.get('bodyHeight'));\n\n        this.$container = $('&lt;div>').addClass(classNameConst.BODY_CONTAINER);\n        this.$el.append(this.$container);\n\n        this._addChildren([\n            this.viewFactory.createBodyTable(whichSide),\n            this.viewFactory.createSelectionLayer(whichSide),\n            this.viewFactory.createFocusLayer(whichSide)\n        ]);\n        this.$container.append(this._renderChildren());\n        this._resetContainerHeight();\n        return this;\n    }\n});\n\nmodule.exports = Body;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"