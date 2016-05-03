tui.util.defineNamespace("fedoc.content", {});
fedoc.content["model_dimension.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @fileoverview 크기에 관련된 데이터를 다루는 모델\n * @author NHN Ent. FE Development Team\n */\n'use strict';\nvar Model = require('../base/model');\nvar util = require('../common/util');\nvar dimensionConstMap = require('../common/constMap').dimension;\n\nvar TABLE_BORDER_WIDTH = dimensionConstMap.TABLE_BORDER_WIDTH;\nvar CELL_BORDER_WIDTH = dimensionConstMap.CELL_BORDER_WIDTH;\n\n/**\n * 크기 관련 데이터 저장\n * @module model/dimension\n * @extends module:base/model\n */\nvar Dimension = Model.extend(/**@lends module:model/dimension.prototype */{\n    /**\n     * @constructs\n     * @param {Object} attrs - Attributes\n     * @param {Object} options - Options\n     */\n    initialize: function(attrs, options) {\n        Model.prototype.initialize.apply(this, arguments);\n\n        /**\n         * An array of the fixed flags of the columns\n         * @private\n         * @type {boolean[]}\n         */\n        this._columnWidthFixedFlags = null;\n\n        /**\n         * An array of the minimum width of the columns\n         * @private\n         * @type {number[]}\n         */\n        this._minColumnWidthList = null;\n\n        this.columnModel = options.columnModel;\n        this.dataModel = options.dataModel;\n        this.domState = options.domState;\n\n        this.listenTo(this.columnModel, 'columnModelChange', this._initColumnWidthVariables);\n        this.listenTo(this.dataModel, 'add remove reset', this._resetTotalRowHeight);\n\n        this.on('change:width', this._onWidthChange, this);\n        this.on('change:bodyHeight', this._resetDisplayRowCount, this);\n        this.on('change:displayRowCount', this._resetBodyHeight, this);\n\n        this._initColumnWidthVariables();\n        this._resetBodyHeight();\n    },\n\n    models: null,\n\n    columnModel: null,\n\n    defaults: {\n        offsetLeft: 0,\n        offsetTop: 0,\n\n        width: 0,\n\n        headerHeight: 0,\n        bodyHeight: 0,\n        toolbarHeight: 65,\n\n        rowHeight: 0,\n        totalRowHeight: 0,\n\n        rsideWidth: 0,\n        lsideWidth: 0,\n        columnWidthList: [],\n\n        minimumColumnWidth: 0,\n        displayRowCount: 1,\n        scrollBarSize: 17,\n        scrollX: true,\n        scrollY: true,\n        fitToParentHeight: false\n    },\n\n    /**\n     * 전체 넓이에서 스크롤바, border등의 넓이를 제외하고 실제 셀의 넓이에 사용되는 값만 반환한다.\n     * @param {number} columnLength - 컬럼의 개수\n     * @returns {number} 사용가능한 전체 셀의 넓이\n     * @private\n     */\n    _getAvailableTotalWidth: function(columnLength) {\n        var totalWidth = this.get('width'),\n            borderCount = columnLength + 1 + (this.isDivisionBorderDoubled() ? 1 : 0),\n            totalBorderWidth = borderCount * CELL_BORDER_WIDTH,\n            availableTotalWidth = totalWidth - this.getScrollYWidth() - totalBorderWidth;\n\n        return availableTotalWidth;\n    },\n\n    /**\n     * Makes all width of columns not less than minimumColumnWidth.\n     * @param {number[]} columnWidthList - 컬럼 넓이값 배열\n     * @returns {number[]} - 수정된 새로운 넓이값 배열\n     * @private\n     */\n    _applyMinimumColumnWidth: function(columnWidthList) {\n        var minWidthList = this._minColumnWidthList,\n            appliedList = _.clone(columnWidthList);\n\n        _.each(appliedList, function(width, index) {\n            var minWidth = minWidthList[index];\n            if (width &lt; minWidth) {\n                appliedList[index] = minWidth;\n            }\n        });\n        return appliedList;\n    },\n\n    /**\n     * Resets the 'totalRowHeight' attribute.\n     * @private\n     */\n    _resetTotalRowHeight: function() {\n        var rowHeight = this.get('rowHeight'),\n            rowCount = this.dataModel.length;\n\n        this.set('totalRowHeight', util.getHeight(rowCount, rowHeight));\n    },\n\n    /**\n     * Resets the 'displayRowCount' attribute.\n     * @private\n     */\n    _resetDisplayRowCount: function() {\n        var actualBodyHeight, displayRowCount;\n\n        // To prevent recursive call with _resetBodyHeight (called by change:displayRowCount event)\n        if (_.has(this.changed, 'displayRowCount')) {\n            return;\n        }\n        actualBodyHeight = this.get('bodyHeight') - this.getScrollXHeight();\n        displayRowCount = util.getDisplayRowCount(actualBodyHeight, this.get('rowHeight'));\n\n        this.set('displayRowCount', displayRowCount);\n    },\n\n    /**\n     * Sets the width of columns whose width is not assigned by distributing extra width to them equally.\n     * @param {number[]} columnWidthList - An array of column widths\n     * @returns {number[]} - A new array of column widths\n     * @private\n     */\n    _fillEmptyColumnWidth: function(columnWidthList) {\n        var totalWidth = this._getAvailableTotalWidth(columnWidthList.length),\n            remainTotalWidth = totalWidth - util.sum(columnWidthList),\n            emptyIndexes = [];\n\n        _.each(columnWidthList, function(width, index) {\n            if (!width) {\n                emptyIndexes.push(index);\n            }\n        });\n        return this._distributeExtraWidthEqually(columnWidthList, remainTotalWidth, emptyIndexes);\n    },\n\n    /**\n     * Adds extra widths of the column equally.\n     * @param {number[]} columnWidthList - An array of column widths\n     * @param {number} totalExtraWidth - Total extra width\n     * @returns {number[]} - A new array of column widths\n     * @private\n     */\n    _addExtraColumnWidth: function(columnWidthList, totalExtraWidth) {\n        var fixedFlags = this._columnWidthFixedFlags,\n            columnIndexes = [];\n\n        _.each(fixedFlags, function(flag, index) {\n            if (!flag) {\n                columnIndexes.push(index);\n            }\n        });\n        return this._distributeExtraWidthEqually(columnWidthList, totalExtraWidth, columnIndexes);\n    },\n\n    /**\n     * Reduces excess widths of the column equally.\n     * @param {number[]} columnWidthList - An array of column widths\n     * @param {number} totalExcessWidth - Total excess width (negative number)\n     * @returns {number[]} - A new array of column widths\n     * @private\n     */\n    _reduceExcessColumnWidth: function(columnWidthList, totalExcessWidth) {\n        var minWidthList = this._minColumnWidthList,\n            fixedFlags = this._columnWidthFixedFlags,\n            availableList = [];\n\n        _.each(columnWidthList, function(width, index) {\n            if (!fixedFlags[index]) {\n                availableList.push({\n                    index: index,\n                    width: width - minWidthList[index]\n                });\n            }\n        });\n\n        return this._reduceExcessColumnWidthSub(_.clone(columnWidthList), totalExcessWidth, availableList);\n    },\n\n    /**\n     * Reduce the (remaining) excess widths of the column.\n     * This method will be called recursively by _reduceExcessColumnWidth.\n     * @param {number[]} columnWidthList - An array of column Width\n     * @param {number} totalRemainWidth - Remaining excess width (negative number)\n     * @param {object[]} availableList - An array of infos about available column.\n     *                                 Each item of the array has {index:number, width:number}.\n     * @returns {number[]} - A new array of column widths\n     * @private\n     */\n    _reduceExcessColumnWidthSub: function(columnWidthList, totalRemainWidth, availableList) {\n        var avgValue = Math.round(totalRemainWidth / availableList.length),\n            newAvailableList = [],\n            columnIndexes;\n\n        _.each(availableList, function(available) {\n            // note that totalRemainWidth and avgValue are negative number.\n            if (available.width &lt; Math.abs(avgValue)) {\n                totalRemainWidth += available.width;\n                columnWidthList[available.index] -= available.width;\n            } else {\n                newAvailableList.push(available);\n            }\n        });\n        // call recursively until all available width are less than average\n        if (availableList.length > newAvailableList.length) {\n            return this._reduceExcessColumnWidthSub(columnWidthList, totalRemainWidth, newAvailableList);\n        }\n        columnIndexes = _.pluck(availableList, 'index');\n\n        return this._distributeExtraWidthEqually(columnWidthList, totalRemainWidth, columnIndexes);\n    },\n\n    /**\n     * Distributes the extra width equally to each column at specified indexes.\n     * @param {number[]} columnWidthList - An array of column width\n     * @param {number} extraWidth - Extra width\n     * @param {number[]} columnIndexes - An array of indexes of target columns\n     * @returns {number[]} - A new array of column widths\n     * @private\n     */\n    _distributeExtraWidthEqually: function(columnWidthList, extraWidth, columnIndexes) {\n        var length = columnIndexes.length,\n            avgValue = Math.round(extraWidth / length),\n            errorValue = (avgValue * length) - extraWidth, // to correct total width\n            resultList = _.clone(columnWidthList);\n\n        _.each(columnIndexes, function(columnIndex) {\n            resultList[columnIndex] += avgValue;\n        });\n\n        if (columnIndexes.length) {\n            resultList[_.last(columnIndexes)] -= errorValue;\n        }\n\n        return resultList;\n    },\n\n    /**\n     * Adjust the column widths to make them fit into the dimension.\n     * @param {number[]} columnWidthList - An array of column width\n     * @param {boolean} [fitToReducedTotal] - If set to true and the total width is smaller than dimension(width),\n     *                                    the column widths will be reduced.\n     * @returns {number[]} - A new array of column widths\n     * @private\n     */\n    _adjustColumnWidthList: function(columnWidthList, fitToReducedTotal) {\n        var columnLength = columnWidthList.length,\n            availableWidth = this._getAvailableTotalWidth(columnLength),\n            totalExtraWidth = availableWidth - util.sum(columnWidthList),\n            fixedCount = _.filter(this._columnWidthFixedFlags).length,\n            adjustedList;\n\n        if (totalExtraWidth > 0) {\n            if (columnLength > fixedCount) {\n                adjustedList = this._addExtraColumnWidth(columnWidthList, totalExtraWidth);\n            } else {\n                // If all column has fixed width, add extra width to the last column.\n                adjustedList = _.clone(columnWidthList);\n                adjustedList[columnLength - 1] += totalExtraWidth;\n            }\n        } else if (fitToReducedTotal &amp;&amp; totalExtraWidth &lt; 0) {\n            adjustedList = this._reduceExcessColumnWidth(columnWidthList, totalExtraWidth);\n        } else {\n            adjustedList = columnWidthList;\n        }\n        return adjustedList;\n    },\n\n    /**\n     * columnModel 에 설정된 넓이값을 기준으로 컬럼넓이와 관련된 변수들의 값을 초기화한다.\n     * @private\n     */\n    _initColumnWidthVariables: function() {\n        var columnModelList = this.columnModel.getVisibleColumnModelList(null, true),\n            commonMinWidth = this.get('minimumColumnWidth'),\n            widthList = [],\n            fixedFlags = [],\n            minWidthList = [];\n\n        _.each(columnModelList, function(columnModel) {\n            var width = columnModel.width > 0 ? columnModel.width : 0,\n                minWidth = Math.max(width, commonMinWidth);\n\n            // Meta columns are not affected by common 'minimumColumnWidth' value\n            if (util.isMetaColumn(columnModel.columnName)) {\n                minWidth = width;\n            }\n\n            // If the width is not assigned (in other words, the width is not positive number),\n            // set it to zero (no need to worry about minimum width at this point)\n            // so that #_fillEmptyColumnWidth() can detect which one is empty.\n            // After then, minimum width will be applied by #_applyMinimumColumnWidth().\n            widthList.push(width ? minWidth : 0);\n            minWidthList.push(minWidth);\n            fixedFlags.push(!!columnModel.isFixedWidth);\n        }, this);\n\n        this._columnWidthFixedFlags = fixedFlags;\n        this._minColumnWidthList = minWidthList;\n\n        this._setColumnWidthVariables(this._calculateColumnWidth(widthList), true);\n    },\n\n    /**\n     * calculate column width list\n     * @param {Array.&lt;Number>} widthList - widthList\n     * @returns {Array.&lt;Number>}\n     * @private\n     */\n    _calculateColumnWidth: function(widthList) {\n        widthList = this._fillEmptyColumnWidth(widthList);\n        widthList = this._applyMinimumColumnWidth(widthList);\n        widthList = this._adjustColumnWidthList(widthList);\n\n        return widthList;\n    },\n\n    /**\n     * Returns whether division border (between meta column and data column) is doubled or not.\n     * Division border should be doubled only if visible fixed data column exists.\n     * @returns {Boolean}\n     */\n    isDivisionBorderDoubled: function() {\n        return this.columnModel.getVisibleColumnFixCount() > 0;\n    },\n\n    /**\n     * L, R 중 하나를 입력받아 frame 의 너비를 구한다.\n     * @param {String} [whichSide]  지정하지 않을 경우 전체 너비.\n     * @returns {Number} 해당 frame 의 너비\n     */\n    getFrameWidth: function(whichSide) {\n        var columnFixCount = this.columnModel.getVisibleColumnFixCount(true),\n            columnWidthList = this.getColumnWidthList(whichSide),\n            frameWidth = this._getFrameWidth(columnWidthList);\n\n        if (_.isUndefined(whichSide) &amp;&amp; columnFixCount > 0) {\n            frameWidth += CELL_BORDER_WIDTH;\n        }\n        return frameWidth;\n    },\n\n    /**\n     * widthList 로부터 보더 값을 포함하여 계산한 frameWidth 를 구한다.\n     * @param {Array} widthList 너비 리스트 배열\n     * @returns {Number} 계산된 frame 너비값\n     * @private\n     */\n    _getFrameWidth: function(widthList) {\n        var frameWidth = 0;\n        if (widthList.length) {\n            frameWidth = util.sum(widthList) + ((widthList.length + 1) * CELL_BORDER_WIDTH);\n        }\n        return frameWidth;\n    },\n\n    /**\n     * columnWidthList 로 부터, lside 와 rside 의 전체 너비를 계산하여 저장한다.\n     * @param {array} columnWidthList - 컬럼 넓이값 배열\n     * @param {boolean} [isSaveWidthList] - 저장 여부. true이면 넓이값 배열을 originalWidthList로 저장한다.\n     * @private\n     */\n    _setColumnWidthVariables: function(columnWidthList, isSaveWidthList) {\n        var totalWidth = this.get('width'),\n            columnFixCount = this.columnModel.getVisibleColumnFixCount(true),\n            maxLeftSideWidth = this._getMaxLeftSideWidth(),\n            rsideWidth, lsideWidth, lsideWidthList, rsideWidthList;\n\n        lsideWidthList = columnWidthList.slice(0, columnFixCount);\n        rsideWidthList = columnWidthList.slice(columnFixCount);\n\n        lsideWidth = this._getFrameWidth(lsideWidthList);\n        if (maxLeftSideWidth &amp;&amp; maxLeftSideWidth &lt; lsideWidth) {\n            lsideWidthList = this._adjustLeftSideWidthList(lsideWidthList, maxLeftSideWidth);\n            lsideWidth = this._getFrameWidth(lsideWidthList);\n            columnWidthList = lsideWidthList.concat(rsideWidthList);\n        }\n        rsideWidth = totalWidth - lsideWidth;\n\n        this.set({\n            columnWidthList: columnWidthList,\n            rsideWidth: rsideWidth,\n            lsideWidth: lsideWidth\n        });\n\n        if (isSaveWidthList) {\n            this.set('originalWidthList', _.clone(columnWidthList));\n        }\n        this.trigger('columnWidthChanged');\n    },\n\n    /**\n     * 열 고정 영역의 minimum width 값을 구한다.\n     * @returns {number} 열고정 영역의 최소 너비값.\n     * @private\n     */\n    _getMinLeftSideWidth: function() {\n        var minimumColumnWidth = this.get('minimumColumnWidth'),\n            columnFixCount = this.columnModel.getVisibleColumnFixCount(true),\n            minWidth = 0,\n            borderWidth;\n\n        if (columnFixCount) {\n            borderWidth = (columnFixCount + 1) * CELL_BORDER_WIDTH;\n            minWidth = borderWidth + (minimumColumnWidth * columnFixCount);\n        }\n        return minWidth;\n    },\n\n    /**\n     * 열 고정 영역의 maximum width 값을 구한다.\n     * @returns {number} 열고정 영역의 최대 너비값.\n     * @private\n     */\n    _getMaxLeftSideWidth: function() {\n        var maxWidth = Math.ceil(this.get('width') * 0.9); // eslint-disable-line no-magic-number\n\n        if (maxWidth) {\n            maxWidth = Math.max(maxWidth, this._getMinLeftSideWidth());\n        }\n        return maxWidth;\n    },\n\n    /**\n     * Returns the horizontal position of the given column\n     * @param {String} columnName - column name\n     * @returns {{left: Number, right: Number}}\n     * @private\n     */\n    _getCellHorizontalPosition: function(columnName) {\n        var columnModel = this.columnModel;\n        var metaColumnCount = columnModel.getVisibleMetaColumnCount();\n        var columnWidthList = this.get('columnWidthList');\n        var leftColumnCount = columnModel.getVisibleColumnFixCount() + metaColumnCount;\n        var targetIdx = columnModel.indexOfColumnName(columnName, true) + metaColumnCount;\n        var idx = leftColumnCount > targetIdx ? 0 : leftColumnCount;\n        var left = 0;\n\n        for (; idx &lt; targetIdx; idx += 1) {\n            left += columnWidthList[idx] + CELL_BORDER_WIDTH;\n        }\n\n        return {\n            left: left,\n            right: left + columnWidthList[targetIdx] + CELL_BORDER_WIDTH\n        };\n    },\n\n    /**\n     * Returns the vertical position of the given row\n     * @param {Number} rowKey - row key\n     * @param {Number} rowSpanCount - the count of rowspan\n     * @returns {{top: Number, bottom: Number}}\n     */\n    _getCellVerticalPosition: function(rowKey, rowSpanCount) {\n        var dataModel = this.dataModel;\n        var rowHeight = this.get('rowHeight');\n        var rowIdx = dataModel.indexOfRowKey(rowKey);\n        var top = util.getHeight(rowIdx, rowHeight);\n        var height = util.getHeight(rowSpanCount, rowHeight);\n\n        return {\n            top: top,\n            bottom: top + height\n        };\n    },\n\n    /**\n     * Returns the count of rowspan of given cell\n     * @param {Number} rowKey - row key\n     * @param {String} columnName - column name\n     * @returns {Number}\n     * @private\n     */\n    _getRowSpanCount: function(rowKey, columnName) {\n        var rowSpanData = this.dataModel.get(rowKey).getRowSpanData(columnName);\n\n        if (!rowSpanData.isMainRow) {\n            rowKey = rowSpanData.mainRowKey;\n            rowSpanData = this.dataModel.get(rowKey).getRowSpanData(columnName);\n        }\n\n        return rowSpanData.count || 1;\n    },\n\n    /**\n     * 계산한 cell 의 위치를 리턴한다.\n     * @param {Number|String} rowKey - 데이터의 키값\n     * @param {String} columnName - 칼럼명\n     * @returns {{top: number, left: number, right: number, bottom: number}} - cell의 위치\n     * @todo TC\n     */\n    getCellPosition: function(rowKey, columnName) {\n        var rowSpanCount, vPos, hPos;\n\n        rowKey = this.dataModel.getMainRowKey(rowKey, columnName);\n\n        if (!this.dataModel.get(rowKey)) {\n            return {};\n        }\n\n        rowSpanCount = this._getRowSpanCount(rowKey, columnName);\n        vPos = this._getCellVerticalPosition(rowKey, rowSpanCount);\n        hPos = this._getCellHorizontalPosition(columnName);\n\n        return {\n            top: vPos.top,\n            bottom: vPos.bottom,\n            left: hPos.left,\n            right: hPos.right\n        };\n    },\n\n    /**\n     * Return scroll position from the received index\n     * @param {Number|String} rowKey - Row-key of target cell\n     * @param {String} columnName - Column name of target cell\n     * @returns {{scrollLeft: ?Number, scrollTop: ?Number}} Position to scroll\n     */\n    getScrollPosition: function(rowKey, columnName) {\n        var isRsideColumn = !this.columnModel.isLside(columnName);\n        var targetPosition = this.getCellPosition(rowKey, columnName);\n        var bodySize = this._getBodySize();\n        var scrollDirection = this._judgeScrollDirection(targetPosition, isRsideColumn, bodySize);\n\n        return this._makeScrollPosition(scrollDirection, targetPosition, bodySize);\n    },\n\n    /**\n     * Calc body size of grid except scrollBar\n     * @returns {{height: number, totalWidth: number, rsideWidth: number}} Body size\n     * @private\n     */\n    _getBodySize: function() {\n        var lsideWidth = this.get('lsideWidth'),\n            rsideWidth = this.get('rsideWidth') - this.getScrollYWidth(),\n            height = this.get('bodyHeight') - this.getScrollXHeight();\n\n        return {\n            height: height,\n            rsideWidth: rsideWidth,\n            totalWidth: lsideWidth + rsideWidth\n        };\n    },\n\n    /**\n     * Judge scroll direction.\n     * @param {{top: number, bottom: number, left: number, right: number}} targetPosition - Position of target element\n     * @param {boolean} isRsideColumn - Whether the target cell is in rside\n     * @param {{height: number, rsideWidth: number}} bodySize - Using cached bodySize\n     * @returns {{isUp: boolean, isDown: boolean, isLeft: boolean, isRight: boolean}} Direction\n     * @private\n     */\n    _judgeScrollDirection: function(targetPosition, isRsideColumn, bodySize) {\n        var renderModel = this.renderModel,\n            currentTop = renderModel.get('scrollTop'),\n            currentLeft = renderModel.get('scrollLeft'),\n            isUp, isDown, isLeft, isRight;\n\n        isUp = targetPosition.top &lt; currentTop;\n        isDown = !isUp &amp;&amp; (targetPosition.bottom > (currentTop + bodySize.height));\n        if (isRsideColumn) {\n            isLeft = targetPosition.left &lt; currentLeft;\n            isRight = !isLeft &amp;&amp; (targetPosition.right > (currentLeft + bodySize.rsideWidth - 1));\n        } else {\n            isLeft = isRight = false;\n        }\n\n        return {\n            isUp: isUp,\n            isDown: isDown,\n            isLeft: isLeft,\n            isRight: isRight\n        };\n    },\n\n    /**\n     * Make scroll position\n     * @param {{isUp: boolean, isDown: boolean, isLeft: boolean, isRight: boolean}} scrollDirection - Direction\n     * @param {{top: number, bottom: number, left: number, right: number}} targetPosition - Position of target element\n     * @param {{height: number, rsideWidth: number}} bodySize - Using cached bodySize\n     * @returns {{scrollLeft: ?Number, scrollTop: ?Number}} Position to scroll\n     * @private\n     */\n    _makeScrollPosition: function(scrollDirection, targetPosition, bodySize) {\n        var pos = {};\n\n        if (scrollDirection.isUp) {\n            pos.scrollTop = targetPosition.top;\n        } else if (scrollDirection.isDown) {\n            pos.scrollTop = targetPosition.bottom - bodySize.height;\n        }\n\n        if (scrollDirection.isLeft) {\n            pos.scrollLeft = targetPosition.left;\n        } else if (scrollDirection.isRight) {\n            pos.scrollLeft = targetPosition.right - bodySize.rsideWidth + TABLE_BORDER_WIDTH;\n        }\n\n        return pos;\n    },\n\n    /**\n     * Calc and get overflow values from container position\n     * @param {Number} pageX - Mouse X-position based on page\n     * @param {Number} pageY - Mouse Y-position based on page\n     * @returns {{x: number, y: number}} Mouse-overflow\n     */\n    getOverflowFromMousePosition: function(pageX, pageY) {\n        var containerPos = this._rebasePositionToContainer(pageX, pageY),\n            bodySize = this._getBodySize();\n\n        return this._judgeOverflow(containerPos, bodySize);\n    },\n\n    /**\n     * Judge overflow\n     * @param {{x: number, y: number}} containerPosition - Position values based on container\n     * @param {{height: number, totalWidth: number, rsideWidth: number}} bodySize - Real body size\n     * @returns {{x: number, y: number}} Overflow values\n     * @private\n     */\n    _judgeOverflow: function(containerPosition, bodySize) {\n        var containerX = containerPosition.x,\n            containerY = containerPosition.y,\n            overflowY = 0,\n            overflowX = 0;\n\n        if (containerY &lt; 0) {\n            overflowY = -1;\n        } else if (containerY > bodySize.height) {\n            overflowY = 1;\n        }\n\n        if (containerX &lt; 0) {\n            overflowX = -1;\n        } else if (containerX > bodySize.totalWidth) {\n            overflowX = 1;\n        }\n\n        return {\n            x: overflowX,\n            y: overflowY\n        };\n    },\n\n    /**\n     * Get cell index from mouse position\n     * @param {Number} pageX - Mouse X-position based on page\n     * @param {Number} pageY - Mouse Y-position based on page\n     * @param {boolean} [withMeta] - Whether the meta columns go with this calculation\n     * @returns {{row: number, column: number}} Cell index\n     */\n    getIndexFromMousePosition: function(pageX, pageY, withMeta) {\n        var containerPos = this._rebasePositionToContainer(pageX, pageY);\n\n        return {\n            row: this._calcRowIndexFromPositionY(containerPos.y),\n            column: this._calcColumnIndexFromPositionX(containerPos.x, withMeta)\n        };\n    },\n\n    /**\n     * Calc and get column index from Y-position based on the container\n     * @param {number} containerY - X-position based on the container\n     * @returns {number} Row index\n     * @private\n     */\n    _calcRowIndexFromPositionY: function(containerY) {\n        var cellY = containerY + this.renderModel.get('scrollTop'),\n            tempIndex = Math.floor(cellY / (this.get('rowHeight') + CELL_BORDER_WIDTH)),\n            min = 0,\n            max = Math.max(min, this.dataModel.length - 1);\n\n        return util.clamp(tempIndex, min, max);\n    },\n\n    /**\n     * Calc and get column index from X-position based on the container\n     * @param {number} containerX - X-position based on the container\n     * @param {boolean} withMeta - Whether the meta columns go with this calculation\n     * @returns {number} Column index\n     * @private\n     */\n    _calcColumnIndexFromPositionX: function(containerX, withMeta) {\n        var columnWidthList = this.getColumnWidthList(),\n            totalColumnWidth = this.getFrameWidth(),\n            cellX = containerX,\n            isRsidePosition = containerX >= this.get('lsideWidth'),\n            adjustableIndex = (withMeta) ? 0 : this.columnModel.getVisibleMetaColumnCount(),\n            columnIndex = 0;\n\n        if (isRsidePosition) {\n            cellX += this.renderModel.get('scrollLeft');\n        }\n\n        if (cellX >= totalColumnWidth) {\n            columnIndex = columnWidthList.length - 1;\n        } else {\n            tui.util.forEachArray(columnWidthList, function(width, index) { // eslint-disable-line consistent-return\n                width += CELL_BORDER_WIDTH;\n                columnIndex = index;\n\n                if (cellX > width) {\n                    cellX -= width;\n                } else {\n                    return false;\n                }\n            });\n        }\n\n        return Math.max(0, columnIndex - adjustableIndex);\n    },\n\n    /**\n     * 마우스 위치 정보에 해당하는 grid container 기준 pageX 와 pageY 를 반환한다.\n     * @param {Number} pageX    마우스 x 좌표\n     * @param {Number} pageY    마우스 y 좌표\n     * @returns {{x: number, y: number}} 그리드 container 기준의 x, y 값\n     * @private\n     */\n    _rebasePositionToContainer: function(pageX, pageY) {\n        var containerPosX = pageX - this.get('offsetLeft'),\n            containerPosY = pageY - (this.get('offsetTop') + this.get('headerHeight') + 2);\n\n        return {\n            x: containerPosX,\n            y: containerPosY\n        };\n    },\n\n    /**\n     * columnFixCount 가 적용되었을 때, window resize 시 left side 의 너비를 조정한다.\n     * @param {Array} lsideWidthList    열고정 영역의 너비 리스트 배열\n     * @param {Number} totalWidth   grid 전체 너비\n     * @returns {Array} 열고정 영역의 너비 리스트\n     * @private\n     */\n    _adjustLeftSideWidthList: function(lsideWidthList, totalWidth) {\n        var i = lsideWidthList.length - 1,\n            minimumColumnWidth = this.get('minimumColumnWidth'),\n            currentWidth = this._getFrameWidth(lsideWidthList),\n            diff = currentWidth - totalWidth,\n            changedWidth;\n        if (diff > 0) {\n            while (i >= 0 &amp;&amp; diff > 0) {\n                changedWidth = Math.max(minimumColumnWidth, lsideWidthList[i] - diff);\n                diff -= lsideWidthList[i] - changedWidth;\n                lsideWidthList[i] = changedWidth;\n                i -= 1;\n            }\n        } else if (diff &lt; 0) {\n            lsideWidthList[i] += Math.abs(diff);\n        }\n        return lsideWidthList;\n    },\n\n    /**\n     * Resets the 'bodyHeight' attribute.\n     * @private\n     */\n    _resetBodyHeight: function() {\n        var rowListHeight;\n\n        // To prevent recursive call with _resetDisplayRowCount (called by change:bodyHeight event)\n        if (_.has(this.changed, 'bodyHeight')) {\n            return;\n        }\n        rowListHeight = util.getHeight(this.get('displayRowCount'), this.get('rowHeight'));\n        this.set('bodyHeight', rowListHeight + this.getScrollXHeight());\n    },\n\n    /**\n     * Return height of X-scrollBar.\n     * If no X-scrollBar, return 0\n     * @returns {number} Height of X-scrollBar\n     */\n    getScrollXHeight: function() {\n        return (this.get('scrollX') ? this.get('scrollBarSize') : 0);\n    },\n\n    /**\n     * Return width of Y-scrollBar.\n     * If no Y-scrollBar, return 0\n     * @returns {number} Width of Y-scrollBar\n     */\n    getScrollYWidth: function() {\n        return (this.get('scrollY') ? this.get('scrollBarSize') : 0);\n    },\n\n    /**\n     * width 값 변경시 각 column 별 너비를 계산한다.\n     * @private\n     */\n    _onWidthChange: function() {\n        var widthList = this._adjustColumnWidthList(this.get('columnWidthList'), true);\n        this._setColumnWidthVariables(widthList);\n    },\n\n    /**\n     * columnResize 발생 시 index 에 해당하는 컬럼의 width 를 변경하여 반영한다.\n     * @param {Number} index    너비를 변경할 컬럼의 인덱스\n     * @param {Number} width    변경할 너비 pixel값\n     */\n    setColumnWidth: function(index, width) {\n        var columnWidthList = this.get('columnWidthList'),\n            fixedFlags = this._columnWidthFixedFlags,\n            minWidth = this._minColumnWidthList[index],\n            adjustedList;\n\n        if (!fixedFlags[index] &amp;&amp; columnWidthList[index]) {\n            columnWidthList[index] = Math.max(width, minWidth);\n            // makes width of the target column fixed temporarily\n            // to not be influenced while adjusting column widths.\n            fixedFlags[index] = true;\n            adjustedList = this._adjustColumnWidthList(columnWidthList);\n            fixedFlags[index] = false;\n            this._setColumnWidthVariables(adjustedList);\n        }\n    },\n\n    /**\n     * Returns the height of table body.\n     * @param  {number} height - The height of the dimension\n     * @returns {number} The height of the table body\n     * @private\n     */\n    _calcRealBodyHeight: function(height) {\n        return height - this.get('headerHeight') - this.get('toolbarHeight') - TABLE_BORDER_WIDTH;\n    },\n\n    /**\n     * Returns the minimum height of table body.\n     * @returns {number} The minimum height of table body\n     * @private\n     */\n    _getMinBodyHeight: function() {\n        return this.get('rowHeight') + (CELL_BORDER_WIDTH * 2) + this.getScrollXHeight();\n    },\n\n    /**\n     * Sets the height of the dimension.\n     * (Resets the bodyHeight and displayRowCount relative to the dimension height)\n     * @param  {number} height - The height of the dimension\n     * @private\n     */\n    _setHeight: function(height) {\n        this.set('bodyHeight', Math.max(this._calcRealBodyHeight(height), this._getMinBodyHeight()));\n    },\n\n    /**\n     * Sets the width and height of the dimension.\n     * @param {(Number|Null)} width - Width\n     * @param {(Number|Null)} height - Height\n     */\n    setSize: function(width, height) {\n        if (width > 0) {\n            this.set('width', width);\n        }\n        if (height > 0) {\n            this._setHeight(height);\n        }\n        this.trigger('setSize');\n    },\n\n    /**\n     * Returns the height of the dimension.\n     * @returns {Number} Height\n     */\n    getHeight: function() {\n        return this.get('bodyHeight') + this.get('headerHeight') + this.get('toolbarHeight');\n    },\n\n    /**\n     * layout 에 필요한 크기 및 위치 데이터를 갱신한다.\n     */\n    refreshLayout: function() {\n        var domState = this.domState,\n            offset = domState.getOffset();\n\n        this.set({\n            offsetTop: offset.top,\n            offsetLeft: offset.left,\n            width: domState.getWidth()\n        });\n\n        if (this.get('fitToParentHeight')) {\n            this._setHeight(domState.getParentHeight());\n        }\n    },\n\n    /**\n     * 초기 너비로 돌린다.\n     * @param {Number} index    너비를 변경할 컬럼의 인덱스\n     */\n    restoreColumnWidth: function(index) {\n        var orgWidth = this.get('originalWidthList')[index];\n        this.setColumnWidth(index, orgWidth);\n    },\n\n    /**\n     * L side 와 R side 에 따른 columnWidthList 를 반환한다.\n     * @param {String} [whichSide] 어느 영역인지 여부. 'L|R' 중 하나를 인자로 넘긴다. 생략시 전체 columnList 반환\n     * @returns {Array}  조회한 영역의 columnWidthList\n     */\n    getColumnWidthList: function(whichSide) {\n        var columnFixCount = this.columnModel.getVisibleColumnFixCount(true),\n            columnWidthList = [];\n\n        switch (whichSide) {\n            case 'l':\n            case 'L':\n                columnWidthList = this.get('columnWidthList').slice(0, columnFixCount);\n                break;\n            case 'r':\n            case 'R':\n                columnWidthList = this.get('columnWidthList').slice(columnFixCount);\n                break;\n            default :\n                columnWidthList = this.get('columnWidthList');\n                break;\n        }\n        return columnWidthList;\n    }\n});\n\nmodule.exports = Dimension;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"