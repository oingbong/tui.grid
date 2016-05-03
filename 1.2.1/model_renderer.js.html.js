tui.util.defineNamespace("fedoc.content", {});
fedoc.content["model_renderer.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @fileoverview Rendering 모델\n * @author NHN Ent. FE Development Team\n */\n'use strict';\n\nvar Model = require('../base/model');\nvar RowList = require('./rowList');\nvar renderStateMap = require('../common/constMap').renderState;\n\nvar DATA_LENGTH_FOR_LOADING = 1000;\n\n/**\n * View 에서 Rendering 시 사용할 객체\n * @module model/renderer\n * @extends module:base/model\n */\nvar Renderer = Model.extend(/**@lends module:model/renderer.prototype */{\n    /**\n     * @constructs\n     * @param {Object} attrs - Attributes\n     * @param {Object} options - Options\n     */\n    initialize: function(attrs, options) {\n        var lside, rside, rowListOptions;\n\n        this.setOwnProperties({\n            dataModel: options.dataModel,\n            columnModel: options.columnModel,\n            focusModel: options.focusModel,\n            dimensionModel: options.dimensionModel\n        });\n\n        rowListOptions = {\n            dataModel: this.dataModel,\n            columnModel: this.columnModel,\n            focusModel: this.focusModel\n        };\n\n        lside = new RowList([], rowListOptions);\n        rside = new RowList([], rowListOptions);\n        this.set({\n            lside: lside,\n            rside: rside\n        });\n\n        this.listenTo(this.columnModel, 'all', this._onColumnModelChange)\n            .listenTo(this.dataModel, 'remove sort reset', this._onDataModelChange)\n            .listenTo(this.dataModel, 'add', this._onAddDataModel)\n            .listenTo(this.dataModel, 'beforeReset', this._onBeforeResetData)\n            .listenTo(lside, 'valueChange', this._executeRelation)\n            .listenTo(rside, 'valueChange', this._executeRelation)\n            .listenTo(this.focusModel, 'change:editingAddress', this._onEditingAddressChange)\n            .listenTo(this.dimensionModel, 'change:width', this._updateMaxScrollLeft)\n            .listenTo(this.dimensionModel, 'change:totalRowHeight change:scrollBarSize change:bodyHeight',\n                this._updateMaxScrollTop);\n\n        if (this.get('showDummyRows')) {\n            this.listenTo(this.dimensionModel, 'change:displayRowCount', this._resetDummyRows);\n        }\n\n        this._onChangeLayoutBound = _.bind(this._onChangeLayout, this);\n\n        this.listenTo(this.dimensionModel, 'columnWidthChanged', this.finishEditing);\n\n        this._updateMaxScrollLeft();\n    },\n\n    defaults: {\n        top: 0,\n        scrollTop: 0,\n        scrollLeft: 0,\n        maxScrollLeft: 0,\n        maxScrollTop: 0,\n        startIndex: 0,\n        endIndex: 0,\n        startNumber: 1,\n        lside: null,\n        rside: null,\n        showDummyRows: false,\n        dummyRowCount: 0,\n\n        // text that will be shown if no data to render (custom value set by user)\n        emptyMessage: null,\n\n        // constMap.renderState\n        state: renderStateMap.DONE\n    },\n\n    /**\n     * Event handler for change:scrollTop and change:scrollLeft.\n     * @private\n     */\n    _onChangeLayout: function() {\n        this.focusModel.finishEditing();\n        this.focusModel.focusClipboard();\n    },\n\n    /**\n     * Event handler for 'chage:width' event on Dimension.\n     * @private\n     */\n    _updateMaxScrollLeft: function() {\n        var dimension = this.dimensionModel,\n            maxScrollLeft = dimension.getFrameWidth('R') - dimension.get('rsideWidth') +\n                dimension.getScrollYWidth();\n\n        this.set('maxScrollLeft', maxScrollLeft);\n    },\n\n    /**\n     * Event handler to reset 'maxScrollTop' attribute.\n     * @private\n     */\n    _updateMaxScrollTop: function() {\n        var dimension = this.dimensionModel,\n            maxScrollTop = dimension.get('totalRowHeight') - dimension.get('bodyHeight') +\n                dimension.get('scrollBarSize');\n\n        this.set('maxScrollTop', maxScrollTop);\n    },\n\n    /**\n     * Event handler for 'beforeReset' event on dataModel\n     * @param {number} dataLength - the length of data\n     * @private\n     */\n    _onBeforeResetData: function(dataLength) {\n        if (dataLength > DATA_LENGTH_FOR_LOADING) {\n            this.set('state', renderStateMap.LOADING);\n        }\n    },\n\n    /**\n     * Event handler for 'change:editingAddress' event on focusModel\n     * @param {module:model/focus} focusModel - focus model\n     * @param {{rowKey: Number, columnName: String}} address - address\n     * @private\n     */\n    _onEditingAddressChange: function(focusModel, address) {\n        var target = address;\n        var editing = true;\n        var self = this;\n\n        if (!address) {\n            target = focusModel.previous('editingAddress');\n            editing = false;\n        }\n        this._updateCellData(target.rowKey, target.columnName, {\n            isEditing: editing\n        });\n\n        this._triggerEditingStateChanged(target.rowKey, target.columnName);\n\n        // defered call to prevent 'change:scrollLeft' or 'change:scrollTop' event\n        // triggered by module:view/layout/body._onScroll()\n        // when module:model/focus.scrollToFocus() method is called.\n        _.defer(function() {\n            self._toggleChangeLayoutEventHandlers(editing);\n        });\n    },\n\n    /**\n     * Toggle event handler for change:scrollTop and change:scrollLeft event.\n     * @param {Boolean} editing - whether currently editing\n     * @private\n     */\n    _toggleChangeLayoutEventHandlers: function(editing) {\n        var renderEventName = 'change:scrollTop change:scrollLeft';\n        var dimensionEventName = 'columnWidthChanged';\n\n        if (editing) {\n            this.listenToOnce(this.dimensionModel, dimensionEventName, this._onChangeLayoutBound);\n            this.once(renderEventName, this._onChangeLayoutBound);\n        } else {\n            this.stopListening(this.dimensionModel, dimensionEventName, this._onChangeLayoutBound);\n            this.off(renderEventName, this._onChangeLayoutBound);\n        }\n    },\n\n    /**\n     * Triggers the 'editingStateChanged' event if the cell data identified by\n     * given row key and column name has the useViewMode:true option.\n     * @param {String} rowKey - row key\n     * @param {String} columnName - column name\n     * @private\n     */\n    _triggerEditingStateChanged: function(rowKey, columnName) {\n        var cellData = this.getCellData(rowKey, columnName);\n\n        if (tui.util.pick(cellData, 'columnModel', 'editOption', 'useViewMode') !== false) {\n            this.trigger('editingStateChanged', cellData);\n        }\n    },\n\n    /**\n     * Updates the view-data of the cell identified by given rowKey and columnName.\n     * @param {(String|Number)} rowKey - row key\n     * @param {String} columnName - column name\n     * @param {Object} cellData - cell data\n     * @private\n     */\n    _updateCellData: function(rowKey, columnName, cellData) {\n        var rowModel = this._getRowModel(rowKey, columnName);\n\n        if (rowModel) {\n            rowModel.setCell(columnName, cellData);\n        }\n    },\n\n    /**\n     * Initializes own properties.\n     * (called by module:addon/net)\n     */\n    initializeVariables: function() {\n        this.set({\n            top: 0,\n            scrollTop: 0,\n            scrollLeft: 0,\n            startIndex: 0,\n            endIndex: 0,\n            startNumber: 1\n        });\n    },\n\n    /**\n     * 열고정 영역 또는 열고정이 아닌 영역에 대한 Render Collection 을 반환한다.\n     * @param {String} [whichSide='R']    어느 영역인지 여부. 'L|R' 중에 하나의 값을 넘긴다.\n     * @returns {Object} collection  해당 영역의 랜더 데이터 콜랙션\n     */\n    getCollection: function(whichSide) {\n        return this.get(tui.util.isString(whichSide) ? whichSide.toLowerCase() + 'side' : 'rside');\n    },\n\n    /**\n     * Data.ColumnModel 이 변경되었을 때 열고정 영역 frame, 열고정 영역이 아닌 frame 의 list 를 재생성 하기 위한 이벤트 핸들러\n     * @private\n     */\n    _onColumnModelChange: function() {\n        this.set({\n            scrollTop: 0,\n            top: 0,\n            startIndex: 0,\n            endIndex: 0\n        });\n        this.refresh(true);\n    },\n\n    /**\n     * Event handler for change\n     * @private\n     */\n    _onDataModelChange: function() {\n        this.refresh(false, true);\n    },\n\n    /**\n     * Event handler for 'add' event on dataModel.\n     * @param  {module:model/data/rowList} dataModel - data model\n     * @param  {Object} options - options for appending. See {@link module:model/data/rowList#append}\n     * @private\n     */\n    _onAddDataModel: function(dataModel, options) {\n        this.refresh(false, true);\n\n        if (options.focus) {\n            this.focusModel.focusAt(options.at, 0);\n        }\n    },\n\n    /**\n     * Resets dummy rows and trigger 'rowListChanged' event.\n     * @private\n     */\n    _resetDummyRows: function() {\n        this._clearDummyRows();\n        this._fillDummyRows();\n        this.trigger('rowListChanged');\n    },\n\n    /**\n     * rendering 할 index 범위를 결정한다.\n     * Smart rendering 을 사용하지 않을 경우 전체 범위로 랜더링한다.\n     * @private\n     */\n    _setRenderingRange: function() {\n        this.set({\n            startIndex: 0,\n            endIndex: this.dataModel.length - 1\n        });\n    },\n\n    /**\n     * Returns the new data object for rendering based on rowDataModel and specified column names.\n     * @param  {Object} rowDataModel - Instance of module:model/data/row\n     * @param  {Array.&lt;String>} columnNames - Column names\n     * @param  {Number} height - the height of the row\n     * @param  {Number} rowNum - Row number\n     * @returns {Object} - view data object\n     * @private\n     */\n    _createViewDataFromDataModel: function(rowDataModel, columnNames, height, rowNum) {\n        var viewData = {\n            height: height,\n            rowNum: rowNum,\n            rowKey: rowDataModel.get('rowKey'),\n            _extraData: rowDataModel.get('_extraData')\n        };\n\n        _.each(columnNames, function(columnName) {\n            var value = rowDataModel.get(columnName);\n\n            if (columnName === '_number') {\n                value = rowNum;\n            }\n            viewData[columnName] = value;\n        });\n\n        return viewData;\n    },\n\n    /**\n     * Returns the object that contains two array of column names splitted by columnFixCount.\n     * @returns {{lside: Array, rside: Array}} - Column names map\n     * @private\n     */\n    _getColumnNamesOfEachSide: function() {\n        var columnFixCount = this.columnModel.getVisibleColumnFixCount(true),\n            columnModels = this.columnModel.getVisibleColumnModelList(null, true),\n            columnNames = _.pluck(columnModels, 'columnName');\n\n        return {\n            lside: columnNames.slice(0, columnFixCount),\n            rside: columnNames.slice(columnFixCount)\n        };\n    },\n\n    /**\n     * Resets specified view model list.\n     * @param  {String} attrName - 'lside' or 'rside'\n     * @param  {Object} viewData - Converted data for rendering view\n     * @private\n     */\n    _resetViewModelList: function(attrName, viewData) {\n        this.get(attrName).clear().reset(viewData, {\n            parse: true\n        });\n    },\n\n    /**\n     * Resets both sides(lside, rside) of view model list with given range of data model list.\n     * @param  {Number} startIndex - Start index\n     * @param  {Number} endIndex - End index\n     * @private\n     */\n    _resetAllViewModelListWithRange: function(startIndex, endIndex) {\n        var columnNamesMap = this._getColumnNamesOfEachSide(),\n            rowNum = this.get('startNumber') + startIndex,\n            height = this.dimensionModel.get('rowHeight'),\n            lsideData = [],\n            rsideData = [],\n            rowDataModel, i;\n\n        for (i = startIndex; i &lt;= endIndex; i += 1) {\n            rowDataModel = this.dataModel.at(i);\n            lsideData.push(this._createViewDataFromDataModel(rowDataModel, columnNamesMap.lside, height, rowNum));\n            rsideData.push(this._createViewDataFromDataModel(rowDataModel, columnNamesMap.rside, height, rowNum));\n            rowNum += 1;\n        }\n\n        this._resetViewModelList('lside', lsideData);\n        this._resetViewModelList('rside', rsideData);\n    },\n\n    /**\n     * Returns the count of rows (except dummy rows) in view model list\n     * @returns {Number} Count of rows\n     * @private\n     */\n    _getActualRowCount: function() {\n        return this.get('endIndex') - this.get('startIndex') + 1;\n    },\n\n    /**\n     * Removes all dummy rows in the view model list.\n     * @private\n     */\n    _clearDummyRows: function() {\n        var dataRowCount = this.get('endIndex') - this.get('startIndex') + 1;\n\n        _.each(['lside', 'rside'], function(attrName) {\n            var rowList = this.get(attrName);\n            while (rowList.length > dataRowCount) {\n                rowList.pop();\n            }\n        }, this);\n    },\n\n    /**\n     * fills the empty area with dummy rows.\n     * @private\n     */\n    _fillDummyRows: function() {\n        var displayRowCount = this.dimensionModel.get('displayRowCount');\n        var actualRowCount = this._getActualRowCount();\n        var dummyRowCount = Math.max(displayRowCount - actualRowCount, 0);\n        var rowHeight = this.dimensionModel.get('rowHeight');\n        var rowNum = this.get('endIndex') + 2;\n\n        _.times(dummyRowCount, function() {\n            _.each(['lside', 'rside'], function(listName) {\n                this.get(listName).add({\n                    height: rowHeight,\n                    rowNum: rowNum\n                });\n            }, this);\n            rowNum += 1;\n        }, this);\n\n        this.set('dummyRowCount', dummyRowCount);\n    },\n\n    /**\n     * Refreshes the rendering range and the list of view models, and triggers events.\n     * @param {Boolean} columnModelChanged - The boolean value whether columnModel has changed\n     * @param {Boolean} dataModelChanged - The boolean value whether dataModel has changed\n     */\n    refresh: function(columnModelChanged, dataModelChanged) {\n        var startIndex, endIndex, i;\n\n        this._setRenderingRange(this.get('scrollTop'));\n        startIndex = this.get('startIndex');\n        endIndex = this.get('endIndex');\n\n        this._resetAllViewModelListWithRange(startIndex, endIndex);\n        if (this.get('showDummyRows')) {\n            this._fillDummyRows();\n        }\n\n        for (i = startIndex; i &lt;= endIndex; i += 1) {\n            this._executeRelation(i);\n        }\n\n        if (columnModelChanged) {\n            this.trigger('columnModelChanged');\n        } else {\n            this.trigger('rowListChanged', dataModelChanged);\n        }\n        this._refreshState();\n    },\n\n    /**\n     * Set state value based on the DataModel.length\n     * @private\n     */\n    _refreshState: function() {\n        if (this.dataModel.length) {\n            this.set('state', renderStateMap.DONE);\n        } else {\n            this.set('state', renderStateMap.EMPTY);\n        }\n    },\n\n    /**\n     * columnName 으로 lside 와 rside rendering collection 중 하나를 반환한다.\n     * @param {String} columnName   컬럼명\n     * @returns {Collection} 컬럼명에 해당하는 영역의 콜랙션\n     * @private\n     */\n    _getCollectionByColumnName: function(columnName) {\n        var lside = this.get('lside'),\n            collection;\n\n        if (lside.at(0) &amp;&amp; lside.at(0).get(columnName)) {\n            collection = lside;\n        } else {\n            collection = this.get('rside');\n        }\n        return collection;\n    },\n\n    /**\n     * Returns the specified row model.\n     * @param {(Number|String)} rowKey - row key\n     * @param {String} columnName - column name\n     * @returns {module:model/row}\n     * @private\n     */\n    _getRowModel: function(rowKey, columnName) {\n        var collection = this._getCollectionByColumnName(columnName);\n\n        return collection.get(rowKey);\n    },\n\n    /**\n     * 셀 데이터를 반환한다.\n     * @param {number} rowKey   데이터의 키값\n     * @param {String} columnName   컬럼명\n     * @returns {object} cellData 셀 데이터\n     * @example\n     =>\n     {\n         rowKey: rowKey,\n         columnName: columnName,\n         value: value,\n         rowSpan: rowSpanData.count,\n         isMainRow: rowSpanData.isMainRow,\n         mainRowKey: rowSpanData.mainRowKey,\n         isEditable: isEditable,\n         isDisabled: isDisabled,\n         optionList: [],\n         className: row.getClassNameList(columnName).join(' '),\n         changed: []    //names of changed properties\n     }\n     */\n    getCellData: function(rowKey, columnName) {\n        var row = this._getRowModel(rowKey, columnName),\n            cellData = null;\n\n        if (row) {\n            cellData = row.get(columnName);\n        }\n        return cellData;\n    },\n\n    /**\n     * Executes the relation of the row identified by rowIndex\n     * @param {Number} rowIndex - Row index\n     * @private\n     */\n    _executeRelation: function(rowIndex) {\n        var row = this.dataModel.at(rowIndex),\n            renderIdx = rowIndex - this.get('startIndex'),\n            rowModel, relationResult;\n\n        relationResult = row.executeRelationCallbacksAll();\n\n        _.each(relationResult, function(changes, columnName) {\n            rowModel = this._getCollectionByColumnName(columnName).at(renderIdx);\n            if (rowModel) {\n                rowModel.setCell(columnName, changes);\n            }\n        }, this);\n    }\n});\n\nmodule.exports = Renderer;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"