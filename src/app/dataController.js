// namespaces
var dwv = dwv || {};
/** @namespace */
dwv.ctrl = dwv.ctrl || {};

/*
 * Data (list of {image, meta}) controller.
 *
 * @class
 */
dwv.ctrl.DataController = function () {

  /**
   * List of {image, meta}.
   *
   * @private
   * @type {Array}
   */
  var data = [];

  /**
   * Current data index.
   *
   * @private
   * @type {number}
   */
  var currentIndex = null;

  /**
   * Listener handler.
   *
   * @type {object}
   * @private
   */
  var listenerHandler = new dwv.utils.ListenerHandler();

  /**
   * Get the length of the data storage.
   *
   * @returns {number} The length.
   */
  this.length = function () {
    return data.length;
  };

  /**
   * Reset the class: empty the data storage.
   */
  this.reset = function () {
    currentIndex = null;
    data = [];
  };

  /**
   * Get a data at a given index.
   *
   * @param {number} index The index of the data.
   * @returns {object} The data.
   */
  this.get = function (index) {
    return data[index];
  };

  /**
   * Get the current data index.
   *
   * @returns {number} The index.
   */
  this.getCurrentIndex = function () {
    return currentIndex;
  };

  /**
   * Set the image at a given index.
   *
   * @param {object} image The image to set.
   * @param {number} index The index of the data.
   */
  this.setImage = function (image, index) {
    data[index].image = image;
    fireEvent({
      type: 'imagechange',
      value: [index, image]
    });
  };

  /**
   * Add a new data.
   *
   * @param {object} image The image.
   * @param {object} meta The image meta.
   */
  this.addNew = function (image, meta) {
    currentIndex = data.length;
    // store the new image
    data.push({
      image: image,
      meta: getMetaObject(meta)
    });
  };

  /**
   * Update the current data.
   *
   * @param {object} image The image.
   * @param {object} meta The image meta.
   * @returns {number} The slice number at which the image was added.
   */
  this.updateCurrent = function (image, meta) {
    var currentData = data[currentIndex];
    // add slice to current image
    var sliceNb = currentData.image.appendSlice(image);
    // update meta data
    var idKey = '';
    if (typeof meta.x00020010 !== 'undefined') {
      // dicom case
      idKey = 'InstanceNumber';
    } else {
      idKey = 'imageUid';
    }
    currentData.meta = dwv.utils.mergeObjects(
      currentData.meta,
      getMetaObject(meta),
      idKey,
      'value');

    return sliceNb;
  };

  /**
   * Add an event listener to this class.
   *
   * @param {string} type The event type.
   * @param {object} callback The method associated with the provided
   *   event type, will be called with the fired event.
   */
  this.addEventListener = function (type, callback) {
    listenerHandler.add(type, callback);
  };

  /**
   * Remove an event listener from this class.
   *
   * @param {string} type The event type.
   * @param {object} callback The method associated with the provided
   *   event type.
   */
  this.removeEventListener = function (type, callback) {
    listenerHandler.remove(type, callback);
  };

  /**
   * Fire an event: call all associated listeners with the input event object.
   *
   * @param {object} event The event to fire.
   * @private
   */
  function fireEvent(event) {
    listenerHandler.fireEvent(event);
  }

  /**
   * Get a meta data object.
   *
   * @param {*} meta The meta data to convert.
   * @returns {*} object for DICOM, array for DOM image.
   */
  function getMetaObject(meta) {
    var metaObj = null;
    // wrap meta if dicom (x00020010: transfer syntax)
    if (typeof meta.x00020010 !== 'undefined') {
      var newDcmMetaData = new dwv.dicom.DicomElementsWrapper(meta);
      metaObj = newDcmMetaData.dumpToObject();
    } else {
      metaObj = meta;
    }
    return metaObj;
  }

}; // ImageController class
