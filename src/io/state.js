// namespaces
var dwv = dwv || {};
dwv.io = dwv.io || {};
// external
var Konva = Konva || {};

/**
 * State class.
 * Saves: data url/path, display info.
 *
 * History:
 * - v0.5 (dwv 0.30.0, ??/2021)
 *   - store position as array
 *   - new draw position group key
 * - v0.4 (dwv 0.29.0, 06/2021)
 *   - move drawing details into meta property
 *   - remove scale center and translation, add offset
 * - v0.3 (dwv v0.23.0, 03/2018)
 *   - new drawing structure, drawings are now the full layer object and
 *     using toObject to avoid saving a string representation
 *   - new details structure: simple array of objects referenced by draw ids
 * - v0.2 (dwv v0.17.0, 12/2016)
 *   - adds draw details: array [nslices][nframes] of detail objects
 * - v0.1 (dwv v0.15.0, 07/2016)
 *   - adds version
 *   - drawings: array [nslices][nframes] with all groups
 * - initial release (dwv v0.10.0, 05/2015), no version number...
 *   - content: window-center, window-width, position, scale,
 *       scaleCenter, translation, drawings
 *   - drawings: array [nslices] with all groups
 *
 * @class
 */
dwv.io.State = function () {
  /**
   * Save the application state as JSON.
   *
   * @param {object} app The associated application.
   * @returns {string} The state as a JSON string.
   */
  this.toJSON = function (app) {
    var layerController = app.getLayerController();
    var viewController =
      layerController.getActiveViewLayer().getViewController();
    var drawLayer = layerController.getActiveDrawLayer();
    // return a JSON string
    return JSON.stringify({
      version: '0.5',
      'window-center': viewController.getWindowLevel().center,
      'window-width': viewController.getWindowLevel().width,
      position: viewController.getCurrentPosition().getValues(),
      scale: app.getAddedScale(),
      offset: app.getOffset(),
      drawings: drawLayer.getKonvaLayer().toObject(),
      drawingsDetails: app.getDrawStoreDetails()
    });
  };
  /**
   * Load an application state from JSON.
   *
   * @param {string} json The JSON representation of the state.
   * @returns {object} The state object.
   */
  this.fromJSON = function (json) {
    var data = JSON.parse(json);
    var res = null;
    if (data.version === '0.1') {
      res = readV01(data);
    } else if (data.version === '0.2') {
      res = readV02(data);
    } else if (data.version === '0.3') {
      res = readV03(data);
    } else if (data.version === '0.4') {
      res = readV04(data);
    } else if (data.version === '0.5') {
      res = readV05(data);
    } else {
      throw new Error('Unknown state file format version: \'' +
        data.version + '\'.');
    }
    return res;
  };
  /**
   * Load an application state from JSON.
   *
   * @param {object} app The app to apply the state to.
   * @param {object} data The state data.
   */
  this.apply = function (app, data) {
    var layerController = app.getLayerController();
    var viewController =
      layerController.getActiveViewLayer().getViewController();
    // display
    viewController.setWindowLevel(
      data['window-center'], data['window-width']);
    viewController.setCurrentPosition(
      new dwv.math.Index(data.position), true);
    // apply saved scale on top of current base one
    var baseScale = app.getLayerController().getBaseScale();
    var scale = null;
    var offset = null;
    if (typeof data.scaleCenter !== 'undefined') {
      scale = {
        x: data.scale * baseScale.x,
        y: data.scale * baseScale.y,
      };
      // ---- transform translation (now) ----
      // Tx = -offset.x * scale.x
      // => offset.x = -Tx / scale.x
      // ---- transform translation (before) ----
      // origin.x = centerX - (centerX - origin.x) * (newZoomX / zoom.x);
      // (zoom.x -> initial zoom = base scale, origin.x = 0)
      // Tx = origin.x + (trans.x * zoom.x)
      var originX = data.scaleCenter.x - data.scaleCenter.x * data.scale;
      var originY = data.scaleCenter.y - data.scaleCenter.y * data.scale;
      var oldTx = originX + data.translation.x * scale.x;
      var oldTy = originY + data.translation.y * scale.y;
      offset = {
        x: -oldTx / scale.x,
        y: -oldTy / scale.y
      };
    } else {
      scale = {
        x: data.scale.x * baseScale.x,
        y: data.scale.y * baseScale.y
      };
      offset = data.offset;
    }
    app.getLayerController().setScale(scale);
    app.getLayerController().setOffset(offset);
    // render to draw the view layer
    app.render();
    // drawings (will draw the draw layer)
    app.setDrawings(data.drawings, data.drawingsDetails);
  };
  /**
   * Read an application state from an Object in v0.1 format.
   *
   * @param {object} data The Object representation of the state.
   * @returns {object} The state object.
   * @private
   */
  function readV01(data) {
    // v0.1 -> v0.2
    var v02DAndD = dwv.io.v01Tov02DrawingsAndDetails(data.drawings);
    // v0.2 -> v0.3, v0.4
    data.drawings = dwv.io.v02Tov03Drawings(v02DAndD.drawings).toObject();
    data.drawingsDetails = dwv.io.v03Tov04DrawingsDetails(
      v02DAndD.drawingsDetails);
    // v0.4 -> v0.5
    data = dwv.io.v04Tov05Data(data);
    data.drawings = dwv.io.v04Tov05Drawings(data.drawings);
    return data;
  }
  /**
   * Read an application state from an Object in v0.2 format.
   *
   * @param {object} data The Object representation of the state.
   * @returns {object} The state object.
   * @private
   */
  function readV02(data) {
    // v0.2 -> v0.3, v0.4
    data.drawings = dwv.io.v02Tov03Drawings(data.drawings).toObject();
    data.drawingsDetails = dwv.io.v03Tov04DrawingsDetails(
      dwv.io.v02Tov03DrawingsDetails(data.drawingsDetails));
    // v0.4 -> v0.5
    data = dwv.io.v04Tov05Data(data);
    data.drawings = dwv.io.v04Tov05Drawings(data.drawings);
    return data;
  }
  /**
   * Read an application state from an Object in v0.3 format.
   *
   * @param {object} data The Object representation of the state.
   * @returns {object} The state object.
   * @private
   */
  function readV03(data) {
    // v0.3 -> v0.4
    data.drawingsDetails = dwv.io.v03Tov04DrawingsDetails(data.drawingsDetails);
    // v0.4 -> v0.5
    data = dwv.io.v04Tov05Data(data);
    data.drawings = dwv.io.v04Tov05Drawings(data.drawings);
    return data;
  }
  /**
   * Read an application state from an Object in v0.4 format.
   *
   * @param {object} data The Object representation of the state.
   * @returns {object} The state object.
   * @private
   */
  function readV04(data) {
    // v0.4 -> v0.5
    data = dwv.io.v04Tov05Data(data);
    data.drawings = dwv.io.v04Tov05Drawings(data.drawings);
    return data;
  }
  /**
   * Read an application state from an Object in v0.5 format.
   *
   * @param {object} data The Object representation of the state.
   * @returns {object} The state object.
   * @private
   */
  function readV05(data) {
    return data;
  }

}; // State class

/**
 * Convert drawings from v0.2 to v0.3.
 * v0.2: one layer per slice/frame
 * v0.3: one layer, one group per slice. setDrawing expects the full stage
 *
 * @param {Array} drawings An array of drawings.
 * @returns {object} The layer with the converted drawings.
 */
dwv.io.v02Tov03Drawings = function (drawings) {
  // Auxiliar variables
  var group, groupShapes, parentGroup;
  // Avoid errors when dropping multiple states
  //drawLayer.getChildren().each(function(node){
  //    node.visible(false);
  //});

  var drawLayer = new Konva.Layer({
    listening: false,
    visible: true
  });

  // Get the positions-groups data
  var groupDrawings = typeof drawings === 'string'
    ? JSON.parse(drawings) : drawings;
  // Iterate over each position-groups
  for (var k = 0, lenk = groupDrawings.length; k < lenk; ++k) {
    // Iterate over each frame
    for (var f = 0, lenf = groupDrawings[k].length; f < lenf; ++f) {
      groupShapes = groupDrawings[k][f];
      if (groupShapes.length !== 0) {
        // Create position-group set as visible and append it to drawLayer
        parentGroup = new Konva.Group({
          id: dwv.draw.getDrawPositionGroupId(new dwv.math.Index([1, 1, k, f])),
          name: 'position-group',
          visible: false
        });

        // Iterate over shapes-group
        for (var g = 0, leng = groupShapes.length; g < leng; ++g) {
          // create the konva group
          group = Konva.Node.create(groupShapes[g]);
          // enforce draggable: only the shape was draggable in v0.2,
          // now the whole group is.
          group.draggable(true);
          group.getChildren().forEach(function (gnode) {
            gnode.draggable(false);
          });
          // add to position group
          parentGroup.add(group);
        }
        // add to layer
        drawLayer.add(parentGroup);
      }
    }
  }

  return drawLayer;
};

/**
 * Convert drawings from v0.1 to v0.2.
 * v0.1: text on its own
 * v0.2: text as part of label
 *
 * @param {Array} inputDrawings An array of drawings.
 * @returns {object} The converted drawings.
 */
dwv.io.v01Tov02DrawingsAndDetails = function (inputDrawings) {
  var newDrawings = [];
  var drawingsDetails = {};

  var drawGroups;
  var drawGroup;
  // loop over each slice
  for (var k = 0, lenk = inputDrawings.length; k < lenk; ++k) {
    // loop over each frame
    newDrawings[k] = [];
    for (var f = 0, lenf = inputDrawings[k].length; f < lenf; ++f) {
      // draw group
      drawGroups = inputDrawings[k][f];
      var newFrameDrawings = [];
      // Iterate over shapes-group
      for (var g = 0, leng = drawGroups.length; g < leng; ++g) {
        // create konva group from input
        drawGroup = Konva.Node.create(drawGroups[g]);
        // force visible (not set in state)
        drawGroup.visible(true);
        // label position
        var pos = {x: 0, y: 0};
        // update shape colour
        var kshape = drawGroup.getChildren(function (node) {
          return node.name() === 'shape';
        })[0];
        kshape.stroke(dwv.utils.colourNameToHex(kshape.stroke()));
        // special line case
        if (drawGroup.name() === 'line-group') {
          // update name
          drawGroup.name('ruler-group');
          // add ticks
          var ktick0 = new Konva.Line({
            points: [kshape.points()[0],
              kshape.points()[1],
              kshape.points()[0],
              kshape.points()[1]],
            name: 'shape-tick0'
          });
          drawGroup.add(ktick0);
          var ktick1 = new Konva.Line({
            points: [kshape.points()[2],
              kshape.points()[3],
              kshape.points()[2],
              kshape.points()[3]],
            name: 'shape-tick1'
          });
          drawGroup.add(ktick1);
        }
        // special protractor case: update arc name
        var karcs = drawGroup.getChildren(function (node) {
          return node.name() === 'arc';
        });
        if (karcs.length === 1) {
          karcs[0].name('shape-arc');
        }
        // get its text
        var ktexts = drawGroup.getChildren(function (node) {
          return node.name() === 'text';
        });
        // update text: move it into a label
        var ktext = new Konva.Text({
          name: 'text',
          text: ''
        });
        if (ktexts.length === 1) {
          pos.x = ktexts[0].x();
          pos.y = ktexts[0].y();
          // remove it from the group
          ktexts[0].remove();
          // use it
          ktext = ktexts[0];
        } else {
          // use shape position if no text
          if (kshape.points().length !== 0) {
            pos = {x: kshape.points()[0],
              y: kshape.points()[1]};
          }
        }
        // create new label with text and tag
        var klabel = new Konva.Label({
          x: pos.x,
          y: pos.y,
          name: 'label'
        });
        klabel.add(ktext);
        klabel.add(new Konva.Tag());
        // add label to group
        drawGroup.add(klabel);
        // add group to list
        newFrameDrawings.push(JSON.stringify(drawGroup.toObject()));

        // create details (v0.3 format)
        var textExpr = ktext.text();
        var txtLen = textExpr.length;
        var quant = null;
        // adapt to text with flag
        if (drawGroup.name() === 'ruler-group') {
          quant = {
            length: {
              value: parseFloat(textExpr.substr(0, txtLen - 2)),
              unit: textExpr.substr(-2, 2)
            }
          };
          textExpr = '{length}';
        } else if (drawGroup.name() === 'ellipse-group' ||
                    drawGroup.name() === 'rectangle-group') {
          quant = {
            surface: {
              value: parseFloat(textExpr.substr(0, txtLen - 3)),
              unit: textExpr.substr(-3, 3)
            }
          };
          textExpr = '{surface}';
        } else if (drawGroup.name() === 'protractor-group' ||
                    drawGroup.name() === 'rectangle-group') {
          quant = {
            angle: {
              value: parseFloat(textExpr.substr(0, txtLen - 1)),
              unit: textExpr.substr(-1, 1)
            }
          };
          textExpr = '{angle}';
        }
        // set details
        drawingsDetails[drawGroup.id()] = {
          textExpr: textExpr,
          longText: '',
          quant: quant
        };

      }
      newDrawings[k].push(newFrameDrawings);
    }
  }

  return {drawings: newDrawings, drawingsDetails: drawingsDetails};
};

/**
 * Convert drawing details from v0.2 to v0.3.
 * - v0.2: array [nslices][nframes] with all
 * - v0.3: simple array of objects referenced by draw ids
 *
 * @param {Array} details An array of drawing details.
 * @returns {object} The converted drawings.
 */
dwv.io.v02Tov03DrawingsDetails = function (details) {
  var res = {};
  // Get the positions-groups data
  var groupDetails = typeof details === 'string'
    ? JSON.parse(details) : details;
  // Iterate over each position-groups
  for (var k = 0, lenk = groupDetails.length; k < lenk; ++k) {
    // Iterate over each frame
    for (var f = 0, lenf = groupDetails[k].length; f < lenf; ++f) {
      // Iterate over shapes-group
      for (var g = 0, leng = groupDetails[k][f].length; g < leng; ++g) {
        var group = groupDetails[k][f][g];
        res[group.id] = {
          textExpr: group.textExpr,
          longText: group.longText,
          quant: group.quant
        };
      }
    }
  }
  return res;
};

/**
 * Convert drawing details from v0.3 to v0.4.
 * - v0.3: properties at group root
 * - v0.4: properties in group meta object
 *
 * @param {Array} details An array of drawing details.
 * @returns {object} The converted drawings.
 */
dwv.io.v03Tov04DrawingsDetails = function (details) {
  var res = {};
  var keys = Object.keys(details);
  // Iterate over each position-groups
  for (var k = 0, lenk = keys.length; k < lenk; ++k) {
    var detail = details[keys[k]];
    res[keys[k]] = {
      meta: {
        textExpr: detail.textExpr,
        longText: detail.longText,
        quantification: detail.quant
      }
    };
  }
  return res;
};

/**
 * Convert drawing from v0.4 to v0.5.
 * - v0.4: position as object
 * - v0.5: position as array
 *
 * @param {Array} data An array of drawing.
 * @returns {object} The converted drawings.
 */
dwv.io.v04Tov05Data = function (data) {
  var pos = data.position;
  data.position = [pos.i, pos.j, pos.k];
  return data;
};

/**
 * Convert drawing from v0.4 to v0.5.
 * - v0.4: draw id as 'slice-0_frame-1'
 * - v0.5: draw id as '#2-0_#3-1''
 *
 * @param {Array} inputDrawings An array of drawing.
 * @returns {object} The converted drawings.
 */
dwv.io.v04Tov05Drawings = function (inputDrawings) {
  // Iterate over each position-groups
  var posGroups = inputDrawings.children;
  for (var k = 0, lenk = posGroups.length; k < lenk; ++k) {
    var posGroup = posGroups[k];
    var id = posGroup.attrs.id;
    var ids = id.split('_');
    var sliceNumber = parseInt(ids[0].substring(6), 10); // 'slice-0'
    var frameNumber = parseInt(ids[1].substring(6), 10); // 'frame-0'
    var newId = '#2-';
    if (sliceNumber === 0 && frameNumber !== 0) {
      newId += frameNumber;
    } else {
      newId += sliceNumber;
    }
    posGroup.attrs.id = newId;
  }
  return inputDrawings;
};
